import { ScanResult, ThreatLevel } from '@/types';
import { Shield, AlertTriangle, CheckCircle, Info, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ResultsDisplayProps {
  result: ScanResult;
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  const getThreatColor = (level: ThreatLevel) => {
    switch (level) {
      case 'safe':
        return 'text-green-500 bg-green-500/10 border-green-500';
      case 'low':
        return 'text-blue-500 bg-blue-500/10 border-blue-500';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500';
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500';
    }
  };

  const getThreatIcon = (level: ThreatLevel) => {
    switch (level) {
      case 'safe':
        return <CheckCircle className="w-12 h-12" />;
      case 'low':
        return <Info className="w-12 h-12" />;
      case 'medium':
      case 'high':
      case 'critical':
        return <AlertTriangle className="w-12 h-12" />;
      default:
        return <Shield className="w-12 h-12" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Result Card */}
      <Card className={`border-2 ${getThreatColor(result.threatLevel)}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className={`${getThreatColor(result.threatLevel)} flex items-center gap-4`}>
              {getThreatIcon(result.threatLevel)}
              <div>
                <h2 className="text-3xl font-bold">
                  {result.threatLevel.toUpperCase()} RISK
                </h2>
                <p className="text-sm opacity-80">Threat Score: {result.score}/100</p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {result.scanType.toUpperCase()}
            </Badge>
          </div>

          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">Scanned Value:</p>
            <p className="font-mono text-lg break-all">{result.input}</p>
          </div>

          <div className="p-4 bg-secondary/50 rounded-lg">
            <p className="font-medium mb-2">Summary</p>
            <p className="text-sm text-muted-foreground">{result.details.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Decision Details */}
      {result.details.aiDecision && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Knight AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Action</p>
                <Badge 
                  variant={
                    result.details.aiDecision.action === 'block' ? 'destructive' :
                    result.details.aiDecision.action === 'step-up' ? 'default' : 'default'
                  }
                  className="text-base"
                >
                  {result.details.aiDecision.action.toUpperCase()}
                </Badge>
              </div>

              <div className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${result.details.aiDecision.confidence}%` }}
                    />
                  </div>
                  <span className="font-medium">{result.details.aiDecision.confidence}%</span>
                </div>
              </div>

              <div className="p-4 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Fraud Probability</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${result.details.aiDecision.fraudProbability * 100}%` }}
                    />
                  </div>
                  <span className="font-medium">{Math.round(result.details.aiDecision.fraudProbability * 100)}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {result.details.aiDecision.factors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Risk Factors:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.details.aiDecision.factors.map((factor, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {factor.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.details.aiDecision.behavioralDeviation.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Behavioral Anomalies:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.details.aiDecision.behavioralDeviation.map((dev, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-yellow-500/10">
                        {dev.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.details.aiDecision.personalityInfluence.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">AI Personality Influence:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.details.aiDecision.personalityInfluence.map((inf, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-primary/10">
                        {inf.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.details.aiDecision.ipqsValidation && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm font-medium mb-2">✓ IPQS Validation Used</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Fraud Score:</span>{' '}
                      <span className="font-medium">{result.details.aiDecision.ipqsValidation.fraud_score}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Threat Level:</span>{' '}
                      <Badge variant="outline" className="text-xs">
                        {result.details.aiDecision.ipqsValidation.threat_level}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Threat Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Threat Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.details.indicators.map((indicator, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getThreatColor(indicator.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">{indicator.type.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-sm opacity-90">{indicator.description}</p>
                  </div>
                  <Badge variant="outline">{indicator.severity}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle>🛡️ Knight AI Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg whitespace-pre-wrap">{result.details.recommendation}</p>
        </CardContent>
      </Card>

      {/* Link Analysis (if available) */}
      {result.details.linkAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Link Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Final Destination:</p>
                <p className="font-mono text-sm break-all">{result.details.linkAnalysis.finalDestination}</p>
              </div>
              {result.details.linkAnalysis.redirectChain.length > 1 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Redirect Chain:</p>
                  <div className="space-y-1">
                    {result.details.linkAnalysis.redirectChain.map((url, idx) => (
                      <p key={idx} className="font-mono text-xs break-all pl-4 border-l-2 border-muted">
                        {idx + 1}. {url}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
