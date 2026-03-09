import { useState, useEffect } from 'react';
import { Bot, Brain, Shield, Activity, TrendingUp, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Agent {
  id: string;
  agent_name: string;
  agent_type: string;
  personality_traits: any;
  specialization: string;
  active: boolean;
  performance_stats: any;
}

interface Skill {
  id: string;
  skill_name: string;
  skill_type: string;
  description: string;
  enabled: boolean;
  success_rate: number;
  total_uses: number;
}

export function AgentControl() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsRes, skillsRes] = await Promise.all([
        supabase.from('ai_agent_personalities').select('*').order('agent_name'),
        supabase.from('detection_skills').select('*').order('skill_name')
      ]);

      if (agentsRes.data) setAgents(agentsRes.data);
      if (skillsRes.data) setSkills(skillsRes.data);
    } catch (error: any) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'phishing_hunter': return Shield;
      case 'predator_detector': return Activity;
      case 'fraud_analyst': return TrendingUp;
      case 'link_inspector': return Zap;
      default: return Bot;
    }
  };

  const getAgentColor = (type: string) => {
    switch (type) {
      case 'phishing_hunter': return 'text-blue-500 border-blue-500';
      case 'predator_detector': return 'text-red-500 border-red-500';
      case 'fraud_analyst': return 'text-yellow-500 border-yellow-500';
      case 'link_inspector': return 'text-green-500 border-green-500';
      default: return 'text-gray-500 border-gray-500';
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <Brain className="w-10 h-10 text-primary" />
            Multi-Agent Control Center
          </h1>
          <p className="text-muted-foreground">
            Specialized AI agents working together to protect you
          </p>
        </div>

        {/* Agents Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Active Agents</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {agents.map((agent) => {
              const Icon = getAgentIcon(agent.agent_type);
              const colorClass = getAgentColor(agent.agent_type);

              return (
                <Card key={agent.id} className={`border-2 ${colorClass}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-8 h-8 ${colorClass}`} />
                        <div>
                          <CardTitle>{agent.agent_name}</CardTitle>
                          <CardDescription className="mt-1">
                            {agent.specialization}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={agent.active ? 'default' : 'outline'}>
                        {agent.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Personality Traits:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(agent.personality_traits).map(([trait, value]) => (
                            <div key={trait} className="flex items-center gap-2">
                              <div className="flex-1 bg-secondary rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${colorClass.split(' ')[0].replace('text-', 'bg-')}`}
                                  style={{ width: `${(value as number) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground capitalize">
                                {trait}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {agent.performance_stats?.total_scans && (
                        <div className="pt-3 border-t border-border">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Total Scans</p>
                              <p className="font-medium">{agent.performance_stats.total_scans}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Success Rate</p>
                              <p className="font-medium">{agent.performance_stats.success_rate}%</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Skills Grid */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Detection Skills</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <Card key={skill.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold capitalize">
                        {skill.skill_name.replace(/_/g, ' ')}
                      </h3>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {skill.skill_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <Badge variant={skill.enabled ? 'default' : 'outline'}>
                      {skill.enabled ? '✓' : '✗'}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {skill.description}
                  </p>

                  {skill.total_uses > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Uses</p>
                        <p className="font-medium">{skill.total_uses}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success</p>
                        <p className="font-medium">{skill.success_rate}%</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
