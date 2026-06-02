import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { 
  Shield, AlertTriangle, Eye, Send, Loader2, 
  Flag, FileText, User, MessageSquare, Camera, Link
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import knightAvatar from '@/assets/knight.webp';

const CONTEXT_OPTIONS = [
  { value: 'social_media_dm', label: 'Social Media DM (Facebook, Instagram, TikTok)' },
  { value: 'dating_app', label: 'Dating App / Tinder / Bumble' },
  { value: 'gaming', label: 'Online Gaming / Discord / Roblox' },
  { value: 'text_message', label: 'Text Message / iMessage' },
  { value: 'email', label: 'Email' },
  { value: 'forum', label: 'Forum / Reddit / Online Community' },
  { value: 'profile_review', label: 'Review a Profile / Bio' },
  { value: 'other', label: 'Other / Unknown Platform' },
];

const EXAMPLE_SCENARIOS = [
  { label: 'Suspicious DM from stranger', text: "Hey, you seem really mature for your age. I feel like we really connect. Can we keep this just between us? I don't think your parents would understand our friendship." },
  { label: 'Gaming chat grooming attempt', text: "You're so good at this game! I want to send you some Robux/V-Bucks as a gift. Can you send me a photo of yourself first so I know you're real? We should move to Discord where we can talk more privately." },
  { label: 'Age deception attempt', text: "I'm actually only 16 too, I just look older in my photos. We have so much in common. Can I get your Snapchat? Let's video chat sometime, just don't tell anyone." },
];

interface ScanResult {
  id: string;
  content: string;
  context: string;
  analysis: string;
  threatLevel: string;
  timestamp: Date;
}

export function PredatorHunter() {
  const [content, setContent] = useState('');
  const [context, setContext] = useState('social_media_dm');
  const [analyzing, setAnalyzing] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [results, setResults] = useState<ScanResult[]>([]);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error('Please enter content to analyze');
      return;
    }

    setAnalyzing(true);
    setStreamingText('');
    setCurrentResult(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to use Predator Hunter');
      navigate('/signin');
      return;
    }

    abortRef.current = new AbortController();

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/operit-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'predator-analyze',
            data: {
              content,
              context: CONTEXT_OPTIONS.find(o => o.value === context)?.label || context,
              streaming: true,
            },
          }),
          signal: abortRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Analysis failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullAnalysis = '';

      if (!reader) throw new Error('No response stream');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullAnalysis += delta;
                setStreamingText(fullAnalysis);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      // Detect threat level from analysis
      const threatLevel = detectThreatLevel(fullAnalysis);

      const result: ScanResult = {
        id: crypto.randomUUID(),
        content,
        context,
        analysis: fullAnalysis,
        threatLevel,
        timestamp: new Date(),
      };

      setCurrentResult(result);
      setResults((prev) => [result, ...prev]);
      setStreamingText('');

      // Save to scan history
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        await supabase.from('scan_history').insert({
          user_id: session.user.id,
          scan_type: 'predator',
          input: content.substring(0, 500),
          threat_level: threatLevel.toLowerCase(),
          score: threatLevel === 'CRITICAL' ? 95 : threatLevel === 'HIGH' ? 75 : threatLevel === 'MEDIUM' ? 50 : 20,
          details: {
            summary: `Predator Hunter analysis - ${threatLevel} threat detected`,
            analysis: fullAnalysis,
            context,
          },
        });
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Analysis error:', error);
        toast.error(error.message || 'Analysis failed');
      }
      setStreamingText('');
    } finally {
      setAnalyzing(false);
      abortRef.current = null;
    }
  };

  const detectThreatLevel = (analysis: string): string => {
    const upper = analysis.toUpperCase();
    if (upper.includes('CRITICAL') || upper.includes('IMMEDIATE DANGER')) return 'CRITICAL';
    if (upper.includes('HIGH')) return 'HIGH';
    if (upper.includes('MEDIUM')) return 'MEDIUM';
    if (upper.includes('LOW')) return 'LOW';
    return 'SAFE';
  };

  const getThreatColor = (level: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-600 text-white',
      HIGH: 'bg-orange-500 text-white',
      MEDIUM: 'bg-yellow-500 text-black',
      LOW: 'bg-blue-500 text-white',
      SAFE: 'bg-green-500 text-white',
    };
    return colors[level] || 'bg-gray-500 text-white';
  };

  const stopAnalysis = () => {
    abortRef.current?.abort();
    setAnalyzing(false);
  };

  const copyReportText = (result: ScanResult) => {
    const report = `PREDATOR HUNTER REPORT
Date: ${result.timestamp.toLocaleString()}
Platform/Context: ${CONTEXT_OPTIONS.find(o => o.value === result.context)?.label || result.context}
Threat Level: ${result.threatLevel}

--- CONTENT ANALYZED ---
${result.content}

--- AI ANALYSIS ---
${result.analysis}`;
    navigator.clipboard.writeText(report);
    toast.success('Report copied to clipboard');
  };

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <img src={knightAvatar} alt="PredatorWatch" className="w-16 h-16 object-contain" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <Eye className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-red-500 flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Predator Hunter
            </h1>
            <p className="text-muted-foreground">
              PredatorWatch AI — Detect grooming, deception & predator tactics in messages and profiles
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <strong className="text-red-500">Protect Children & Vulnerable People.</strong>{' '}
            This tool uses AI to detect predatory behavior patterns. If you believe a child is in immediate danger,
            call 911 or the{' '}
            <a href="https://www.missingkids.org/gethelpnow/cybertipline" target="_blank" rel="noopener noreferrer" className="underline text-red-400">
              NCMEC CyberTipline (1-800-843-5678)
            </a>.
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Analyze Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Platform / Context</Label>
                  <Select value={context} onValueChange={setContext}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTEXT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Content to Analyze</Label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste messages, profile bios, usernames, or any suspicious content here..."
                    className="w-full mt-1 h-40 px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{content.length} characters</p>
                </div>

                <div className="flex gap-2">
                  {analyzing ? (
                    <Button variant="destructive" onClick={stopAnalysis} className="flex-1">
                      ⏹ Stop Analysis
                    </Button>
                  ) : (
                    <Button
                      onClick={handleAnalyze}
                      disabled={!content.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Analyze Threat
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Example Scenarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {EXAMPLE_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.label}
                    onClick={() => setContent(scenario.text)}
                    className="w-full text-left text-xs px-3 py-2 rounded border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <span className="font-medium block">{scenario.label}</span>
                    <span className="text-muted-foreground truncate block">{scenario.text.substring(0, 60)}...</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Resources */}
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-sm">🚔 Reporting Resources</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p><strong>NCMEC CyberTipline:</strong> 1-800-843-5678</p>
                <p><strong>FBI IC3:</strong> ic3.gov</p>
                <p><strong>NCMEC Online:</strong> cybertipline.org</p>
                <p><strong>Emergency:</strong> 911</p>
                <p><strong>Thorn (child safety):</strong> thorn.org</p>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-3">
            {/* Live streaming analysis */}
            {(analyzing || streamingText) && (
              <Card className="mb-4 border-red-500/30 bg-red-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {analyzing && <Loader2 className="w-4 h-4 animate-spin text-red-500" />}
                    <Eye className="w-4 h-4 text-red-500" />
                    PredatorWatch AI Analyzing...
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-background rounded-lg p-4 border border-red-500/20 max-h-96 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {streamingText}
                      {analyzing && <span className="inline-block w-1 h-4 bg-red-500 animate-pulse ml-0.5 align-text-bottom" />}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completed Result */}
            {currentResult && !analyzing && !streamingText && (
              <Card className={`mb-4 border-2 ${
                currentResult.threatLevel === 'CRITICAL' ? 'border-red-600' :
                currentResult.threatLevel === 'HIGH' ? 'border-orange-500' :
                currentResult.threatLevel === 'MEDIUM' ? 'border-yellow-500' :
                'border-green-500'
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Analysis Complete
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getThreatColor(currentResult.threatLevel)}`}>
                        {currentResult.threatLevel}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyReportText(currentResult)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Copy Report
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-background rounded-lg p-4 border border-border max-h-[500px] overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{currentResult.analysis}</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setContent('');
                        setCurrentResult(null);
                      }}
                    >
                      Analyze Another
                    </Button>
                    {(currentResult.threatLevel === 'HIGH' || currentResult.threatLevel === 'CRITICAL') && (
                      <a
                        href="https://www.missingkids.org/gethelpnow/cybertipline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="destructive">
                          <Flag className="w-4 h-4 mr-2" />
                          Report to NCMEC
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {!analyzing && !streamingText && !currentResult && (
              <Card className="h-64 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">PredatorWatch AI Ready</p>
                  <p className="text-sm mt-1">Paste suspicious content to start analysis</p>
                </div>
              </Card>
            )}

            {/* Previous scans */}
            {results.length > 1 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Previous Analyses</h3>
                <div className="space-y-2">
                  {results.slice(1).map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setCurrentResult(r)}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent/30 transition-colors flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{r.content.substring(0, 80)}...</p>
                        <p className="text-xs text-muted-foreground">{r.timestamp.toLocaleTimeString()}</p>
                      </div>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${getThreatColor(r.threatLevel)}`}>
                        {r.threatLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
