import { useState } from 'react';
import { Search, Phone, MapPin, Wifi, Shield, AlertTriangle, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface PhoneLookupResult {
  success: boolean;
  type: string;
  value: string;
  phone_data?: {
    valid: boolean;
    active: boolean;
    fraud_score: number;
    recent_abuse: boolean;
    risky: boolean;
    VOIP: boolean;
    leaked: boolean;
    prepaid?: boolean;
    do_not_call?: boolean;
  };
  carrier?: {
    name: string;
    line_type: string;
  };
  location?: {
    country: string;
    region: string;
    city: string;
    zip_code?: string;
    timezone?: string;
    dialing_code?: string;
    local_format?: string;
    international_format?: string;
  };
  risk_assessment?: {
    fraud_score: number;
    is_voip: boolean;
    is_valid: boolean;
    is_risky: boolean;
    spam_score: number;
    threat_level: string;
  };
  error?: string;
}

export function ReverseLookup() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PhoneLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!phoneNumber.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('reverse-lookup', {
        body: { type: 'phone', value: phoneNumber.trim() },
      });

      if (fnError) {
        let errorMessage = fnError.message;
        if (fnError instanceof FunctionsHttpError) {
          try {
            const text = await fnError.context?.text();
            errorMessage = text || fnError.message;
          } catch {
            // keep original message
          }
        }
        throw new Error(errorMessage);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Lookup failed - check phone number format');
      }

      setResult(data);
    } catch (err: any) {
      console.error('Phone lookup error:', err);
      setError(err.message || 'Lookup failed');
      toast.error(err.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const getThreatColor = (level: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'destructive',
      HIGH: 'destructive',
      MEDIUM: 'secondary',
      LOW: 'secondary',
      SAFE: 'default',
    };
    return (colors[level] || 'secondary') as any;
  };

  const getThreatBgColor = (level: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-500/10 border-red-500/30 text-red-500',
      HIGH: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
      MEDIUM: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600',
      LOW: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
      SAFE: 'bg-green-500/10 border-green-500/30 text-green-500',
    };
    return colors[level] || 'bg-gray-500/10 border-gray-500/30 text-gray-500';
  };

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Reverse Phone Lookup</h1>
          <p className="text-muted-foreground">
            Real-time carrier, location, and fraud data powered by IPQS
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="+1 (555) 123-4567 or 5551234567"
                className="flex-1 text-base"
              />
              <Button
                onClick={handleLookup}
                disabled={loading || !phoneNumber.trim()}
                size="lg"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Looking up...</>
                ) : (
                  <><Search className="h-4 w-4 mr-2" />Lookup</>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Supports US, Canada, and international numbers. Include country code for best results (e.g., +1 for US).
            </p>
          </CardContent>
        </Card>

        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="font-medium text-destructive">Lookup Failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {result && result.success && (
          <div className="space-y-5">
            {/* Risk Header */}
            {result.risk_assessment && (
              <div className={`border rounded-xl p-5 ${getThreatBgColor(result.risk_assessment.threat_level)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8" />
                    <div>
                      <p className="font-bold text-lg">
                        Threat Level: {result.risk_assessment.threat_level}
                      </p>
                      <p className="text-sm opacity-80">
                        Fraud Score: {result.risk_assessment.fraud_score}/100
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black">{result.risk_assessment.fraud_score}</div>
                    <div className="text-xs opacity-70">/ 100</div>
                  </div>
                </div>
                {/* Risk bar */}
                <div className="mt-3 bg-white/20 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-current transition-all"
                    style={{ width: `${result.risk_assessment.fraud_score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Phone Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-5 w-5 text-primary" />
                  Phone Number Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Number</p>
                    <p className="font-semibold">{result.location?.international_format || result.value}</p>
                  </div>
                  {result.location?.local_format && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Local Format</p>
                      <p className="font-medium">{result.location.local_format}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge variant={result.phone_data?.active ? 'default' : 'secondary'}>
                      {result.phone_data?.active ? '✅ Active' : '❌ Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valid Number</p>
                    <Badge variant={result.phone_data?.valid ? 'default' : 'destructive'}>
                      {result.phone_data?.valid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                  {result.location?.dialing_code && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Dialing Code</p>
                      <p className="font-medium">+{result.location.dialing_code}</p>
                    </div>
                  )}
                </div>

                {/* Flags */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {result.phone_data?.VOIP && (
                    <Badge variant="destructive">⚠️ VoIP Number</Badge>
                  )}
                  {result.phone_data?.recent_abuse && (
                    <Badge variant="destructive">🚨 Recent Abuse Reported</Badge>
                  )}
                  {result.phone_data?.leaked && (
                    <Badge variant="destructive">🔓 Found in Data Breach</Badge>
                  )}
                  {result.phone_data?.risky && (
                    <Badge variant="secondary">⚡ Risky Number</Badge>
                  )}
                  {result.phone_data?.prepaid && (
                    <Badge variant="secondary">💳 Prepaid</Badge>
                  )}
                  {result.phone_data?.do_not_call && (
                    <Badge variant="secondary">🚫 Do Not Call Registry</Badge>
                  )}
                  {!result.phone_data?.VOIP && !result.phone_data?.recent_abuse && !result.phone_data?.risky && (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">✅ No Major Red Flags</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Carrier Info */}
            {result.carrier && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wifi className="h-5 w-5 text-blue-500" />
                    Carrier Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Carrier / Provider</p>
                      <p className="font-semibold text-lg">{result.carrier.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Line Type</p>
                      <Badge variant="outline" className="text-sm">
                        {result.carrier.line_type || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location Info */}
            {result.location && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-5 w-5 text-green-500" />
                    Location Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Country</p>
                      <p className="font-semibold">{result.location.country || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Region / State</p>
                      <p className="font-medium">{result.location.region || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">City</p>
                      <p className="font-medium">{result.location.city || 'Unknown'}</p>
                    </div>
                    {result.location.zip_code && result.location.zip_code !== 'Unknown' && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">ZIP Code</p>
                        <p className="font-medium">{result.location.zip_code}</p>
                      </div>
                    )}
                    {result.location.timezone && result.location.timezone !== 'Unknown' && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Timezone</p>
                        <Badge variant="outline">{result.location.timezone}</Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Location is based on the number's registration area, not the caller's real-time location.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Fraud Score Visual */}
            {result.risk_assessment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Risk Assessment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Fraud Score</span>
                        <span className="font-bold">{result.risk_assessment.fraud_score}/100</span>
                      </div>
                      <div className="bg-secondary rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            result.risk_assessment.fraud_score >= 75 ? 'bg-red-500' :
                            result.risk_assessment.fraud_score >= 50 ? 'bg-orange-500' :
                            result.risk_assessment.fraud_score >= 25 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${result.risk_assessment.fraud_score}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">VoIP</p>
                        <p className={`font-bold ${result.risk_assessment.is_voip ? 'text-red-500' : 'text-green-500'}`}>
                          {result.risk_assessment.is_voip ? 'YES' : 'NO'}
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">Valid</p>
                        <p className={`font-bold ${result.risk_assessment.is_valid ? 'text-green-500' : 'text-red-500'}`}>
                          {result.risk_assessment.is_valid ? 'YES' : 'NO'}
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground">Risky</p>
                        <p className={`font-bold ${result.risk_assessment.is_risky ? 'text-red-500' : 'text-green-500'}`}>
                          {result.risk_assessment.is_risky ? 'YES' : 'NO'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
