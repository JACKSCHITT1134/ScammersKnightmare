import { ScanType, ScanResult, ThreatLevel } from '@/types';
import { supabase } from './supabase';
import { auth } from './auth';

/**
 * Knight AI Scanner - Primary threat detection using AI Fraud Engine
 * IPQS used as backup/validation only
 */
class Scanner {
  async scan(type: ScanType, input: string): Promise<ScanResult> {
    const user = await auth.getCurrentUser();
    
    // Get user session for authenticated calls
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Authentication required for scanning');
    }

    console.log(`🛡️ Knight AI Scan: ${type} - ${input}`);

    try {
      // Try multi-agent coordination first (premium feature)
      const { data: multiAgentData, error: multiAgentError } = await supabase.functions.invoke('multi-agent-coordinator', {
        body: {
          scan_type: type,
          value: input,
          user_id: user?.id,
          session_token: sessionStorage.getItem('scan_session_token')
        }
      });

      // If multi-agent succeeds, use it (richer analysis)
      if (!multiAgentError && multiAgentData?.success) {
        console.log('✅ Multi-Agent Analysis:', multiAgentData.consensus);
        
        // Store session token for next scan
        if (multiAgentData.session_token) {
          sessionStorage.setItem('scan_session_token', multiAgentData.session_token);
        }

        // Map multi-agent result to ScanResult format
        const consensus = multiAgentData.consensus;
        const threatLevel: ThreatLevel = this.mapThreatLevel(
          consensus.decision === 'high_risk' ? 'high' :
          consensus.decision === 'medium_risk' ? 'medium' : 'low'
        );

        const result: ScanResult = {
          id: crypto.randomUUID(),
          scanType: type,
          input,
          threatLevel,
          score: consensus.threat_score,
          timestamp: new Date(),
          details: {
            summary: `${multiAgentData.agent_insights.length} AI agents analyzed this ${type}. ${consensus.recommendation}`,
            indicators: consensus.key_findings.map((f: any) => ({
              type: f.skill || 'detection',
              severity: threatLevel,
              description: f.pattern || f.domain_age_days ? `Domain age: ${f.domain_age_days} days` : 'Risk detected'
            })),
            recommendation: consensus.recommendation,
            aiDecision: {
              action: consensus.decision === 'high_risk' ? 'block' :
                       consensus.decision === 'medium_risk' ? 'step-up' : 'allow',
              confidence: Math.round(consensus.confidence * 100),
              fraudProbability: consensus.threat_score / 100,
              anomalyScore: 0,
              factors: consensus.key_findings.map((f: any) => f.skill),
              behavioralDeviation: [],
              personalityInfluence: multiAgentData.agent_insights.map((i: any) => 
                `${i.agent}: ${i.verdict}`
              )
            }
          }
        };

        if (user) {
          await this.saveScanHistory(user.id, result);
          if (user.tier === 'free' && user.scansRemaining !== undefined) {
            await supabase.rpc('decrement_scans', { user_id: user.id });
          }
        }

        return result;
      }

      // Fallback to single AI Fraud Detection
      console.log('⚠️ Multi-agent unavailable, using single AI detection');
      const { data, error } = await supabase.functions.invoke('ai-fraud-detect', {
        body: {
          type: type === 'social-profile' ? 'url' : 
                type === 'username' ? 'email' : 
                type === 'qr-code' ? 'url' :
                type === 'text' ? 'email' : type,
          value: input,
          user_id: user?.id,
          metadata: {
            scan_type_original: type,
            timestamp: new Date().toISOString(),
            device_fingerprint: this.getDeviceFingerprint()
          }
        }
      });

      if (error) {
        console.error('AI detection error:', error);
        throw new Error(`Knight AI detection failed: ${error.message}`);
      }

      if (!data?.decision) {
        throw new Error('Invalid response from Knight AI');
      }

      const decision = data.decision;
      console.log('✅ Knight AI Decision:', decision);

      // Map AI decision to ScanResult format
      const threatLevel: ThreatLevel = this.mapThreatLevel(decision.threat_level);
      const score = decision.risk_score;

      const result: ScanResult = {
        id: crypto.randomUUID(),
        scanType: type,
        input,
        threatLevel,
        score,
        timestamp: new Date(),
        details: {
          summary: decision.explanation || `Knight AI analyzed this ${type} and determined it is ${threatLevel} risk.`,
          indicators: this.mapIndicators(decision.details),
          recommendation: this.getRecommendation(decision.action, threatLevel),
          aiDecision: {
            action: decision.action,
            confidence: decision.confidence,
            fraudProbability: decision.details.fraud_probability,
            anomalyScore: decision.details.anomaly_score,
            factors: decision.details.factors,
            behavioralDeviation: decision.details.behavioral_deviation,
            personalityInfluence: decision.details.personality_influence,
            ipqsValidation: decision.ipqs_validation
          }
        }
      };

      // Save to scan history if user is authenticated
      if (user) {
        await this.saveScanHistory(user.id, result);
        
        // Decrement scans for free users
        if (user.tier === 'free' && user.scansRemaining !== undefined) {
          await supabase.rpc('decrement_scans', { user_id: user.id });
        }
      }

      return result;

    } catch (error: any) {
      console.error('Scan error:', error);
      throw new Error(error.message || 'Scan failed. Please try again.');
    }
  }

  private mapThreatLevel(level: string): ThreatLevel {
    const mapping: Record<string, ThreatLevel> = {
      'safe': 'safe',
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical'
    };
    return mapping[level.toLowerCase()] || 'medium';
  }

  private mapIndicators(details: any): any[] {
    const indicators = [];

    // Fraud probability indicator
    if (details.fraud_probability > 0.7) {
      indicators.push({
        type: 'fraud_pattern',
        severity: 'high' as ThreatLevel,
        description: `High fraud probability detected (${(details.fraud_probability * 100).toFixed(0)}%)`
      });
    } else if (details.fraud_probability > 0.4) {
      indicators.push({
        type: 'fraud_pattern',
        severity: 'medium' as ThreatLevel,
        description: `Moderate fraud indicators (${(details.fraud_probability * 100).toFixed(0)}%)`
      });
    }

    // Anomaly indicator
    if (details.anomaly_score > 0.5) {
      indicators.push({
        type: 'behavioral_anomaly',
        severity: 'high' as ThreatLevel,
        description: `Unusual behavioral patterns detected (${(details.anomaly_score * 100).toFixed(0)}%)`
      });
    } else if (details.anomaly_score > 0.3) {
      indicators.push({
        type: 'behavioral_anomaly',
        severity: 'medium' as ThreatLevel,
        description: `Some behavioral deviations noted (${(details.anomaly_score * 100).toFixed(0)}%)`
      });
    }

    // Primary factors
    if (details.factors?.length > 0) {
      details.factors.forEach((factor: string) => {
        indicators.push({
          type: 'risk_factor',
          severity: 'medium' as ThreatLevel,
          description: factor.replace(/_/g, ' ')
        });
      });
    }

    // Behavioral deviations
    if (details.behavioral_deviation?.length > 0) {
      details.behavioral_deviation.forEach((deviation: string) => {
        indicators.push({
          type: 'anomaly',
          severity: 'low' as ThreatLevel,
          description: deviation.replace(/_/g, ' ')
        });
      });
    }

    return indicators.length > 0 ? indicators : [{
      type: 'info',
      severity: 'safe' as ThreatLevel,
      description: 'No significant threat indicators detected'
    }];
  }

  private getRecommendation(action: string, threatLevel: ThreatLevel): string {
    if (action === 'block') {
      return '⛔ BLOCK - Do not proceed. This appears to be a scam or malicious content.';
    } else if (action === 'step-up') {
      return '⚠️ CAUTION - Exercise extreme caution. Verify through alternative channels before proceeding.';
    } else if (threatLevel === 'low' || threatLevel === 'safe') {
      return '✅ SAFE - This appears legitimate. You may proceed with normal caution.';
    } else {
      return '⚠️ PROCEED WITH CAUTION - Some risk indicators present. Stay vigilant.';
    }
  }

  private getDeviceFingerprint(): string {
    // Simple device fingerprint (in production, use more sophisticated fingerprinting)
    const ua = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return btoa(`${ua}|${screen}|${tz}`).substring(0, 32);
  }

  private async saveScanHistory(userId: string, result: ScanResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('scan_history')
        .insert({
          user_id: userId,
          scan_type: result.scanType,
          input: result.input,
          threat_level: result.threatLevel,
          score: result.score,
          details: result.details
        });

      if (error) {
        console.error('Failed to save scan history:', error);
      }
    } catch (error) {
      console.error('Error saving scan history:', error);
    }
  }
}

export const scanner = new Scanner();
