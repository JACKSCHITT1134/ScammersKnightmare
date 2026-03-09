import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanForm } from '@/components/ScanForm';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { ScanType, ScanResult } from '@/types';
import { scanner } from '@/lib/scanner';
import { auth } from '@/lib/auth';
import { operitAI } from '@/lib/operit-ai';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function Scan() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [aiEnhancement, setAiEnhancement] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [hasAiAccess, setHasAiAccess] = useState(false);

  useEffect(() => {
    auth.getCurrentUser().then(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const access = await operitAI.checkAccess();
          setHasAiAccess(access.enabled && access.features.analysis);
        } catch {
          setHasAiAccess(false);
        }
      }
    }).catch(console.error);
  }, []);

  const handleScan = async (type: ScanType, input: string) => {
    // Check scan limits
    if (user?.tier === 'free' && user.scansRemaining === 0) {
      alert('You have used your free scan. Upgrade to Premium for unlimited scans.');
      navigate('/#pricing');
      return;
    }

    setIsScanning(true);
    setResult(null);

    try {
      const scanResult = await scanner.scan(type, input);
      setResult(scanResult);
      
      // Refresh user data
      const updatedUser = await auth.getCurrentUser();
      setUser(updatedUser);
    } catch (error: any) {
      console.error('Scan failed:', error);
      const message = error.message || 'Scan failed. Please try again.';
      alert(message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleNewScan = () => {
    setResult(null);
    setAiEnhancement(null);
  };

  const handleAiEnhance = async () => {
    if (!result) return;
    
    setEnhancing(true);
    try {
      const enhancement = await operitAI.enhanceScan(result.details, result.scanType);
      setAiEnhancement(enhancement);
    } catch (error: any) {
      console.error('AI enhancement failed:', error);
      alert(error.message || 'AI enhancement failed');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {!result ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">Threat Scanner</h1>
              <p className="text-muted-foreground">
                Analyze suspicious content for scams, predators, and malicious activity
              </p>
              {user?.tier === 'free' && (
                <p className="text-sm text-primary mt-2">
                  Free scans remaining: {user.scansRemaining}
                </p>
              )}
            </div>

            {isScanning ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Analyzing Threat Patterns</h3>
                <p className="text-muted-foreground">
                  Running comprehensive security checks...
                </p>
              </div>
            ) : (
              <ScanForm onScan={handleScan} isScanning={isScanning} />
            )}
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">Scan Results</h1>
              <p className="text-muted-foreground">Comprehensive threat analysis completed</p>
            </div>

            <ResultsDisplay result={result} />

            {/* AI Enhancement Section */}
            {hasAiAccess && (
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">AI-Enhanced Analysis</h3>
                  </div>
                  {!aiEnhancement && (
                    <Button
                      onClick={handleAiEnhance}
                      disabled={enhancing}
                      size="sm"
                    >
                      {enhancing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Get AI Insights
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                {aiEnhancement ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="bg-background/50 rounded-lg p-4 border border-primary/20">
                      <p className="whitespace-pre-wrap text-sm">{aiEnhancement}</p>
                    </div>
                  </div>
                ) : !enhancing ? (
                  <p className="text-sm text-muted-foreground">
                    Click "Get AI Insights" to receive advanced threat analysis and recommendations powered by Operit AI.
                  </p>
                ) : null}
              </Card>
            )}

            <div className="flex justify-center gap-4 mt-8">
              <Button onClick={handleNewScan} size="lg">
                Run Another Scan
              </Button>
              <Button variant="outline" onClick={() => navigate('/history')} size="lg">
                View History
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
