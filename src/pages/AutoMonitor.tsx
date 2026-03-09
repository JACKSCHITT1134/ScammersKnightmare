import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { Bell, Plus, Trash2, Clock, Mail, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Monitor {
  id: string;
  monitor_type: string;
  target_value: string;
  frequency: string;
  last_scan_at: string | null;
  is_active: boolean;
  notify_on_change: boolean;
  notify_email: boolean;
  last_threat_level: string | null;
  created_at: string;
}

export function AutoMonitor() {
  const [user, setUser] = useState<any>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await auth.getCurrentUser();
    if (!currentUser) {
      navigate('/signin');
      return;
    }

    if (currentUser.tier === 'free') {
      toast.error('Auto-monitoring is a Premium feature');
      navigate('/dashboard');
      return;
    }

    setUser(currentUser);
    loadMonitors();
  };

  const loadMonitors = async () => {
    const { data, error } = await supabase
      .from('auto_monitor_config')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMonitors(data);
    }

    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const { error } = await supabase
      .from('auto_monitor_config')
      .insert({
        user_id: user.id,
        monitor_type: formData.get('type') as string,
        target_value: formData.get('target') as string,
        frequency: formData.get('frequency') as string,
        notify_email: formData.get('notify_email') === 'on',
      });

    if (error) {
      toast.error('Failed to create monitor');
    } else {
      toast.success('Auto-monitor created!');
      setShowForm(false);
      loadMonitors();
    }
  };

  const handleToggle = async (id: string, field: 'is_active' | 'notify_email', currentValue: boolean) => {
    const { error } = await supabase
      .from('auto_monitor_config')
      .update({ [field]: !currentValue })
      .eq('id', id);

    if (!error) {
      toast.success('Monitor updated');
      loadMonitors();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this auto-monitor?')) return;

    const { error } = await supabase
      .from('auto_monitor_config')
      .delete()
      .eq('id', id);

    if (!error) {
      toast.success('Monitor deleted');
      loadMonitors();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
              <Bell className="w-10 h-10 text-primary" />
              Auto-Monitoring
            </h1>
            <p className="text-muted-foreground">
              Set up automated scans with instant notifications
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Monitor
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8 border-primary">
            <CardHeader>
              <CardTitle>Create Auto-Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Scan Type</Label>
                    <Select name="type" required>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="username">Username</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="frequency">Scan Frequency</Label>
                    <Select name="frequency" required>
                      <SelectTrigger id="frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Every Hour</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="target">Target Value</Label>
                  <Input
                    id="target"
                    name="target"
                    placeholder="Email, URL, phone number, or username"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notify_email"
                    name="notify_email"
                    defaultChecked
                    className="rounded"
                  />
                  <Label htmlFor="notify_email" className="cursor-pointer">
                    Send email notifications when threat level changes
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">Create Monitor</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {monitors.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Auto-Monitors Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first auto-monitor to receive alerts when threat levels change
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Monitor
              </Button>
            </Card>
          ) : (
            monitors.map((monitor) => (
              <Card key={monitor.id} className={!monitor.is_active ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-lg">{monitor.target_value}</span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          monitor.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {monitor.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="block font-medium text-foreground">Type</span>
                          {monitor.monitor_type.toUpperCase()}
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">Frequency</span>
                          {monitor.frequency.charAt(0).toUpperCase() + monitor.frequency.slice(1)}
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">Last Scan</span>
                          {monitor.last_scan_at
                            ? new Date(monitor.last_scan_at).toLocaleDateString()
                            : 'Never'}
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">Last Threat</span>
                          {monitor.last_threat_level || 'Unknown'}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Mail className={`w-3 h-3 ${monitor.notify_email ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span>Email Alerts {monitor.notify_email ? 'On' : 'Off'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleToggle(monitor.id, 'is_active', monitor.is_active)}
                        variant={monitor.is_active ? 'default' : 'outline'}
                        size="sm"
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleToggle(monitor.id, 'notify_email', monitor.notify_email)}
                        variant={monitor.notify_email ? 'default' : 'ghost'}
                        size="sm"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(monitor.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
