export type ScanType = 'phone' | 'email' | 'url' | 'username' | 'social-profile' | 'ip' | 'qr-code' | 'text';

export type ThreatLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface ScanResult {
  id: string;
  scanType: ScanType;
  input: string;
  threatLevel: ThreatLevel;
  score: number;
  timestamp: Date;
  details: ScanDetails;
}

export interface ScanDetails {
  summary: string;
  indicators: ThreatIndicator[];
  linkAnalysis?: LinkAnalysis;
  predatorFlags?: PredatorFlag[];
  recommendation: string;
  aiDecision?: AIDecision;
}

export interface AIDecision {
  action: 'allow' | 'block' | 'step-up';
  confidence: number;
  fraudProbability: number;
  anomalyScore: number;
  factors: string[];
  behavioralDeviation: string[];
  personalityInfluence: string[];
  ipqsValidation?: {
    used: boolean;
    fraud_score: number;
    threat_level: string;
  };
}

export interface ThreatIndicator {
  type: string;
  severity: ThreatLevel;
  description: string;
}

export interface LinkAnalysis {
  redirectChain: string[];
  finalDestination: string;
  maliciousContent: boolean;
  phishingScore: number;
  originCountry?: string;
}

export interface PredatorFlag {
  pattern: string;
  confidence: number;
  description: string;
}

export interface User {
  id: string;
  email: string;
  tier: 'free' | 'premium' | 'family';
  scansRemaining?: number;
  autoScanEnabled: boolean;
  isAdmin?: boolean;
  aiEnabled?: boolean;
  aiChatEnabled?: boolean;
  aiAnalysisEnabled?: boolean;
}

export interface AutoScanConfig {
  enabled: boolean;
  platforms: string[];
  frequency: 'realtime' | 'hourly' | 'daily';
}
