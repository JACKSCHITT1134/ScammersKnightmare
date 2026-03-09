import { useState, useEffect } from 'react';
import { scanner } from '@/lib/scanner';
import { auth } from '@/lib/auth';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { Button } from '@/components/ui/button';
import { Shield, Trash2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function History() {
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    auth.getCurrentUser().then(setUser).catch(console.error);
    scanner.getHistory().then(setHistory).catch(console.error);
  }, []);

  const selectedResult = history.find((s) => s.id === selectedScan);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all scan history?')) {
      scanner.clearHistory()
        .then(() => setHistory([]))
        .catch(console.error);
    }
  };

  // Free users can't access history
  if (user?.tier === 'free') {
    return (
      <div className="min-h-screen pt-20 px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h1 className="text-4xl font-bold mb-4">Scan History Locked</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Upgrade to Premium or Family plan to access your scan history and see detailed threat reports.
          </p>
          <Button size="lg" onClick={() => navigate('/#pricing')}>
            View Pricing Plans
          </Button>
        </div>
      </div>
    );
  }

  if (selectedResult) {
    return (
      <div className="min-h-screen pt-20 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Button variant="outline" onClick={() => setSelectedScan(null)}>
              ← Back to History
            </Button>
          </div>
          <ResultsDisplay result={selectedResult} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Scan History</h1>
            <p className="text-muted-foreground">View all your previous threat scans</p>
          </div>
          {history.length > 0 && (
            <Button variant="destructive" onClick={handleClearHistory} size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Scan History</h3>
            <p className="text-muted-foreground mb-6">Run your first scan to see results here</p>
            <Button onClick={() => navigate('/scan')}>Start Scanning</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((scan) => (
              <div
                key={scan.id}
                onClick={() => setSelectedScan(scan.id)}
                className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1 bg-secondary rounded">
                        {scan.scanType}
                      </span>
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        scan.threatLevel === 'safe' ? 'bg-green-500/10 text-green-500' :
                        scan.threatLevel === 'low' ? 'bg-blue-500/10 text-blue-500' :
                        scan.threatLevel === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                        scan.threatLevel === 'high' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {scan.threatLevel.toUpperCase()}
                      </span>
                    </div>
                    <p className="font-mono text-lg mb-2 break-all">{scan.input}</p>
                    <p className="text-sm text-muted-foreground">{scan.details.summary}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold">{scan.score}</p>
                    <p className="text-xs text-muted-foreground">Threat Score</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {scan.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {scan.details.indicators.length} indicators analyzed
                  </p>
                  <Button variant="ghost" size="sm">
                    View Full Report →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
