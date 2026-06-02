/**
 * SCAMMER'S KNIGHTMARE — Sub-Hive Control Dashboard
 * Shows live agent status, run multi-agent scans, and Foundry reports.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Brain, Shield, Activity, TrendingUp, Zap, Bot,
  Play, Loader2, CheckCircle2, AlertTriangle, Info,
  Send, Network, Radio, GitBranch, BarChart3, List,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { ScammersKnightmare, AGENT_MANIFEST, type AgentName, type ConsensusResult, type FoundryReport } from '@/lib/scammers-knightmare';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AGENT_COLORS: Record<AgentName, string> = {
  PhishGuard:    'blue',
  PredatorWatch: 'red',
  FraudSentinel: 'yellow',
  LinkTracer:    'green',
};

const AGENT_ICONS: Record<AgentName, typeof Shield> = {
  PhishGuard:    Shield,
  PredatorWatch: Activity,
  FraudSentinel: TrendingUp,
  LinkTracer:    Zap,
};

const SCAN_TYPES = [
  { value: 'url',            label: '🌐 URL / Website' },
  { value: 'email',          label: '📧 Email Address' },
  { value: 'phone',          label: '📞 Phone Number' },
  { value: 'text',           label: '💬 Message / Text' },
  { value: 'ip',             label: '🖥️ IP Address' },
  { value: 'social-profile', label: '👤 Social Profile' },
  { value: 'qr-code',        label: '📷 QR Code Data' },
  { value: 'username',       label: '🔍 Username' },
];

interface AgentState {
  name: AgentName;
  status: 'idle' | 'running' | 'done' | 'error';
  result?: any;
}

function TraitBar({ label, value, color }: { label: string; value: number; color: string }) {
  const width = Math.round(value * 100);
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-500', red: 'bg-red-500',
    yellow: 'bg-yellow-500', green: 'bg-green-500',
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground capitalize w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-secondary rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${bgMap[color] || 'bg-primary'}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">{width}%</span>
    </div>
  );
}

function AgentCard({ name, agentStates, dbData }: {
  name: AgentName;
  agentStates: AgentState[];
  dbData?: any;
}) {
  const manifest = AGENT_MANIFEST[name];
  const color = AGENT_COLORS[name];
  const Icon = AGENT_ICONS[name];
  const state = agentStates.find(a => a.name === name);

  const borderMap: Record<string, string> = {
    blue: 'border-blue-500/40 hover:border-blue-500/70',
    red: 'border-red-500/40 hover:border-red-500/70',
    yellow: 'border-yellow-500/40 hover:border-yellow-500/70',
    green: 'border-green-500/40 hover:border-green-500/70',
  };
  const textMap: Record<string, string> = {
    blue: 'text-blue-500', red: 'text-red-500',
    yellow: 'text-yellow-500', green: 'text-green-500',
  };

  const statusIcon = () => {
    if (!state || state.status === 'idle') return <div className="w-2.5 h-2.5 rounded-full bg-secondary border border-border" />;
    if (state.status === 'running') return <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />;
    if (state.status === 'done') return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    return <AlertTriangle className="w-3 h-3 text-red-500" />;
  };

  const score = state?.result?.threat_score;

  return (
    <Card className={`border-2 transition-all ${borderMap[color]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 border border-${color}-500/30 flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${textMap[color]}`} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {manifest.icon} {name}
                {statusIcon()}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{manifest.role}</p>
            </div>
          </div>
          {score !== undefined && (
            <div className="text-right">
              <div className={`text-2xl font-black ${score >= 70 ? 'text-red-500' : score >= 40 ? 'text-yellow-500' : 'text-green-500'}`}>
                {score}
              </div>
              <div className="text-xs text-muted-foreground">/ 100</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Personality traits */}
        <div className="space-y-1.5">
          {Object.entries(manifest.personality).map(([trait, val]) => (
            <TraitBar key={trait} label={trait} value={val as number} color={color} />
          ))}
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1">
          {manifest.skills.map(s => (
            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
          ))}
        </div>

        {/* Analysis result */}
        {state?.result?.analysis && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Agent Analysis:</p>
            <p className="text-xs leading-relaxed">{state.result.analysis}</p>
            {state.result.flags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {state.result.flags.map((f: string, i: number) => (
                  <Badge key={i} variant="destructive" className="text-[9px]">{f}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DB performance stats */}
        {dbData?.performance_stats?.total_scans > 0 && (
          <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Total Scans</p>
              <p className="font-semibold">{dbData.performance_stats.total_scans}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Success Rate</p>
              <p className="font-semibold">{dbData.performance_stats.success_rate}%</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AgentControl() {
  const [dbAgents, setDbAgents] = useState<any[]>([]);
  const [dbSkills, setDbSkills] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // Live scan state
  const [scanInput, setScanInput] = useState('');
  const [scanType, setScanType] = useState('url');
  const [scanning, setScanning] = useState(false);
  const [agentStates, setAgentStates] = useState<AgentState[]>(
    (Object.keys(AGENT_MANIFEST) as AgentName[]).map(n => ({ name: n, status: 'idle' }))
  );
  const [consensusResult, setConsensusResult] = useState<ConsensusResult | null>(null);
  const [foundryLog, setFoundryLog] = useState<FoundryReport[]>([]);
  const [activeTab, setActiveTab] = useState<'agents' | 'scan' | 'foundry' | 'skills'>('agents');

  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDbData();
  }, []);

  const loadDbData = async () => {
    setLoadingDb(true);
    const [agentsRes, skillsRes] = await Promise.all([
      supabase.from('ai_agent_personalities').select('*').order('agent_name'),
      supabase.from('detection_skills').select('*').order('skill_name'),
    ]);
    if (agentsRes.data) setDbAgents(agentsRes.data);
    if (skillsRes.data) setDbSkills(skillsRes.data);
    setLoadingDb(false);
  };

  const runScan = async () => {
    if (!scanInput.trim()) {
      toast.error('Enter a value to scan');
      return;
    }
    setScanning(true);
    setConsensusResult(null);

    // Animate agents as "running"
    setAgentStates(prev => prev.map(a => ({ ...a, status: 'running', result: undefined })));

    try {
      const result = await ScammersKnightmare.scan(scanInput.trim(), scanType);

      // Update agent states from results
      setAgentStates(prev => prev.map(a => {
        const found = result.allAgents.find(r => r.agent === a.name);
        if (found) {
          return { name: a.name, status: 'done', result: found };
        }
        return { ...a, status: 'idle' };
      }));

      setConsensusResult(result);
      setFoundryLog(ScammersKnightmare.getFoundryLog());

      const style = ScammersKnightmare.constructor as any;
    } catch (err: any) {
      console.error('Scan error:', err);
      toast.error(err.message || 'Scan failed');
      setAgentStates(prev => prev.map(a => ({ ...a, status: 'error' })));
    } finally {
      setScanning(false);
    }
  };

  const resetScan = () => {
    setScanInput('');
    setConsensusResult(null);
    setAgentStates(prev => prev.map(a => ({ ...a, status: 'idle', result: undefined })));
  };

  const getThreatStyle = (label: string) => ScammersKnightmare['buildConsensus'] ? {
    CRITICAL: 'bg-red-500/10 border-red-500/40 text-red-500',
    HIGH: 'bg-orange-500/10 border-orange-500/40 text-orange-500',
    MEDIUM: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-600',
    LOW: 'bg-blue-500/10 border-blue-500/40 text-blue-500',
    SAFE: 'bg-green-500/10 border-green-500/40 text-green-500',
  }[label] || 'bg-gray-500/10 border-gray-500/40 text-gray-500' : '';

  const threatStyle = (label: string) => ({
    CRITICAL: 'bg-red-500/10 border-red-500/40 text-red-500',
    HIGH: 'bg-orange-500/10 border-orange-500/40 text-orange-500',
    MEDIUM: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-600',
    LOW: 'bg-blue-500/10 border-blue-500/40 text-blue-500',
    SAFE: 'bg-green-500/10 border-green-500/40 text-green-500',
  }[label] || 'bg-gray-500/10 border-gray-500/40 text-gray-500');

  const verdictBadge = (label: string) => ({
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-yellow-500 text-black',
    LOW: 'bg-blue-500 text-white',
    SAFE: 'bg-green-500 text-white',
  }[label] || 'bg-gray-500 text-white');

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Network className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  ScammersKnightmare
                  <Badge variant="outline" className="text-xs font-mono">SUB-HIVE v1.0</Badge>
                </h1>
                <p className="text-muted-foreground text-sm">
                  Parent: <span className="font-mono text-primary">AssimilateOrDie-Foundry</span> • 4 Agents • Real-time consensus
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic ml-15 pl-1">
              "{ScammersKnightmare.primeDirective}"
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              ALL AGENTS ONLINE
            </div>
          </div>
        </div>

        {/* ── Tab Nav ── */}
        <div className="flex gap-1 mb-6 bg-secondary/50 p-1 rounded-xl w-fit">
          {[
            { id: 'agents',  label: 'Agents',       icon: Bot },
            { id: 'scan',    label: 'Run Scan',      icon: Radio },
            { id: 'foundry', label: 'Foundry Log',   icon: GitBranch },
            { id: 'skills',  label: 'Skills',        icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── AGENTS TAB ── */}
        {activeTab === 'agents' && (
          <div className="grid md:grid-cols-2 gap-5">
            {(Object.keys(AGENT_MANIFEST) as AgentName[]).map(name => (
              <AgentCard
                key={name}
                name={name}
                agentStates={agentStates}
                dbData={dbAgents.find(a => a.agent_name === name)}
              />
            ))}
          </div>
        )}

        {/* ── SCAN TAB ── */}
        {activeTab === 'scan' && (
          <div className="space-y-5">
            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-primary" />
                  Multi-Agent Scan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <Label>Target</Label>
                    <Input
                      ref={scanInputRef}
                      value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && runScan()}
                      placeholder="Enter URL, email, phone, message, IP..."
                      className="mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label>Scan Type</Label>
                    <Select value={scanType} onValueChange={setScanType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCAN_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={runScan} disabled={scanning || !scanInput.trim()} className="flex-1">
                    {scanning
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running 4 Agents in Parallel…</>
                      : <><Play className="w-4 h-4 mr-2" />Launch Sub-Hive Scan</>}
                  </Button>
                  {consensusResult && (
                    <Button variant="outline" onClick={resetScan}>Reset</Button>
                  )}
                </div>

                {/* Agent progress indicators */}
                {scanning && (
                  <div className="grid grid-cols-4 gap-3 pt-2">
                    {agentStates.map(a => (
                      <div key={a.name} className="text-center">
                        <div className="text-lg mb-1">{AGENT_MANIFEST[a.name].icon}</div>
                        <p className="text-xs font-medium">{a.name}</p>
                        <div className="flex justify-center mt-1">
                          {a.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                          {a.status === 'done' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          {a.status === 'idle' && <div className="w-3 h-3 rounded-full border border-border" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Consensus Result */}
            {consensusResult && (
              <div className="space-y-4">
                {/* Banner */}
                <div className={`border rounded-xl p-5 ${threatStyle(consensusResult.threatLabel)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Shield className="w-8 h-8" />
                      <div>
                        <p className="text-2xl font-black">{consensusResult.verdict}</p>
                        <p className="text-sm opacity-80">
                          Consensus Score: {consensusResult.score}/100 •{' '}
                          Confidence: {Math.round(consensusResult.confidence * 100)}% •{' '}
                          {consensusResult.allAgents.length} agents
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-black">{consensusResult.score}</div>
                      <div className="text-xs opacity-60">/ 100</div>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-current transition-all duration-700"
                      style={{ width: `${consensusResult.score}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm font-medium">{consensusResult.recommendation}</p>
                </div>

                {/* Agent votes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Agent Votes &amp; Analyses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {consensusResult.allAgents.map(agent => (
                      <div key={agent.agent} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{AGENT_MANIFEST[agent.agent as AgentName]?.icon}</span>
                            <span className="font-semibold text-sm">{agent.agent}</span>
                            <span className="text-xs text-muted-foreground">{agent.role}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="bg-secondary rounded-full w-24 h-2">
                              <div
                                className={`h-2 rounded-full ${agent.threat_score >= 70 ? 'bg-red-500' : agent.threat_score >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${agent.threat_score}%` }}
                              />
                            </div>
                            <span className={`font-bold text-sm ${agent.threat_score >= 70 ? 'text-red-500' : agent.threat_score >= 40 ? 'text-yellow-500' : 'text-green-500'}`}>
                              {agent.threat_score}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{agent.analysis}</p>
                        {agent.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {agent.flags.map((f, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">⚑ {f}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ── FOUNDRY LOG TAB ── */}
        {activeTab === 'foundry' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                SUB-HIVE → FOUNDRY Report Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {foundryLog.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No reports sent yet</p>
                  <p className="text-sm mt-1">Run a scan to generate Foundry reports</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {foundryLog.map((report, idx) => (
                    <div key={idx} className="border border-border rounded-lg p-3 font-mono text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-bold">[SUB-HIVE → FOUNDRY]</span>
                          <Badge variant="outline" className="text-[10px]">{report.module}</Badge>
                        </div>
                        <span className="text-muted-foreground text-[10px]">
                          {new Date(report.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate mb-1">Input: {report.input.substring(0, 80)}</p>
                      <div className="flex items-center gap-2">
                        <span>Scan: <span className="text-foreground">{report.scanType}</span></span>
                        <span>•</span>
                        <span>Threat: <span className={`font-bold ${report.threatLevel >= 70 ? 'text-red-500' : report.threatLevel >= 40 ? 'text-yellow-500' : 'text-green-500'}`}>{report.threatLevel}</span></span>
                        <span>•</span>
                        <span>Verdict: <span className="text-foreground">{report.verdict}</span></span>
                        <span>•</span>
                        <span>Agents: <span className="text-foreground">{report.agents.length}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── SKILLS TAB ── */}
        {activeTab === 'skills' && (
          <div className="grid md:grid-cols-3 gap-4">
            {loadingDb ? (
              <div className="col-span-3 text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </div>
            ) : dbSkills.map(skill => (
              <Card key={skill.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold capitalize">{skill.skill_name.replace(/_/g, ' ')}</h3>
                      <Badge variant="outline" className="mt-1 text-xs">{skill.skill_type.replace(/_/g, ' ')}</Badge>
                    </div>
                    <Badge variant={skill.enabled ? 'default' : 'secondary'}>
                      {skill.enabled ? '✓ Active' : '✗ Off'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{skill.description}</p>
                  {skill.config?.patterns?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">{skill.config.patterns.length} patterns loaded</p>
                      <div className="flex flex-wrap gap-1">
                        {skill.config.patterns.slice(0, 4).map((p: string) => (
                          <Badge key={p} variant="outline" className="text-[9px]">{p}</Badge>
                        ))}
                        {skill.config.patterns.length > 4 && (
                          <Badge variant="outline" className="text-[9px]">+{skill.config.patterns.length - 4} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {skill.total_uses > 0 && (
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Uses</p>
                        <p className="font-semibold">{skill.total_uses}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success</p>
                        <p className="font-semibold">{skill.success_rate}%</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
