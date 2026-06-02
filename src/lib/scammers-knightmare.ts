/**
 * SCAMMER'S KNIGHTMARE — Sub-Hive Module v1.0
 * Multi-Agent Threat Detection System
 * Parent Hive: AssimilateOrDie-Foundry
 * Prime Directive: Detect, Analyze, and Destroy Scams. Protect users. Report everything.
 */

import { supabase } from './supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface AgentResult {
  agent: string;
  role: string;
  threat_score: number;
  verdict: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk';
  analysis: string;
  flags: string[];
  confidence: number;
}

export interface ConsensusResult {
  threatLevel: number;
  verdict: 'HIGH RISK' | 'SUSPICIOUS' | 'LOW RISK';
  threatLabel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  score: number;
  confidence: number;
  decision: string;
  recommendation: string;
  agentVotes: Record<string, number>;
  contributingAgents: AgentResult[];
  allAgents: AgentResult[];
  aiAnalyses: string;
  sessionToken?: string;
}

export interface FoundryReport {
  module: 'ScammersKnightmare';
  input: string;
  scanType: string;
  threatLevel: number;
  verdict: string;
  agents: AgentResult[];
  timestamp: string;
}

// ─── Agent Definitions ───────────────────────────────────────────────────────

export const AGENT_MANIFEST = {
  PhishGuard: {
    role: 'Phishing & Credential Theft Hunter',
    personality: { bold: 0.8, analytical: 0.9, fast: 0.95 },
    skills: ['URL Scan', 'Email Link Analysis', 'Fake Login Detection'],
    color: 'blue',
    icon: '🛡️',
  },
  PredatorWatch: {
    role: 'Grooming & Predator Detection',
    personality: { protective: 0.95, vigilant: 0.9, empathetic: 0.7 },
    skills: ['Text Analysis', 'Social Profile Scan', 'Inappropriate Content'],
    color: 'red',
    icon: '👁️',
  },
  FraudSentinel: {
    role: 'Financial Scam Analyst',
    personality: { skeptical: 0.85, thorough: 0.9, patternRecognition: 0.95 },
    skills: ['Investment Scams', 'Crypto Fraud', 'Phone/Email Scams'],
    color: 'yellow',
    icon: '⚖️',
  },
  LinkTracer: {
    role: 'Deep Link & Redirect Inspector',
    personality: { patient: 0.8, forensic: 0.9, deepAnalysis: 0.95 },
    skills: ['Redirect Chain', 'QR Code', 'Shortened URL Analysis'],
    color: 'green',
    icon: '🔗',
  },
} as const;

export type AgentName = keyof typeof AGENT_MANIFEST;

// ─── ScammersKnightmare Sub-Hive ──────────────────────────────────────────────

class ScammersKnightmareModule {
  readonly name = 'ScammersKnightmare';
  readonly version = '1.0';
  readonly type = 'SUB_HIVE';
  readonly parentHive = 'AssimilateOrDie-Foundry';
  readonly primeDirective =
    'Detect, Analyze, and Destroy Scams. Protect users. Report everything to Main Foundry Hive.';

  // Foundry report log (in-memory for the session)
  private foundryLog: FoundryReport[] = [];

  /**
   * Main scan entrypoint — runs all 4 agents in parallel (Promise.all)
   * then calculates consensus and reports to Foundry.
   */
  async scan(
    input: string,
    scanType: string,
    context: Record<string, any> = {}
  ): Promise<ConsensusResult> {
    console.log(`[ScammersKnightmare] Multi-Agent Scan Started: ${input.substring(0, 80)}...`);

    // Get current session for auth
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    let fnError: any = null;
    let data: any = null;

    const result = await supabase.functions.invoke('multi-agent-coordinator', {
      body: {
        scan_type: scanType,
        value: input,
        user_id: session.user.id,
        all_agents: true, // Force all 4 agents
      },
    });
    fnError = result.error;
    data = result.data;

    if (fnError) {
      let msg = fnError.message;
      if (fnError instanceof FunctionsHttpError) {
        try {
          msg = (await fnError.context?.text()) || msg;
        } catch { /* ignore */ }
      }
      throw new Error(msg);
    }

    const consensus = this.buildConsensus(data);

    // Report to Foundry
    const agentResults: AgentResult[] = (data?.agent_insights || []).map((a: any) => ({
      agent: a.agent,
      role: AGENT_MANIFEST[a.agent as AgentName]?.role || a.specialization,
      threat_score: a.threat_score,
      verdict: a.verdict,
      analysis: a.analysis,
      flags: (a.findings || []).map((f: any) => f.pattern),
      confidence: a.findings?.[0]?.confidence || 0.75,
    }));

    this.reportToFoundry({
      module: 'ScammersKnightmare',
      input,
      scanType,
      threatLevel: consensus.threatLevel,
      verdict: consensus.verdict,
      agents: agentResults,
      timestamp: new Date().toISOString(),
    });

    return { ...consensus, sessionToken: data?.session_token };
  }

  /**
   * Calculate weighted consensus — matches the JS module logic.
   */
  private buildConsensus(data: any): ConsensusResult {
    const agentInsights: any[] = data?.agent_insights || [];
    const dbConsensus = data?.consensus || {};

    // Weighted average (same as JS module's calculateConsensus)
    const totalScore = agentInsights.reduce((sum, r) => sum + (r.threat_score || 0), 0);
    const avg = agentInsights.length > 0 ? totalScore / agentInsights.length : dbConsensus.threat_score || 0;

    const verdict: ConsensusResult['verdict'] =
      avg > 70 ? 'HIGH RISK' : avg > 40 ? 'SUSPICIOUS' : 'LOW RISK';

    const threatLabel: ConsensusResult['threatLabel'] =
      avg >= 85 ? 'CRITICAL' :
      avg >= 70 ? 'HIGH' :
      avg >= 50 ? 'MEDIUM' :
      avg >= 25 ? 'LOW' : 'SAFE';

    const contributing = agentInsights.filter((r) => r.threat_score > 50);

    const allAgentResults: AgentResult[] = agentInsights.map((a) => ({
      agent: a.agent,
      role: AGENT_MANIFEST[a.agent as AgentName]?.role || a.specialization || '',
      threat_score: a.threat_score,
      verdict: a.verdict,
      analysis: a.analysis,
      flags: (a.findings || []).map((f: any) => f.pattern),
      confidence: 0.85,
    }));

    return {
      threatLevel: Math.round(avg),
      verdict,
      threatLabel,
      score: Math.round(avg),
      confidence: dbConsensus.confidence || 0.85,
      decision: dbConsensus.decision || verdict.toLowerCase().replace(' ', '_'),
      recommendation: dbConsensus.recommendation || '',
      agentVotes: dbConsensus.agent_votes || {},
      contributingAgents: contributing.map((a) => ({
        agent: a.agent,
        role: AGENT_MANIFEST[a.agent as AgentName]?.role || '',
        threat_score: a.threat_score,
        verdict: a.verdict,
        analysis: a.analysis,
        flags: (a.findings || []).map((f: any) => f.pattern),
        confidence: 0.85,
      })),
      allAgents: allAgentResults,
      aiAnalyses: agentInsights.map((a) => `${a.agent}: ${a.analysis}`).join('\n\n'),
    };
  }

  /**
   * Report to Foundry (logs locally + console, like JS module)
   */
  reportToFoundry(data: FoundryReport): void {
    console.log(`[SUB-HIVE → FOUNDRY] Report Sent:`, {
      module: data.module,
      input: data.input.substring(0, 60) + '...',
      threatLevel: data.threatLevel,
      verdict: data.verdict,
      agentCount: data.agents.length,
      timestamp: data.timestamp,
    });
    this.foundryLog.unshift(data);
    // Keep last 50 reports
    if (this.foundryLog.length > 50) this.foundryLog.pop();
  }

  /**
   * Get Foundry report log
   */
  getFoundryLog(): FoundryReport[] {
    return this.foundryLog;
  }

  /**
   * Get agent manifest
   */
  getAgents() {
    return AGENT_MANIFEST;
  }

  /**
   * Get threat color classes for a threat label
   */
  static getThreatStyle(label: string): {
    bg: string;
    border: string;
    text: string;
    badge: string;
  } {
    const styles: Record<string, any> = {
      CRITICAL: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-500', badge: 'bg-red-600 text-white' },
      HIGH:     { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-500', badge: 'bg-orange-500 text-white' },
      MEDIUM:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-600', badge: 'bg-yellow-500 text-black' },
      LOW:      { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-500', badge: 'bg-blue-500 text-white' },
      SAFE:     { bg: 'bg-green-500/10', border: 'border-green-500/40', text: 'text-green-500', badge: 'bg-green-500 text-white' },
    };
    return styles[label] || styles.SAFE;
  }
}

// Singleton export
export const ScammersKnightmare = new ScammersKnightmareModule();
