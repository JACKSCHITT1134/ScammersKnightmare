/**
 * Multi-Agent Coordinator - OpenClaw-inspired agent collaboration
 * Routes scans to specialized AI agents and coordinates their insights
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

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { scan_type, value, user_id, session_token } = await req.json();

    console.log(`🤖 Multi-Agent Coordinator: ${scan_type} scan for ${value}`);

    // Get or create session
    let session;
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
          context_data: { scan_history: [] }
        })
        .select()
        .single();
      session = data;
    }

    // Select appropriate agents based on scan type
    const agentSelection = selectAgents(scan_type);
    console.log(`🎯 Selected agents: ${agentSelection.join(', ')}`);

    // Load agent personalities
    const { data: agents } = await supabase
      .from('ai_agent_personalities')
      .select('*')
      .in('agent_name', agentSelection)
      .eq('active', true);

    if (!agents || agents.length === 0) {
      throw new Error('No active agents available');
    }

    // Load active skills
    const { data: skills } = await supabase
      .from('detection_skills')
      .select('*')
      .eq('enabled', true);

    // Execute scan with agents
    const agentInsights = await Promise.all(
      agents.map((agent: AgentPersonality) => 
        executeAgentScan(agent, scan_type, value, skills || [])
      )
    );

    // Reach consensus
    const consensus = reachConsensus(agentInsights, agents);
    console.log(`✅ Consensus reached:`, consensus);

    // Log collaboration
    if (session) {
      await supabase.from('agent_collaboration_log').insert({
        session_id: session.id,
        primary_agent: agents[0].agent_name,
        collaborating_agents: agents.map((a: AgentPersonality) => a.agent_name),
        insights_shared: agentInsights,
        consensus_reached: true,
        final_decision: consensus.decision
      });

      // Update session
      await supabase
        .from('scan_sessions')
        .update({
          total_scans: (session.total_scans || 0) + 1,
          last_activity: new Date().toISOString(),
          active_agents: agents.map((a: AgentPersonality) => a.agent_name)
        })
        .eq('id', session.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        consensus,
        agent_insights: agentInsights,
        session_token: session?.session_token
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
    'url': ['PhishGuard', 'LinkTracer'],
    'email': ['FraudSentinel', 'PhishGuard'],
    'phone': ['FraudSentinel'],
    'text': ['PredatorWatch', 'FraudSentinel'],
    'social-profile': ['PredatorWatch', 'FraudSentinel'],
    'ip': ['LinkTracer', 'FraudSentinel'],
    'qr-code': ['LinkTracer', 'PhishGuard']
  };

  return agentMap[scanType] || ['FraudSentinel'];
}

async function executeAgentScan(
  agent: AgentPersonality,
  scanType: string,
  value: string,
  skills: DetectionSkill[]
): Promise<any> {
  console.log(`🔍 ${agent.agent_name} analyzing ${scanType}...`);

  // Agent applies its specialized analysis
  const analysis: any = {
    agent: agent.agent_name,
    specialization: agent.specialization,
    findings: []
  };

  // Apply relevant skills
  const relevantSkills = skills.filter(s => 
    isSkillRelevant(s.skill_type, scanType)
  );

  for (const skill of relevantSkills) {
    const skillResult = await applySkill(skill, value, scanType);
    if (skillResult.detected) {
      analysis.findings.push({
        skill: skill.skill_name,
        ...skillResult
      });
    }
  }

  // Agent's personality influences the verdict
  const personalityModifier = calculatePersonalityInfluence(
    agent.personality_traits,
    analysis.findings.length
  );

  analysis.threat_score = Math.min(100, 
    (analysis.findings.length * 20) + personalityModifier
  );

  analysis.verdict = analysis.threat_score > 70 ? 'high_risk' :
                     analysis.threat_score > 40 ? 'medium_risk' : 'low_risk';

  return analysis;
}

function isSkillRelevant(skillType: string, scanType: string): boolean {
  const relevance: Record<string, string[]> = {
    'pattern_matcher': ['email', 'text', 'url', 'phone'],
    'api_integration': ['url', 'ip', 'email'],
    'behavioral_analysis': ['email', 'phone', 'social-profile'],
    'ml_model': ['text', 'social-profile', 'url']
  };

  return relevance[skillType]?.includes(scanType) ?? false;
}

async function applySkill(
  skill: DetectionSkill,
  value: string,
  scanType: string
): Promise<any> {
  // Simulate skill execution (in production, these would be real implementations)
  
  if (skill.skill_type === 'pattern_matcher') {
    const patterns = skill.config.patterns || [];
    const detected = patterns.some((p: string) => 
      value.toLowerCase().includes(p.toLowerCase())
    );
    return {
      detected,
      pattern: detected ? patterns.find((p: string) => 
        value.toLowerCase().includes(p.toLowerCase())
      ) : null,
      confidence: detected ? 0.8 : 0
    };
  }

  if (skill.skill_type === 'api_integration' && skill.skill_name === 'domain_reputation') {
    // Would call external API in production
    return {
      detected: Math.random() > 0.7,
      domain_age_days: Math.floor(Math.random() * 1000),
      ssl_valid: Math.random() > 0.3,
      confidence: 0.9
    };
  }

  return { detected: false, confidence: 0 };
}

function calculatePersonalityInfluence(traits: any, findingsCount: number): number {
  const boldness = traits.boldness || 0.5;
  const skepticism = traits.skepticism || 0.5;
  const vigilance = traits.vigilance || 0.5;

  // More skeptical/vigilant agents add more weight to findings
  const modifier = (skepticism * 10) + (vigilance * 10) - (boldness * 5);
  
  return Math.round(modifier * (findingsCount > 0 ? 1 : 0.5));
}

function reachConsensus(insights: any[], agents: AgentPersonality[]): any {
  // Calculate average threat score
  const avgScore = insights.reduce((sum, i) => sum + i.threat_score, 0) / insights.length;

  // Count verdicts
  const verdictCounts: Record<string, number> = {};
  insights.forEach(i => {
    verdictCounts[i.verdict] = (verdictCounts[i.verdict] || 0) + 1;
  });

  // Majority vote
  const majorityVerdict = Object.entries(verdictCounts)
    .sort(([, a], [, b]) => b - a)[0][0];

  // Consolidate all findings
  const allFindings = insights.flatMap(i => i.findings);

  return {
    decision: majorityVerdict,
    threat_score: Math.round(avgScore),
    confidence: allFindings.length > 0 ? 0.85 : 0.6,
    agent_votes: verdictCounts,
    total_agents: agents.length,
    key_findings: allFindings.slice(0, 5), // Top 5 findings
    recommendation: generateRecommendation(majorityVerdict, avgScore)
  };
}

function generateRecommendation(verdict: string, score: number): string {
  if (verdict === 'high_risk') {
    return `⛔ BLOCK - Multiple agents detected significant threats (score: ${score}). Do not proceed.`;
  } else if (verdict === 'medium_risk') {
    return `⚠️ CAUTION - Agents found concerning patterns (score: ${score}). Verify independently before proceeding.`;
  } else {
    return `✅ CLEAR - Agents found minimal risk (score: ${score}). Proceed with normal caution.`;
  }
}
