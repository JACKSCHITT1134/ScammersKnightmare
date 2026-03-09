// IPQS API client utilities
const IPQS_BASE_URL = 'https://ipqualityscore.com/api/json';

export interface IPQSEmailResponse {
  success: boolean;
  valid: boolean;
  disposable: boolean;
  fraud_score: number;
  recent_abuse: boolean;
  spam_trap_score: string;
  deliverability: string;
  catch_all: boolean;
  leaked: boolean;
  suggested_domain?: string;
}

export interface IPQSURLResponse {
  success: boolean;
  unsafe: boolean;
  domain: string;
  ip_address: string;
  country_code: string;
  malware: boolean;
  phishing: boolean;
  spamming: boolean;
  suspicious: boolean;
  risk_score: number;
  domain_rank: number;
  domain_age?: {
    human: string;
    timestamp: number;
  };
}

export interface IPQSIPResponse {
  success: boolean;
  fraud_score: number;
  country_code: string;
  region: string;
  city: string;
  ISP: string;
  ASN: number;
  proxy: boolean;
  vpn: boolean;
  tor: boolean;
  active_vpn: boolean;
  active_tor: boolean;
  recent_abuse: boolean;
  bot_status: boolean;
  abuse_velocity: string;
  latitude: number;
  longitude: number;
}

export interface IPQSPhoneResponse {
  success: boolean;
  valid: boolean;
  fraud_score: number;
  recent_abuse: boolean;
  VOIP: boolean;
  risky: boolean;
  active: boolean;
  carrier: string;
  line_type: string;
  country: string;
  region: string;
  city: string;
  leaked: boolean;
}

export class IPQSClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async checkEmail(email: string): Promise<IPQSEmailResponse> {
    const url = `${IPQS_BASE_URL}/email/${this.apiKey}/${encodeURIComponent(email)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`IPQS: Email check failed (${response.status})`);
    }
    
    return await response.json();
  }

  async checkURL(targetUrl: string, strictness: number = 1): Promise<IPQSURLResponse> {
    const url = `${IPQS_BASE_URL}/url/${this.apiKey}/${encodeURIComponent(targetUrl)}?strictness=${strictness}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`IPQS: URL check failed (${response.status})`);
    }
    
    return await response.json();
  }

  async checkIP(ip: string): Promise<IPQSIPResponse> {
    const url = `${IPQS_BASE_URL}/ip/${this.apiKey}/${ip}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`IPQS: IP check failed (${response.status})`);
    }
    
    return await response.json();
  }

  async checkPhone(phone: string, country: string = 'US'): Promise<IPQSPhoneResponse> {
    const url = `${IPQS_BASE_URL}/phone/${this.apiKey}/${encodeURIComponent(phone)}?country[]=${country}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`IPQS: Phone check failed (${response.status})`);
    }
    
    return await response.json();
  }
}

// Aggressive fraud rules
export function evaluateThreat(scanType: string, ipqsData: any): { 
  threatLevel: string; 
  score: number; 
  shouldBlock: boolean;
  reason?: string;
} {
  let score = 0;
  let shouldBlock = false;
  let reason = '';

  switch (scanType) {
    case 'email':
      score = ipqsData.fraud_score || 0;
      if (ipqsData.disposable) {
        shouldBlock = true;
        reason = 'KNIGHTMARE REJECTED: Disposable email detected';
        score = Math.max(score, 95);
      }
      if (ipqsData.fraud_score >= 85) {
        shouldBlock = true;
        reason = 'KNIGHTMARE REJECTED: High fraud score';
      }
      break;

    case 'url':
      score = ipqsData.risk_score || 0;
      if (ipqsData.malware || ipqsData.phishing) {
        shouldBlock = true;
        reason = 'GET REKT: Malicious URL detected';
        score = 100;
      }
      if (ipqsData.risk_score >= 85) {
        shouldBlock = true;
        reason = 'QUARANTINE: High-risk URL';
      }
      break;

    case 'phone':
      score = ipqsData.fraud_score || 0;
      if (ipqsData.fraud_score >= 90 || ipqsData.recent_abuse) {
        shouldBlock = true;
        reason = 'KNIGHTMARE REJECTED: Fraudulent phone';
      }
      break;

    default:
      score = ipqsData.fraud_score || 0;
  }

  let threatLevel: string;
  if (score >= 85) threatLevel = 'critical';
  else if (score >= 70) threatLevel = 'high';
  else if (score >= 50) threatLevel = 'medium';
  else if (score >= 25) threatLevel = 'low';
  else threatLevel = 'safe';

  return { threatLevel, score, shouldBlock, reason };
}
