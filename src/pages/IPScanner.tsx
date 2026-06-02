import { useState } from 'react';
import {
  Globe, Search, Loader2, Shield, AlertTriangle,
  Wifi, MapPin, Server, Eye, Navigation, Zap, Info, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface IPResult {
  success: boolean;
  type: string;
  value: string;
  ip_data?: {
    fraud_score: number;
    country_code: string;
    region: string;
    city: string;
    ISP: string;
    ASN: number;
    proxy: boolean;
    vpn: boolean;
    tor: boolean;
    bot_status: boolean;
    recent_abuse: boolean;
    abuse_velocity: string;
  };
  location?: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  risk_assessment?: {
    fraud_score: number;
    is_proxy: boolean;
    is_vpn: boolean;
    is_tor: boolean;
    threat_level: string;
  };
  error?: string;
}

const THREAT_BG: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 border-red-500/40 text-red-500',
  HIGH:     'bg-orange-500/10 border-orange-500/40 text-orange-500',
  MEDIUM:   'bg-yellow-500/10 border-yellow-500/40 text-yellow-600',
  LOW:      'bg-blue-500/10 border-blue-500/40 text-blue-500',
  SAFE:     'bg-green-500/10 border-green-500/40 text-green-500',
};

const SCORE_COLOR = (s: number) =>
  s >= 75 ? 'bg-red-500' : s >= 50 ? 'bg-orange-500' : s >= 25 ? 'bg-yellow-500' : 'bg-green-500';

export function IPScanner() {
  const [ipInput, setIpInput]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [myIpLoading, setMyIpLoading] = useState(false);
  const [result, setResult]         = useState<IPResult | null>(null);
  const [error, setError]           = useState<string | null>(null);

  /* ── Helpers ── */
  const fetchMyIP = async () => {
    setMyIpLoading(true);
    try {
      const res  = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setIpInput(data.ip);
    } catch {
      toast.error('Could not detect your IP address');
    } finally {
      setMyIpLoading(false);
    }
  };

  const runLookup = async (ip: string) => {
    if (!ip.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const { data, error: fnError } = await supabase.functions.invoke('reverse-lookup', {
      body: { type: 'ip', value: ip.trim() },
    });

    if (fnError) {
      let msg = fnError.message;
      if (fnError instanceof FunctionsHttpError) {
        try { msg = (await fnError.context?.text()) || msg; } catch { /* */ }
      }
      setError(msg);
      toast.error(msg);
      setLoading(false);
      return;
    }

    if (!data?.success) {
      const msg = data?.error || 'IP lookup failed';
      setError(msg);
      toast.error(msg);
      setLoading(false);
      return;
    }

    setResult(data);
    setLoading(false);
  };

  const handleSubmit = () => runLookup(ipInput);

  const copyIP = (ip: string) => {
    navigator.clipboard.writeText(ip);
    toast.success('Copied to clipboard');
  };

  /* ── Map embed (OpenStreetMap via iframe) ── */
  const MapEmbed = ({ lat, lon, label }: { lat: number; lon: number; label: string }) => {
    const zoom   = 10;
    const bbox   = `${lon - 1},${lat - 0.7},${lon + 1},${lat + 0.7}`;
    const marker = `${lat},${lon}`;
    const src    = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
    const link   = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;

    return (
      <div className="relative rounded-xl overflow-hidden border border-border">
        <iframe
          title="IP Location Map"
          src={src}
          width="100%"
          height="280"
          style={{ border: 'none', display: 'block' }}
          loading="lazy"
        />
        {/* Location pin overlay label */}
        <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-medium border border-border flex items-center gap-1.5 shadow">
          <MapPin className="w-3 h-3 text-red-500" />
          {label}
        </div>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 bg-background/90 backdrop-blur px-2 py-1 rounded text-xs border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Open in Maps ↗
        </a>
      </div>
    );
  };

  const tl = result?.risk_assessment?.threat_level ?? 'SAFE';

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
            <Globe className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">IP Address Scanner</h1>
            <p className="text-muted-foreground text-sm">
              Real-time geolocation, ISP data, proxy/VPN/Tor detection &amp; fraud scoring via IPQS
            </p>
          </div>
        </div>

        {/* ── Search Card ── */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="e.g. 8.8.8.8 or 2001:4860:4860::8888"
                className="flex-1 text-base font-mono"
              />
              <Button onClick={handleSubmit} disabled={loading || !ipInput.trim()} size="lg">
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning…</>
                  : <><Search className="w-4 h-4 mr-2" />Scan IP</>}
              </Button>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => { await fetchMyIP(); }}
                disabled={myIpLoading}
              >
                {myIpLoading
                  ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Detecting…</>
                  : <><Navigation className="w-3 h-3 mr-1.5" />Scan My IP</>}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIpInput('8.8.8.8');
                }}
              >
                Try 8.8.8.8
              </Button>
              <span className="text-xs text-muted-foreground hidden sm:block">
                Supports IPv4 and IPv6 addresses
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Error ── */}
        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="font-medium text-destructive">Scan Failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Results ── */}
        {result?.success && (
          <div className="space-y-5">

            {/* Threat Level Banner */}
            <div className={`border rounded-xl p-5 ${THREAT_BG[tl]}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-xl">Threat Level: {tl}</p>
                    <p className="text-sm opacity-75">Fraud Score: {result.risk_assessment?.fraud_score ?? 0}/100</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-4xl font-black">{result.risk_assessment?.fraud_score ?? 0}</div>
                  <div className="text-xs opacity-60">out of 100</div>
                </div>
              </div>
              {/* Score bar */}
              <div className="mt-3 bg-white/20 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full bg-current transition-all duration-700"
                  style={{ width: `${result.risk_assessment?.fraud_score ?? 0}%` }}
                />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              {/* Left column */}
              <div className="space-y-5">

                {/* IP Identity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Server className="w-4 h-4 text-primary" />
                      IP Identity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-lg font-bold">{result.value}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => copyIP(result.value)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">ISP / Organization</p>
                        <p className="font-semibold">{result.ip_data?.ISP || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">ASN</p>
                        <p className="font-mono font-medium">AS{result.ip_data?.ASN || '—'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Threat Flags */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="w-4 h-4 text-orange-500" />
                      Threat Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.ip_data?.proxy && (
                        <Badge variant="destructive">🔄 Proxy Detected</Badge>
                      )}
                      {result.ip_data?.vpn && (
                        <Badge variant="destructive">🔐 VPN Detected</Badge>
                      )}
                      {result.ip_data?.tor && (
                        <Badge variant="destructive">🧅 Tor Exit Node</Badge>
                      )}
                      {result.ip_data?.bot_status && (
                        <Badge variant="destructive">🤖 Bot Activity</Badge>
                      )}
                      {result.ip_data?.recent_abuse && (
                        <Badge variant="destructive">🚨 Recent Abuse</Badge>
                      )}
                      {result.ip_data?.abuse_velocity && result.ip_data.abuse_velocity !== 'none' && (
                        <Badge variant="secondary">⚡ Abuse Velocity: {result.ip_data.abuse_velocity}</Badge>
                      )}
                      {!result.ip_data?.proxy && !result.ip_data?.vpn && !result.ip_data?.tor &&
                       !result.ip_data?.bot_status && !result.ip_data?.recent_abuse && (
                        <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                          ✅ No Anonymous Routing Detected
                        </Badge>
                      )}
                    </div>

                    {/* Detailed grid */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {[
                        { label: 'Proxy', value: result.risk_assessment?.is_proxy, danger: true },
                        { label: 'VPN',   value: result.risk_assessment?.is_vpn,   danger: true },
                        { label: 'Tor',   value: result.risk_assessment?.is_tor,   danger: true },
                      ].map(({ label, value, danger }) => (
                        <div key={label} className="text-center p-3 rounded-lg bg-secondary/50">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className={`font-bold text-sm mt-0.5 ${value ? (danger ? 'text-red-500' : 'text-yellow-500') : 'text-green-500'}`}>
                            {value ? 'YES' : 'NO'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Fraud Score Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Fraud Score Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Overall Fraud Score', value: result.risk_assessment?.fraud_score ?? 0 },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{label}</span>
                          <span className="font-bold">{value}/100</span>
                        </div>
                        <div className="bg-secondary rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-700 ${SCORE_COLOR(value)}`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <Info className="w-3 h-3" />
                      Scores above 75 indicate high fraud risk. Scores above 90 are typically automated bots or malicious actors.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right column */}
              <div className="space-y-5">

                {/* Location Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      Geographic Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Country</p>
                        <p className="font-semibold">{result.location?.country || result.ip_data?.country_code || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Region / State</p>
                        <p className="font-medium">{result.location?.region || result.ip_data?.region || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">City</p>
                        <p className="font-medium">{result.location?.city || result.ip_data?.city || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Timezone</p>
                        <Badge variant="outline" className="text-xs">
                          {result.location?.timezone || 'Unknown'}
                        </Badge>
                      </div>
                      {result.location?.latitude && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Coordinates</p>
                          <p className="font-mono text-xs">
                            {result.location.latitude.toFixed(4)}, {result.location.longitude.toFixed(4)}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Map */}
                {result.location?.latitude && result.location?.longitude ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-blue-500" />
                        Location Map
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MapEmbed
                        lat={result.location.latitude}
                        lon={result.location.longitude}
                        label={[result.location.city, result.location.region, result.location.country]
                          .filter(Boolean)
                          .join(', ')}
                      />
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Location is approximate — based on IP registration data, not exact physical location.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="h-48 flex items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground text-sm">
                        <div className="text-center">
                          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          Location coordinates not available for this IP
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Network Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-purple-500" />
                      Network Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">ISP</span>
                        <span className="font-medium">{result.ip_data?.ISP || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">ASN</span>
                        <span className="font-mono font-medium">AS{result.ip_data?.ASN || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span className="text-muted-foreground">Country Code</span>
                        <span className="font-semibold">{result.ip_data?.country_code || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-muted-foreground">Abuse Velocity</span>
                        <Badge variant={
                          result.ip_data?.abuse_velocity === 'high' ? 'destructive' :
                          result.ip_data?.abuse_velocity === 'medium' ? 'secondary' : 'default'
                        }>
                          {result.ip_data?.abuse_velocity || 'none'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* What to do */}
            {(tl === 'HIGH' || tl === 'CRITICAL') && (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-500 mb-1">High Risk IP Detected</p>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        {result.ip_data?.tor   && <li>This IP is a Tor exit node — traffic is heavily anonymized</li>}
                        {result.ip_data?.vpn   && <li>VPN detected — user is hiding their real identity</li>}
                        {result.ip_data?.proxy && <li>Proxy server — common in fraud and bot operations</li>}
                        {result.ip_data?.recent_abuse && <li>Recent abuse reports on record — treat with extreme caution</li>}
                        <li>Block or require additional verification before interacting with this IP</li>
                        <li>Report suspicious activity to your ISP or <a href="https://www.abuse.ch" target="_blank" rel="noopener noreferrer" className="underline text-primary">abuse.ch</a></li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}

        {/* Empty state */}
        {!loading && !result && !error && (
          <Card className="py-16">
            <CardContent className="text-center">
              <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-lg font-semibold text-muted-foreground mb-1">Enter an IP Address to Scan</p>
              <p className="text-sm text-muted-foreground">
                Or click <strong>Scan My IP</strong> to analyze your own connection
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
