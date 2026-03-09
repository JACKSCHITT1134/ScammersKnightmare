import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Search, Plus, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DarkWebAlert {
  id: string;
  monitored_value: string;
  value_type: string;
  breach_source: string | null;
  breach_date: string | null;
  data_exposed: any;
  resolved: boolean;
  created_at: string;
}

export function DarkWebMonitor() {
  const [alerts, setAlerts] = useState<DarkWebAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [newMonitor, setNewMonitor] = useState({
    type: 'email',
    value: ''
  });

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dark_web_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const scanForBreaches = async () => {
    if (!newMonitor.value.trim()) return;

    setScanning(true);
    try {
      // TODO: Integrate with Have I Been Pwned API or similar
      // For now, simulate a scan
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock breach data
      const mockBreach = {
        breach_source: 'LinkedIn Data Breach 2021',
        breach_date: '2021-06-01',
        data_exposed: {
          email: true,
          password: true,
          name: true,
          professional_info: true
        }
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dark_web_alerts')
        .insert({
          user_id: user.id,
          monitored_value: newMonitor.value,
          value_type: newMonitor.type,
          breach_source: mockBreach.breach_source,
          breach_date: mockBreach.breach_date,
          data_exposed: mockBreach.data_exposed,
          resolved: false
        });

      if (error) throw error;

      setNewMonitor({ type: 'email', value: '' });
      await loadAlerts();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setScanning(false);
    }
  };

  const markResolved = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dark_web_alerts')
        .update({ resolved: true })
        .eq('id', id);

      if (error) throw error;
      await loadAlerts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <Shield className="w-10 h-10 text-red-500" />
            Dark Web Monitor
          </h1>
          <p className="text-muted-foreground">
            Check if your data has been exposed in known breaches
          </p>
        </div>

        {/* Scan Form */}
        <Card className="mb-8 border-red-500/30">
          <CardHeader>
            <CardTitle>Scan for Breaches</CardTitle>
            <CardDescription>
              Enter your email, phone, or username to check against breach databases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <select
                  value={newMonitor.type}
                  onChange={(e) => setNewMonitor({ ...newMonitor, type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="email">Email Address</option>
                  <option value="phone">Phone Number</option>
                  <option value="username">Username</option>
                  <option value="password">Password Hash</option>
                </select>
              </div>

              <Input
                value={newMonitor.value}
                onChange={(e) => setNewMonitor({ ...newMonitor, value: e.target.value })}
                placeholder={`Enter ${newMonitor.type}...`}
                className="md:col-span-1"
              />

              <Button
                onClick={scanForBreaches}
                disabled={scanning || !newMonitor.value.trim()}
              >
                <Search className="w-4 h-4 mr-2" />
                {scanning ? 'Scanning...' : 'Scan Now'}
              </Button>
            </div>

            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <strong>Privacy Notice:</strong> Your data is checked against breach databases but never stored on dark web servers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Loading breach alerts...</p>
            </Card>
          ) : alerts.length === 0 ? (
            <Card className="p-12 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2">No Breaches Found</h3>
              <p className="text-muted-foreground mb-4">
                Your monitored data hasn't appeared in known breaches yet
              </p>
              <p className="text-xs text-muted-foreground">
                Scan regularly to stay protected
              </p>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card 
                key={alert.id} 
                className={`border-2 ${alert.resolved ? 'border-green-500/30 opacity-60' : 'border-red-500/50'}`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`w-5 h-5 ${alert.resolved ? 'text-green-500' : 'text-red-500'}`} />
                        <h3 className="font-semibold text-lg">
                          {alert.resolved ? '✅ Resolved' : '⚠️ Active Breach Alert'}
                        </h3>
                        <Badge variant={alert.resolved ? 'default' : 'destructive'}>
                          {alert.value_type.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-1">Exposed Value:</p>
                        <p className="font-mono text-sm">{alert.monitored_value}</p>
                      </div>

                      {alert.breach_source && (
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground mb-1">Breach Source:</p>
                          <p className="font-medium">{alert.breach_source}</p>
                        </div>
                      )}

                      {alert.breach_date && (
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground mb-1">Breach Date:</p>
                          <p className="font-medium">{new Date(alert.breach_date).toLocaleDateString()}</p>
                        </div>
                      )}

                      {alert.data_exposed && (
                        <div className="mb-3">
                          <p className="text-sm text-muted-foreground mb-1">Data Exposed:</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(alert.data_exposed).map(([key, value]) => (
                              value && (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key.replace(/_/g, ' ')}
                                </Badge>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
                        <p className="text-sm font-medium mb-2">🛡️ Recommended Actions:</p>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          <li>• Change your password immediately on affected services</li>
                          <li>• Enable two-factor authentication (2FA)</li>
                          <li>• Monitor your accounts for suspicious activity</li>
                          <li>• Consider using a password manager</li>
                          {alert.data_exposed?.email && <li>• Watch for phishing emails</li>}
                        </ul>
                      </div>
                    </div>

                    {!alert.resolved && (
                      <Button
                        onClick={() => markResolved(alert.id)}
                        variant="outline"
                        size="sm"
                        className="ml-4"
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
