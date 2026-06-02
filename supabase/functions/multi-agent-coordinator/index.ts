/**
 * Multi-Agent Coordinator - Knight AI powered by OnSpace AI
 * 4 specialized agents: PhishGuard, PredatorWatch, FraudSentinel, LinkTracer
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface AgentPersonality {
  agent_name: string;
  agent_type: string;
  personality_traits: any;
  specialization: string;
}

interface DetectionSkill {
  skill_name: string;
  skill_type: string;
  config: any;
}

async function runAgentWithAI(
  agentName: string,
  specialization: string,
  scanType: string,
  value: string,
  patterns: string[]
): Promise<{ analysis: string; threat_score: number; flags: string[] }> {
  const aiApiKey = Deno.env.get('ONSPACE_AI_API_KEY');
  const aiBaseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

  if (!aiApiKey || !aiBaseUrl) {
    // Fallback to rule-based if AI not available
    const hasPatterns = patterns.some(p => value.toLowerCase().includes(p.toLowerCase()));
    return {
      analysis: `${agentName}: Pattern analysis for ${scanType}`,
      threat_score: hasPatterns ? 65 : 20,
      flags: hasPatterns ? [`Pattern match found`] : [],
    };
  }

  const agentPrompts: Record<string, string> = {
    PhishGuard: `You are PhishGuard, a phishing detection specialist AI agent.
Analyze the following ${scanType} for phishing indicators:
- Lookalike domains / typosquatting
- Urgency and fear tactics
- Impersonation of trusted brands
- Suspicious redirects or shortened URLs
- Credential harvesting patterns`,
    PredatorWatch: `You are PredatorWatch, a predator and grooming detection specialist AI agent.
Analyze the following ${scanType} for predator/grooming patterns:
- Age deception tactics
- Isolation attempts
- Normalization of inappropriate content
- Platform evasion (asking to move to private channels)
- Trust-building manipulation
- Suspicious interest in children/vulnerable people`,
    FraudSentinel: `You are FraudSentinel, a financial fraud and scam detection AI agent.
Analyze the following ${scanType} for fraud indicators:
- Romance/financial scam patterns
- Advance fee fraud tactics
- Identity theft vectors
- Social engineering manipulation
- Suspicious financial requests
- Known scammer communication patterns`,
    LinkTracer: `You are LinkTracer, a URL and link analysis specialist AI agent.
Analyze the following ${scanType} for malicious link indicators:
- Malware distribution patterns
- Drive-by download techniques
- Fake login pages
- Cryptomining scripts
- Command & control patterns
- Suspicious domain characteristics`,
  };

  const systemPrompt = agentPrompts[agentName] || `You are ${agentName}, a threat detection AI agent specializing in ${specialization}.`;

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
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analyze this ${scanType}: "${value}"

Respond in JSON format:
{
  "threat_score": <0-100 integer>,
  "verdict": "safe|low_risk|medium_risk|high_risk",
  "flags": ["<specific flag 1>", "<specific flag 2>"],
  "analysis": "<2-3 sentence explanation>",
  "confidence": <0.0-1.0>
}`
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        analysis: parsed.analysis || `${agentName} analysis complete.`,
        threat_score: Math.min(100, Math.max(0, parsed.threat_score || 25)),
        flags: parsed.flags || [],
      };
    }

    // If not JSON, extract what we can
    const scoreMatch = content.match(/threat_score["\s:]+(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 25;
    return {
      analysis: content.substring(0, 200),
      threat_score: score,
      flags: [],
    };
  } catch (error: any) {
    console.error(`${agentName} AI error:`, error);
    return {
      analysis: `${agentName}: Analysis incomplete due to processing error.`,
      threat_score: 30,
      flags: [],
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { scan_type, value, user_id, session_token } = await req.json();

    console.log(`🤖 Multi-Agent Coordinator: ${scan_type} scan`);

    // Get or create session
    let session: any = null;
    if (session_token) {
      const { data } = await supabase
        .from('scan_sessions')
        .select('*')
        .eq('session_token', session_token)
        .gt('expires_at', new Date().toISOString())
        .single();
      session = data;
    }

    if (!session && user_id) {
      const newToken = crypto.randomUUID();
      const { data } = await supabase
        .from('scan_sessions')
        .insert({
          user_id,
          session_token: newToken,
          context_data: { scan_history: [] },
        })
        .select()
        .single();
      session = data;
    }

    // Select appropriate agents
    const agentSelection = selectAgents(scan_type);
    console.log(`🎯 Selected agents: ${agentSelection.join(', ')}`);

    // Load agent personalities from DB
    const { data: agents } = await supabase
      .from('ai_agent_personalities')
      .select('*')
      .in('agent_name', agentSelection)
      .eq('active', true);

    // Load detection skills
    const { data: skills } = await supabase
      .from('detection_skills')
      .select('*')
      .eq('enabled', true);

    // Get patterns from skills
    const allPatterns: string[] = [];
    (skills || []).forEach((skill: DetectionSkill) => {
      if (skill.config?.patterns) {
        allPatterns.push(...skill.config.patterns);
      }
    });

    // Use agent personalities from DB or defaults
    const activeAgents = agents && agents.length > 0 ? agents : agentSelection.map(name => ({
      agent_name: name,
      specialization: name,
      personality_traits: { skepticism: 0.7, vigilance: 0.8, boldness: 0.5 },
    }));

    // Execute all agents in parallel using OnSpace AI
    const agentInsights = await Promise.all(
      activeAgents.map(async (agent: any) => {
        const result = await runAgentWithAI(
          agent.agent_name,
          agent.specialization,
          scan_type,
          value,
          allPatterns
        );
        return {
          agent: agent.agent_name,
          specialization: agent.specialization,
          threat_score: result.threat_score,
          verdict: result.threat_score > 70 ? 'high_risk' : result.threat_score > 40 ? 'medium_risk' : 'low_risk',
          findings: result.flags.map(f => ({ skill: 'ai_detection', pattern: f, confidence: 0.85 })),
          analysis: result.analysis,
        };
      })
    );

    // Reach consensus
    const consensus = reachConsensus(agentInsights, activeAgents);
    console.log(`✅ Consensus: ${consensus.decision} (score: ${consensus.threat_score})`);

    // Log collaboration
    if (session) {
      await supabase.from('agent_collaboration_log').insert({
        session_id: session.id,
        primary_agent: activeAgents[0]?.agent_name || 'FraudSentinel',
        collaborating_agents: activeAgents.map((a: any) => a.agent_name),
        insights_shared: agentInsights,
        consensus_reached: true,
        final_decision: consensus.decision,
      });

      await supabase
        .from('scan_sessions')
        .update({
          total_scans: (session.total_scans || 0) + 1,
          last_activity: new Date().toISOString(),
          active_agents: activeAgents.map((a: any) => a.agent_name),
        })
        .eq('id', session.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        consensus,
        agent_insights: agentInsights,
        session_token: session?.session_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Multi-agent coordinator error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function selectAgents(scanType: string): string[] {
  const agentMap: Record<string, string[]> = {
    url: ['PhishGuard', 'LinkTracer'],
    email: ['FraudSentinel', 'PhishGuard'],
    phone: ['FraudSentinel'],
    text: ['PredatorWatch', 'FraudSentinel'],
    'social-profile': ['PredatorWatch', 'FraudSentinel'],
    ip: ['LinkTracer', 'FraudSentinel'],
    'qr-code': ['LinkTracer', 'PhishGuard'],
    username: ['PredatorWatch', 'FraudSentinel'],
  };
  return agentMap[scanType] || ['FraudSentinel'];
}

function reachConsensus(insights: any[], agents: any[]): any {
  const avgScore = insights.reduce((sum, i) => sum + i.threat_score, 0) / Math.max(insights.length, 1);

  const verdictCounts: Record<string, number> = {};
  insights.forEach(i => {
    verdictCounts[i.verdict] = (verdictCounts[i.verdict] || 0) + 1;
  });

  const majorityVerdict = Object.entries(verdictCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'low_risk';

  const allFindings = insights.flatMap(i => i.findings);
  const analyses = insights.map(i => `${i.agent}: ${i.analysis}`).join('\n');

  return {
    decision: majorityVerdict,
    threat_score: Math.round(avgScore),
    confidence: allFindings.length > 0 ? 0.92 : 0.75,
    agent_votes: verdictCounts,
    total_agents: agents.length,
    key_findings: allFindings.slice(0, 5),
    ai_analyses: analyses,
    recommendation: generateRecommendation(majorityVerdict, Math.round(avgScore)),
  };
}

function generateRecommendation(verdict: string, score: number): string {
  if (verdict === 'high_risk') {
    return `⛔ BLOCK - Multiple Knight AI agents detected significant threats (score: ${score}/100). Do not proceed with this.`;
  } else if (verdict === 'medium_risk') {
    return `⚠️ CAUTION - Knight AI agents found concerning patterns (score: ${score}/100). Verify independently before proceeding.`;
  } else {
    return `✅ CLEAR - Knight AI agents found minimal risk (score: ${score}/100). Proceed with normal caution.`;
  }
}
