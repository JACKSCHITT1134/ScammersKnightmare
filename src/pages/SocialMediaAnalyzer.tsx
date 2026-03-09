import { useState } from 'react';
import { Search, AlertCircle, CheckCircle, Users, Instagram, Facebook, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SocialAnalysis {
  platform: string;
  profile_identifier: string;
  risk_indicators: {
    is_fake: boolean;
    bot_score: number;
    account_age_days: number;
    follower_ratio: number;
    activity_score: number;
    verified: boolean;
  };
  threat_level: 'safe' | 'low' | 'medium' | 'high';
  score: number;
  recommendations: string[];
}

export function SocialMediaAnalyzer() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SocialAnalysis | null>(null);
  const [platform, setPlatform] = useState('instagram');
  const [profileId, setProfileId] = useState('');

  const analyzePlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return Instagram;
      case 'facebook': return Facebook;
      case 'twitter': return Twitter;
      default: return Users;
    }
  };

  const analyzeProfile = async () => {
    if (!profileId.trim()) return;

    setAnalyzing(true);
    try {
      // TODO: Integrate with social media APIs
      // For now, simulate analysis
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock analysis
      const mockResult: SocialAnalysis = {
        platform,
        profile_identifier: profileId,
        risk_indicators: {
          is_fake: Math.random() > 0.7,
          bot_score: Math.floor(Math.random() * 100),
          account_age_days: Math.floor(Math.random() * 1000),
          follower_ratio: Math.random() * 10,
          activity_score: Math.floor(Math.random() * 100),
          verified: Math.random() > 0.8
        },
        threat_level: 'medium',
        score: Math.floor(Math.random() * 100),
        recommendations: []
      };

      // Determine threat level based on indicators
      if (mockResult.risk_indicators.is_fake || mockResult.risk_indicators.bot_score > 70) {
        mockResult.threat_level = 'high';
        mockResult.recommendations.push('⚠️ High probability of fake/bot account');
      }

      if (mockResult.risk_indicators.account_age_days < 30) {
        mockResult.recommendations.push('🆕 Very new account - exercise caution');
      }

      if (mockResult.risk_indicators.follower_ratio < 0.1 || mockResult.risk_indicators.follower_ratio > 5) {
        mockResult.recommendations.push('📊 Suspicious follower/following ratio');
      }

      if (!mockResult.risk_indicators.verified && mockResult.risk_indicators.follower_ratio > 3) {
        mockResult.recommendations.push('❌ Not verified but claims high status');
      }

      if (mockResult.recommendations.length === 0) {
        mockResult.threat_level = 'safe';
        mockResult.recommendations.push('✅ Profile appears legitimate');
      }

      setResult(mockResult);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'safe': return 'text-green-500 border-green-500';
      case 'low': return 'text-blue-500 border-blue-500';
      case 'medium': return 'text-yellow-500 border-yellow-500';
      case 'high': return 'text-red-500 border-red-500';
      default: return 'text-gray-500 border-gray-500';
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Social Media Profile Analyzer</h1>
          <p className="text-muted-foreground">
            Detect fake accounts, bots, and catfishing attempts
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Analyze Social Profile</CardTitle>
            <CardDescription>
              Enter a profile username or URL to check for authenticity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter / X</option>
                    <option value="tiktok">TikTok</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>

                <Input
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  placeholder="@username or profile URL"
                  className="md:col-span-1"
                />

                <Button
                  onClick={analyzeProfile}
                  disabled={analyzing || !profileId.trim()}
                >
                  <Search className="w-4 h-4 mr-2" />
                  {analyzing ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            {/* Overall Score */}
            <Card className={`border-2 ${getThreatColor(result.threat_level)}`}>
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className={`text-6xl font-bold mb-2 ${getThreatColor(result.threat_level)}`}>
                    {result.score}
                  </div>
                  <Badge variant={result.threat_level === 'high' ? 'destructive' : 'default'} className="text-lg px-4 py-1">
                    {result.threat_level.toUpperCase()} RISK
                  </Badge>
                </div>

                <div className="space-y-2">
                  {result.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-secondary/30 rounded-lg">
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Account Status</p>
                    <div className="flex items-center gap-2">
                      {result.risk_indicators.is_fake ? (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <span className="font-medium text-red-500">Likely Fake</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="font-medium text-green-500">Appears Real</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Bot Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            result.risk_indicators.bot_score > 70 ? 'bg-red-500' :
                            result.risk_indicators.bot_score > 40 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${result.risk_indicators.bot_score}%` }}
                        />
                      </div>
                      <span className="font-medium">{result.risk_indicators.bot_score}%</span>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Account Age</p>
                    <p className="font-medium">
                      {result.risk_indicators.account_age_days} days
                      {result.risk_indicators.account_age_days < 30 && (
                        <span className="text-xs text-yellow-500 ml-2">(Very New)</span>
                      )}
                    </p>
                  </div>

                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Follower Ratio</p>
                    <p className="font-medium">
                      {result.risk_indicators.follower_ratio.toFixed(2)}
                      {(result.risk_indicators.follower_ratio < 0.1 || result.risk_indicators.follower_ratio > 5) && (
                        <span className="text-xs text-yellow-500 ml-2">(Unusual)</span>
                      )}
                    </p>
                  </div>

                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Activity Score</p>
                    <p className="font-medium">{result.risk_indicators.activity_score}/100</p>
                  </div>

                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Verification Status</p>
                    <div className="flex items-center gap-2">
                      {result.risk_indicators.verified ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                          <span className="font-medium text-blue-500">Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-gray-500" />
                          <span className="font-medium text-gray-500">Not Verified</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
