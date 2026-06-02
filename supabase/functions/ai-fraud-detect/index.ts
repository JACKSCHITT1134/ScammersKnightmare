/**
 * AI Fraud Detection Edge Function - Powered by OnSpace AI (Knight AI)
 * Primary threat detection using JACKSCHITT AI Engine + OnSpace AI
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

async function validateWithIPQS(type: string, value: string): Promise<any | null> {
  const apiKey = Deno.env.get('IPQS_API_KEY');
  if (!apiKey) return null;

  try {
    const endpointMap: Record<string, string> = {
      email: 'emailvalidation',
      ip: 'ip',
      phone: 'phone',
      url: 'url',
    };
    const endpoint = endpointMap[type];
    if (!endpoint) return null;

    const url = `https://ipqualityscore.com/api/json/${endpoint}/${apiKey}/${encodeURIComponent(value)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;

    const data = await response.json();
    return {
      success: data.success || false,
      fraud_score: data.fraud_score || 0,
      threat_level: data.fraud_score >= 75 ? 'high' : data.fraud_score >= 50 ? 'medium' : 'low',
      raw: data,
    };
  } catch (error) {
    console.error('IPQS error:', error);
    return null;
  }
}

async function enhanceWithAI(
  type: string,
  value: string,
  fraudProbability: number,
  anomalyScore: number,
  ipqsData: any
): Promise<string> {
  const aiApiKey = Deno.env.get('ONSPACE_AI_API_KEY');
  const aiBaseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

  if (!aiApiKey || !aiBaseUrl) {
    return `Knight AI detected ${type} with ${(fraudProbability * 100).toFixed(0)}% fraud probability.`;
  }

  const ipqsContext = ipqsData 
    ? `IPQS validation score: ${ipqsData.fraud_score}/100.` 
    : 'IPQS backup not used.';

  const prompt = `Analyze this ${type} scan result for Scammer's Knightmare threat detection:

Target: ${value}
Type: ${type}
AI Fraud Probability: ${(fraudProbability * 100).toFixed(1)}%
Anomaly Score: ${(anomalyScore * 100).toFixed(1)}%
${ipqsContext}

Provide a 2-3 sentence threat analysis explaining:
1. What specific risks this ${type} poses
2. Why the fraud probability is at this level
3. One specific action the user should take

Be direct and specific. No generic advice.`;

  try {
    const response = await fetch(`${aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You are Knight AI, an expert fraud detection system. Provide concise, actionable threat analysis.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) return `Threat analysis for ${type}: fraud probability ${(fraudProbability * 100).toFixed(0)}%.`;
    
    const result = await response.json();
    return result.choices?.[0]?.message?.content || `Knight AI: ${type} analyzed with ${(fraudProbability * 100).toFixed(0)}% fraud risk.`;
  } catch {
    return `Knight AI: ${type} analyzed with ${(fraudProbability * 100).toFixed(0)}% fraud risk.`;
  }
}

Deno.serve(async (req) => {
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
      false_positives: 0,
    };

    console.log('🛡️ Knight AI Personality:', JSON.stringify(personality));

    // Step 2: Load user baseline
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

    // Step 3: Calculate fraud probability
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
        fraudProbability = 0.35;
    }

    console.log(`📊 Fraud Probability: ${(fraudProbability * 100).toFixed(1)}%`);

    // Step 4: Calculate anomaly score
    const anomalyResult = AnomalyDetector.calculateAnomaly(
      { type, value, user_id, metadata },
      baseline,
      metadata || {}
    );

    // Step 5: AI makes personality-driven decision
    const decision: FraudDecision = PersonalityEngine.decide(
      fraudProbability,
      anomalyResult.score,
      personality,
      { type, value, user_id, metadata }
    );

    console.log(`🎯 AI Decision: ${decision.action.toUpperCase()}`);

    // Step 6: IPQS validation for medium/high risk
    let ipqsResult: any = null;
    if (decision.recommend_ipqs_validation || decision.risk_score > 0.5) {
      console.log('🔄 Running IPQS backup validation...');
      ipqsResult = await validateWithIPQS(type, value);
      
      if (ipqsResult && ipqsResult.fraud_score > 75) {
        decision.action = 'block';
        decision.risk_score = Math.max(decision.risk_score, ipqsResult.fraud_score / 100);
        console.log('⚠️ IPQS confirms high risk - upgraded to BLOCK');
      }
    }

    // Step 7: Enhance with OnSpace AI explanation
    const aiExplanation = await enhanceWithAI(
      type, value, fraudProbability, anomalyResult.score, ipqsResult
    );

    // Step 8: Log decision
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
          reasoning: {
            ...decision.reasoning,
            ai_explanation: aiExplanation,
          },
          personality_snapshot: personality,
          ipqs_used: ipqsResult !== null,
        });

      // Update user baseline
      const currentHour = new Date().getHours();
      if (baseline) {
        const typicalHours: number[] = baseline.typical_hours || [];
        if (!typicalHours.includes(currentHour)) typicalHours.push(currentHour);
        await supabaseAdmin
          .from('user_baselines')
          .update({
            total_transactions: (baseline.total_transactions || 0) + 1,
            typical_hours: typicalHours,
            last_transaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user_id);
      } else {
        await supabaseAdmin
          .from('user_baselines')
          .insert({
            user_id,
            total_transactions: 1,
            typical_hours: [currentHour],
            last_transaction_at: new Date().toISOString(),
          });
      }

      // Evolve personality based on scan count
      await supabaseAdmin
        .from('ai_personality_state')
        .update({
          total_decisions: (personality.total_decisions || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', personalityData?.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        decision: {
          action: decision.action,
          threat_level: decision.risk_score > 0.7 ? 'high' : decision.risk_score > 0.4 ? 'medium' : 'low',
          risk_score: Math.round(decision.risk_score * 100),
          confidence: Math.round(decision.confidence * 100),
          explanation: aiExplanation,
          details: {
            fraud_probability: decision.fraud_probability,
            anomaly_score: decision.anomaly_score,
            factors: decision.reasoning.primary_factors,
            behavioral_deviation: decision.reasoning.behavioral_deviation,
            personality_influence: decision.reasoning.personality_influence,
          },
          ipqs_validation: ipqsResult
            ? {
                used: true,
                fraud_score: ipqsResult.fraud_score,
                threat_level: ipqsResult.threat_level,
              }
            : null,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Knight AI Fraud Detection Error:', error);
    return new Response(
      JSON.stringify({ error: 'AI detection failed', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
