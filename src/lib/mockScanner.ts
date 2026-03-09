import { ScanResult, ScanType, ThreatLevel, ScanDetails } from '@/types';

const threatLevels: ThreatLevel[] = ['safe', 'low', 'medium', 'high', 'critical'];

const generateMockScanResult = (scanType: ScanType, input: string): ScanResult => {
  const randomThreatIndex = Math.floor(Math.random() * threatLevels.length);
  const threatLevel = threatLevels[randomThreatIndex];
  const score = Math.floor((randomThreatIndex / (threatLevels.length - 1)) * 100);

  let details: ScanDetails;

  switch (scanType) {
    case 'url':
      details = {
        summary: threatLevel === 'safe' 
          ? 'This URL appears legitimate and safe to visit.'
          : `This URL shows ${threatLevel} risk indicators. Exercise caution.`,
        indicators: [
          { type: 'Domain Age', severity: threatLevel, description: `Domain registered ${Math.floor(Math.random() * 5)} years ago` },
          { type: 'SSL Certificate', severity: 'safe', description: 'Valid SSL certificate detected' },
          { type: 'Malware Scan', severity: threatLevel, description: threatLevel === 'safe' ? 'No malware detected' : 'Suspicious patterns found' },
        ],
        linkAnalysis: {
          redirectChain: [input, 'https://intermediate-site.com', 'https://final-destination.com'],
          finalDestination: 'https://final-destination.com',
          maliciousContent: threatLevel === 'high' || threatLevel === 'critical',
          phishingScore: score,
          originCountry: ['US', 'CN', 'RU', 'BR'][Math.floor(Math.random() * 4)],
        },
        recommendation: threatLevel === 'safe' 
          ? 'Safe to proceed with normal precautions.' 
          : 'Do not click this link. Report if received via message.',
      };
      break;

    case 'phone':
      details = {
        summary: threatLevel === 'safe'
          ? 'This phone number has a clean record.'
          : `This number is associated with ${threatLevel} risk activities.`,
        indicators: [
          { type: 'Spam Reports', severity: threatLevel, description: `${Math.floor(Math.random() * 50)} user reports` },
          { type: 'Call Pattern', severity: threatLevel, description: threatLevel === 'safe' ? 'Normal usage' : 'Automated dialing detected' },
          { type: 'Identity Verification', severity: threatLevel, description: threatLevel === 'safe' ? 'Verified carrier' : 'Unverified VOIP' },
        ],
        recommendation: threatLevel === 'safe'
          ? 'Number appears legitimate.'
          : 'Block this number and report as spam.',
      };
      break;

    case 'email':
      details = {
        summary: threatLevel === 'safe'
          ? 'Email address shows no red flags.'
          : `Email linked to ${threatLevel} risk activities.`,
        indicators: [
          { type: 'Domain Reputation', severity: threatLevel, description: threatLevel === 'safe' ? 'Trusted email provider' : 'Suspicious domain' },
          { type: 'Phishing Database', severity: threatLevel, description: `${Math.floor(Math.random() * 20)} phishing attempts reported` },
          { type: 'Data Breaches', severity: threatLevel, description: threatLevel === 'safe' ? 'No breaches found' : 'Found in 3 data breaches' },
        ],
        recommendation: threatLevel === 'safe'
          ? 'Email appears safe to communicate with.'
          : 'Do not respond. Mark as spam.',
      };
      break;

    case 'username':
    case 'social-profile':
      details = {
        summary: threatLevel === 'safe'
          ? 'Profile shows normal activity patterns.'
          : `Profile exhibits ${threatLevel} risk behaviors.`,
        indicators: [
          { type: 'Account Age', severity: threatLevel, description: `Created ${Math.floor(Math.random() * 36)} months ago` },
          { type: 'Activity Pattern', severity: threatLevel, description: threatLevel === 'safe' ? 'Consistent human behavior' : 'Bot-like activity detected' },
          { type: 'Content Analysis', severity: threatLevel, description: threatLevel === 'safe' ? 'No concerning content' : 'Suspicious content patterns' },
        ],
        predatorFlags: threatLevel === 'high' || threatLevel === 'critical' ? [
          { pattern: 'Age-inappropriate messaging', confidence: 0.78, description: 'Attempts to communicate with minors' },
          { pattern: 'Grooming language', confidence: 0.65, description: 'Uses manipulative conversation techniques' },
        ] : [],
        recommendation: threatLevel === 'safe'
          ? 'Profile appears legitimate.'
          : 'Block this user. Report to platform authorities.',
      };
      break;
  }

  return {
    id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    scanType,
    input,
    threatLevel,
    score,
    timestamp: new Date(),
    details,
  };
};

export const mockScanner = {
  scan: (scanType: ScanType, input: string): Promise<ScanResult> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = generateMockScanResult(scanType, input);
        
        // Store in history
        const history = mockScanner.getHistory();
        history.unshift(result);
        localStorage.setItem('scan_history', JSON.stringify(history.slice(0, 50)));
        
        resolve(result);
      }, 2000);
    });
  },

  getHistory: (): ScanResult[] => {
    const stored = localStorage.getItem('scan_history');
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  },

  clearHistory: (): void => {
    localStorage.removeItem('scan_history');
  },
};
