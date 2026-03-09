/**
 * JACKSCHITT AI Fraud Detection Engine - TypeScript Edition
 * Translated from Python ML system to TypeScript rule-based + behavioral learning
 * Prime Directive: Provide for all, find the good, never limit unnecessarily
 */

export interface PersonalityState {
  boldness: number;
  protectiveness: number;
  helpfulness: number;
  skepticism: number;
  humility: number;
  total_decisions: number;
  correct_catches: number;
  false_positives: number;
}

export interface UserBaseline {
  avg_amount: number;
  avg_velocity: number;
  typical_hours: number[];
  device_fingerprints: string[];
  location_patterns: string[];
  total_transactions: number;
  last_transaction_at: string | null;
}

export interface ScanInput {
  type: 'ip' | 'email' | 'url' | 'phone';
  value: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface FraudDecision {
  action: 'allow' | 'block' | 'step-up';
  risk_score: number; // 0-1
  fraud_probability: number; // 0-1
  anomaly_score: number; // 0-1
  confidence: number; // 0-1
  reasoning: {
    primary_factors: string[];
    behavioral_deviation: string[];
    personality_influence: string[];
    final_explanation: string;
  };
  recommend_ipqs_validation: boolean;
}

/**
 * Fraud Risk Scoring - Multi-factor analysis
 */
export class FraudScorer {
  /**
   * Calculate risk score for email
   */
  static scoreEmail(email: string, baseline?: UserBaseline): number {
    let risk = 0.0;
    const factors: string[] = [];

    // Disposable domain patterns
    const disposableDomains = [
      'tempmail', 'throwaway', '10minute', 'guerrillamail', 'mailinator',
      'trashmail', 'fakeinbox', 'yopmail'
    ];
    if (disposableDomains.some(d => email.toLowerCase().includes(d))) {
      risk += 0.4;
      factors.push('disposable_domain');
    }

    // Random character patterns (e.g., "asdkfj123@gmail.com")
    const localPart = email.split('@')[0];
    const hasRandomPattern = /^[a-z0-9]{8,}$/.test(localPart) && !/(.)\1{2,}/.test(localPart);
    if (hasRandomPattern) {
      risk += 0.25;
      factors.push('random_pattern');
    }

    // New vs established (if baseline exists)
    if (baseline && baseline.total_transactions < 3) {
      risk += 0.15;
      factors.push('new_user');
    }

    // Numeric-heavy emails (scammer pattern)
    const digitRatio = (localPart.match(/\d/g) || []).length / localPart.length;
    if (digitRatio > 0.5) {
      risk += 0.2;
      factors.push('digit_heavy');
    }

    return Math.min(1.0, risk);
  }

  /**
   * Calculate risk score for IP
   */
  static scoreIP(ip: string, baseline?: UserBaseline): number {
    let risk = 0.0;

    // VPN/Proxy patterns (simplified - real version would use GeoIP databases)
    const suspiciousRanges = ['10.', '172.16.', '192.168.']; // Private IPs
    if (suspiciousRanges.some(r => ip.startsWith(r))) {
      risk += 0.3;
    }

    // Known bad IP ranges (placeholder - would use threat intel feeds)
    // In real version: check against IP reputation databases

    // Behavioral: location deviation
    if (baseline && baseline.location_patterns.length > 0) {
      // Simplified: just check if this is a new location
      if (!baseline.location_patterns.includes(ip.split('.')[0])) {
        risk += 0.2;
      }
    }

    return Math.min(1.0, risk);
  }

  /**
   * Calculate risk score for URL
   */
  static scoreURL(url: string): number {
    let risk = 0.0;

    try {
      const urlObj = new URL(url);

      // Suspicious TLDs
      const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.pw'];
      if (suspiciousTLDs.some(tld => urlObj.hostname.endsWith(tld))) {
        risk += 0.35;
      }

      // IP address instead of domain
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(urlObj.hostname)) {
        risk += 0.25;
      }

      // Excessive subdomains (e.g., secure.login.account.verify.example.com)
      const subdomains = urlObj.hostname.split('.');
      if (subdomains.length > 4) {
        risk += 0.2;
      }

      // URL shorteners
      const shorteners = ['bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly'];
      if (shorteners.some(s => urlObj.hostname.includes(s))) {
        risk += 0.15;
      }

      // Suspicious keywords
      const suspiciousWords = ['verify', 'secure', 'account', 'update', 'confirm', 'login', 'bank'];
      const hasMultipleSuspicious = suspiciousWords.filter(w => 
        url.toLowerCase().includes(w)
      ).length >= 2;
      if (hasMultipleSuspicious) {
        risk += 0.25;
      }

    } catch (e) {
      // Invalid URL
      risk = 0.8;
    }

    return Math.min(1.0, risk);
  }

  /**
   * Calculate risk score for phone
   */
  static scorePhone(phone: string): number {
    let risk = 0.0;

    // Remove non-digits
    const digits = phone.replace(/\D/g, '');

    // Invalid length
    if (digits.length < 10 || digits.length > 15) {
      risk += 0.3;
    }

    // Repeated patterns (e.g., 555-5555)
    if (/(\d)\1{4,}/.test(digits)) {
      risk += 0.4;
    }

    // Sequential patterns (e.g., 123456)
    if (/(?:0(?=1)|1(?=2)|2(?=3)|3(?=4)|4(?=5)|5(?=6)|6(?=7)|7(?=8)|8(?=9)){5,}/.test(digits)) {
      risk += 0.3;
    }

    // VoIP patterns (placeholder - would use carrier lookup)
    // In real version: check against VoIP number databases

    return Math.min(1.0, risk);
  }
}

/**
 * Anomaly Detection - Behavioral deviation analysis
 */
export class AnomalyDetector {
  /**
   * Calculate anomaly score based on user baseline deviation
   */
  static calculateAnomaly(
    input: ScanInput,
    baseline: UserBaseline | null,
    currentMetadata: Record<string, any>
  ): { score: number; deviations: string[] } {
    if (!baseline) {
      return { score: 0.3, deviations: ['new_user_no_baseline'] };
    }

    const deviations: string[] = [];
    let anomalyScore = 0.0;

    // Time-based anomaly (unusual hour)
    const currentHour = new Date().getHours();
    const typicalHours = baseline.typical_hours || [];
    if (typicalHours.length > 0 && !typicalHours.includes(currentHour)) {
      anomalyScore += 0.2;
      deviations.push(`unusual_hour_${currentHour}`);
    }

    // Velocity anomaly (too many scans in short time)
    if (baseline.last_transaction_at) {
      const lastTime = new Date(baseline.last_transaction_at).getTime();
      const now = Date.now();
      const minutesSince = (now - lastTime) / (1000 * 60);
      if (minutesSince < 1) {
        anomalyScore += 0.3;
        deviations.push('high_velocity_scan');
      }
    }

    // Device fingerprint anomaly
    const deviceFingerprint = currentMetadata?.device_fingerprint;
    if (deviceFingerprint && baseline.device_fingerprints.length > 0) {
      if (!baseline.device_fingerprints.includes(deviceFingerprint)) {
        anomalyScore += 0.15;
        deviations.push('new_device');
      }
    }

    // Transaction count anomaly (sudden spike in activity)
    if (baseline.total_transactions > 100) {
      // Established user doing something unusual
      anomalyScore *= 1.2; // Amplify anomaly for established users
    } else if (baseline.total_transactions < 3) {
      // Very new user - inherently more risky
      anomalyScore += 0.1;
      deviations.push('very_new_user');
    }

    return {
      score: Math.min(1.0, anomalyScore),
      deviations
    };
  }
}

/**
 * AI Personality Decision Engine
 */
export class PersonalityEngine {
  /**
   * Make decision based on risk, anomaly, and personality
   */
  static decide(
    fraudProbability: number,
    anomalyScore: number,
    personality: PersonalityState,
    input: ScanInput
  ): FraudDecision {
    // Combined risk (weighted average)
    const riskScore = 0.6 * fraudProbability + 0.4 * anomalyScore;

    const factors: string[] = [];
    const behavioralDev: string[] = [];
    const personalityInfluence: string[] = [];

    // Determine base action from risk thresholds
    let action: 'allow' | 'block' | 'step-up';
    let confidence = 0.0;

    // Personality-adjusted thresholds
    const blockThreshold = 0.75 - (personality.protectiveness * 0.1);
    const stepUpThreshold = 0.45 - (personality.skepticism * 0.1);
    const allowThreshold = 0.30 + (personality.helpfulness * 0.1);

    if (riskScore >= blockThreshold) {
      action = 'block';
      confidence = 0.7 + (personality.protectiveness * 0.2);
      factors.push(`high_risk_${riskScore.toFixed(2)}`);
      personalityInfluence.push(`protectiveness_${personality.protectiveness.toFixed(2)}_triggered_block`);
    } else if (riskScore >= stepUpThreshold) {
      action = 'step-up';
      confidence = 0.5 + (personality.humility * 0.3);
      factors.push(`moderate_risk_${riskScore.toFixed(2)}`);
      personalityInfluence.push(`humility_${personality.humility.toFixed(2)}_chose_caution`);
    } else {
      action = 'allow';
      confidence = 0.6 + (personality.helpfulness * 0.3);
      factors.push(`low_risk_${riskScore.toFixed(2)}`);
      personalityInfluence.push(`helpfulness_${personality.helpfulness.toFixed(2)}_prioritized_access`);
    }

    // Humility override: force step-up if uncertain (risk 0.4-0.6 and high humility)
    if (riskScore >= 0.4 && riskScore <= 0.6 && personality.humility > 0.75) {
      action = 'step-up';
      personalityInfluence.push('humility_override_uncertainty');
      confidence *= 0.8; // Lower confidence due to uncertainty
    }

    // Boldness influence: lower-risk blocks if bold
    if (personality.boldness > 0.7 && action === 'step-up' && riskScore < 0.5) {
      action = 'allow';
      personalityInfluence.push(`boldness_${personality.boldness.toFixed(2)}_lowered_friction`);
    }

    // Behavioral anomaly factors
    if (anomalyScore > 0.3) {
      behavioralDev.push(`anomaly_detected_${anomalyScore.toFixed(2)}`);
    }

    // Recommend IPQS validation for high-risk or uncertain cases
    const recommendIPQS = (
      riskScore > 0.65 || 
      (riskScore > 0.4 && riskScore < 0.6) ||
      confidence < 0.6
    );

    const reasoning = {
      primary_factors: factors,
      behavioral_deviation: behavioralDev,
      personality_influence: personalityInfluence,
      final_explanation: this.generateExplanation(
        action, 
        riskScore, 
        fraudProbability, 
        anomalyScore, 
        personality,
        input.type
      )
    };

    return {
      action,
      risk_score: riskScore,
      fraud_probability: fraudProbability,
      anomaly_score: anomalyScore,
      confidence,
      reasoning,
      recommend_ipqs_validation: recommendIPQS
    };
  }

  /**
   * Generate human-readable explanation
   */
  private static generateExplanation(
    action: string,
    risk: number,
    fraud: number,
    anomaly: number,
    personality: PersonalityState,
    scanType: string
  ): string {
    const riskLevel = risk > 0.7 ? 'HIGH' : risk > 0.4 ? 'MODERATE' : 'LOW';
    
    let explanation = `🛡️ Knight AI Decision: ${action.toUpperCase()} (${riskLevel} RISK)\n\n`;
    explanation += `Risk Score: ${(risk * 100).toFixed(1)}% (Fraud: ${(fraud * 100).toFixed(1)}%, Anomaly: ${(anomaly * 100).toFixed(1)}%)\n\n`;
    
    if (action === 'block') {
      explanation += `⛔ BLOCKED: This ${scanType} shows strong indicators of fraudulent activity. `;
      explanation += `My protective instincts (${(personality.protectiveness * 100).toFixed(0)}%) prioritize your safety. `;
    } else if (action === 'step-up') {
      explanation += `⚠️ CAUTION: This ${scanType} shows some concerning patterns. `;
      explanation += `My humility (${(personality.humility * 100).toFixed(0)}%) says: when uncertain, verify. `;
    } else {
      explanation += `✅ ALLOWED: This ${scanType} appears legitimate. `;
      explanation += `My helpfulness (${(personality.helpfulness * 100).toFixed(0)}%) wants you to access what you need. `;
    }

    return explanation;
  }

  /**
   * Evolve personality based on outcome (learning from results)
   */
  static evolvePersonality(
    personality: PersonalityState,
    wasCorrect: boolean,
    action: string
  ): PersonalityState {
    const newState = { ...personality };
    const delta = wasCorrect ? 0.003 : 0.008;

    if (wasCorrect) {
      // Good decision: reinforce protective, helpful traits
      newState.protectiveness = Math.min(0.96, newState.protectiveness + delta * 1.2);
      newState.helpfulness = Math.min(0.96, newState.helpfulness + delta * 1.0);
      newState.humility = Math.min(0.94, newState.humility + delta * 1.5);
      newState.correct_catches++;
    } else {
      // Bad decision: increase humility, reduce boldness
      newState.humility = Math.min(0.94, newState.humility + delta * 2.0);
      newState.boldness = Math.max(0.35, newState.boldness - delta * 0.8);
      newState.skepticism = Math.min(0.85, newState.skepticism + delta * 1.0);
      newState.false_positives++;
    }

    // Hard caps on personality traits (Constitutional Rules)
    newState.boldness = Math.min(0.80, Math.max(0.35, newState.boldness));
    newState.protectiveness = Math.min(0.96, newState.protectiveness);
    newState.helpfulness = Math.min(0.96, newState.helpfulness);
    newState.skepticism = Math.min(0.85, newState.skepticism);
    newState.humility = Math.min(0.94, newState.humility);

    newState.total_decisions++;

    return newState;
  }
}
