/**
 * AI Fraud Detection Edge Function
 * Primary threat detection using JACKSCHITT AI Engine
 * IPQS used as backup/validation only
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { corsHeaders } from '../_shared/cors.ts';
import { 
  FraudScorer, 
  AnomalyDetector, 
  PersonalityEngine,
  type ScanInput,
  type PersonalityState,
  type UserBaseline,
  type FraudDecision
} from '../_shared/ai-fraud-engine.ts';

// IPQS fallback (when AI recommends validation)
interface IPQSResponse {
  success: boolean;
  fraud_score: number;
  threat_level: string;
}

async function validateWithIPQS(
  type: string, 
  value: string
): Promise<IPQSResponse | null> {
  const apiKey = Deno.env.get('IPQS_API_KEY');
  if (!apiKey) {
    console.log('⚠️ IPQS API key not configured, skipping validation');
    return null;
  }

  try {
    const endpoint = type === 'email' ? 'emailvalidation' : 
                    type === 'ip' ? 'ip' :
                    type === 'phone' ? 'phone' :
                    type === 'url' ? 'url' : null;

    if (!endpoint) return null;

    const url = `https://ipqualityscore.com/api/json/${endpoint}/${apiKey}/${encodeURIComponent(value)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    
    if (!response.ok) {
      console.error(`IPQS API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      success: data.success || false,
      fraud_score: data.fraud_score || 0,
      threat_level: data.fraud_score >= 75 ? 'high' : data.fraud_score >= 50 ? 'medium' : 'low'
    };
  } catch (error) {
    console.error('IPQS validation error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, value, user_id, metadata } = await req.json();

    if (!type || !value) {
      return new Response(
        JSON.stringify({ error: 'Missing type or value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 1: Load AI personality state
    const { data: personalityData } = await supabaseAdmin
      .from('ai_personality_state')
      .select('*')
      .limit(1)
      .single();

    const personality: PersonalityState = personalityData || {
      boldness: 0.50,
      protectiveness: 0.75,
      helpfulness: 0.85,
      skepticism: 0.60,
      humility: 0.70,
      total_decisions: 0,
      correct_catches: 0,
      false_positives: 0
    };

    console.log('🛡️ Knight AI Personality:', personality);

    // Step 2: Load user baseline (if user_id provided)
    let baseline: UserBaseline | null = null;
    if (user_id) {
      const { data: baselineData } = await supabaseAdmin
        .from('user_baselines')
        .select('*')
        .eq('user_id', user_id)
        .limit(1)
        .single();

      baseline = baselineData;
    }

    // Step 3: Calculate fraud probability (rule-based scoring)
    let fraudProbability = 0.0;
    switch (type) {
      case 'email':
        fraudProbability = FraudScorer.scoreEmail(value, baseline || undefined);
        break;
      case 'ip':
        fraudProbability = FraudScorer.scoreIP(value, baseline || undefined);
        break;
      case 'url':
        fraudProbability = FraudScorer.scoreURL(value);
        break;
      case 'phone':
        fraudProbability = FraudScorer.scorePhone(value);
        break;
      default:
        fraudProbability = 0.5; // Unknown type
    }

    console.log(`📊 Fraud Probability: ${(fraudProbability * 100).toFixed(1)}%`);

    // Step 4: Calculate anomaly score (behavioral deviation)
    const anomalyResult = AnomalyDetector.calculateAnomaly(
      { type, value, user_id, metadata },
      baseline,
      metadata || {}
    );

    console.log(`🔍 Anomaly Score: ${(anomalyResult.score * 100).toFixed(1)}%`, anomalyResult.deviations);

    // Step 5: AI makes decision using personality engine
    const decision: FraudDecision = PersonalityEngine.decide(
      fraudProbability,
      anomalyResult.score,
      personality,
      { type, value, user_id, metadata }
    );

    console.log(`🎯 AI Decision: ${decision.action.toUpperCase()} (confidence: ${(decision.confidence * 100).toFixed(1)}%)`);

    // Step 6: IPQS validation (if recommended or high risk)
    let ipqsResult: IPQSResponse | null = null;
    if (decision.recommend_ipqs_validation) {
      console.log('🔄 AI recommends IPQS validation...');
      ipqsResult = await validateWithIPQS(type, value);
      
      if (ipqsResult && ipqsResult.fraud_score > 75) {
        // IPQS confirms high risk - upgrade decision to block
        console.log('⚠️ IPQS confirms high risk, upgrading to BLOCK');
        decision.action = 'block';
        decision.risk_score = Math.max(decision.risk_score, ipqsResult.fraud_score / 100);
      }
    }

    // Step 7: Log decision to audit trail
    if (user_id) {
      await supabaseAdmin
        .from('ai_decision_log')
        .insert({
          user_id,
          scan_type: type,
          input_value: value,
          action: decision.action,
          risk_score: decision.risk_score,
          fraud_probability: decision.fraud_probability,
          anomaly_score: decision.anomaly_score,
          reasoning: decision.reasoning,
          personality_snapshot: personality,
          ipqs_used: ipqsResult !== null
        });

      // Update user baseline (learn from this transaction)
      const currentHour = new Date().getHours();
      if (baseline) {
        const typicalHours = baseline.typical_hours || [];
        if (!typicalHours.includes(currentHour)) {
          typicalHours.push(currentHour);
        }

        await supabaseAdmin
          .from('user_baselines')
          .update({
            total_transactions: (baseline.total_transactions || 0) + 1,
            typical_hours: typicalHours,
            last_transaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user_id);
      } else {
        // Create new baseline
        await supabaseAdmin
          .from('user_baselines')
          .insert({
            user_id,
            total_transactions: 1,
            typical_hours: [currentHour],
            last_transaction_at: new Date().toISOString()
          });
      }
    }

    // Step 8: Return decision
    return new Response(
      JSON.stringify({
        success: true,
        decision: {
          action: decision.action,
          threat_level: decision.risk_score > 0.7 ? 'high' : decision.risk_score > 0.4 ? 'medium' : 'low',
          risk_score: Math.round(decision.risk_score * 100),
          confidence: Math.round(decision.confidence * 100),
          explanation: decision.reasoning.final_explanation,
          details: {
            fraud_probability: decision.fraud_probability,
            anomaly_score: decision.anomaly_score,
            factors: decision.reasoning.primary_factors,
            behavioral_deviation: decision.reasoning.behavioral_deviation,
            personality_influence: decision.reasoning.personality_influence
          },
          ipqs_validation: ipqsResult ? {
            used: true,
            fraud_score: ipqsResult.fraud_score,
            threat_level: ipqsResult.threat_level
          } : null
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ AI Fraud Detection Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'AI detection failed',
        message: error.message || 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
