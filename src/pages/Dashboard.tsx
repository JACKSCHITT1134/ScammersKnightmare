import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Clock, TrendingUp, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { scanner } from '@/lib/scanner';
import { User } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    auth.getCurrentUser()
      .then(setUser)
      .catch(console.error);
  }, []);

  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [totalScans, setTotalScans] = useState(0);
  const [threats, setThreats] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    scanner.getHistory()
      .then((history) => {
        setRecentScans(history.slice(0, 5));
        setTotalScans(history.length);
        setThreats(history.filter((s) => s.threatLevel === 'high' || s.threatLevel === 'critical').length);
        
        // Prepare chart data (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const scansByDay = last7Days.map(date => {
          const count = history.filter(scan => 
            new Date(scan.timestamp).toISOString().split('T')[0] === date
          ).length;
          return { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), scans: count };
        });

        setChartData(scansByDay);
      })
      .catch(console.error);
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Monitor your protection status and recent activity</p>
          </div>
          {user.isAdmin && (
            <Button onClick={() => navigate('/admin')} variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Admin Panel
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">TIER</span>
            </div>
            <p className="text-2xl font-bold capitalize">{user.tier}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">SCANS</span>
            </div>
            <p className="text-2xl font-bold">
              {user.tier === 'free' ? `${user.scansRemaining} left` : 'Unlimited'}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">HISTORY</span>
            </div>
            <p className="text-2xl font-bold">{totalScans}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">THREATS</span>
            </div>
            <p className="text-2xl font-bold">{threats}</p>
          </div>
        </div>

        {/* Activity Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Scan Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="scans" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Auto-Scan Status (Premium) */}
        {(user.tier === 'premium' || user.tier === 'family') && (
          <div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/50 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-6 h-6 text-primary" />
                <div>
                  <h3 className="font-semibold">Automated Monitoring Active</h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time protection enabled for connected accounts
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Button
            size="lg"
            onClick={() => navigate('/scan')}
            className="h-24 text-lg"
          >
            <Shield className="w-6 h-6 mr-3" />
            Start New Scan
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/history')}
            className="h-24 text-lg"
          >
            <Clock className="w-6 h-6 mr-3" />
            View Full History
          </Button>
        </div>

        {/* Recent Scans */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Scans</h2>
          {recentScans.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No scans yet</p>
              <Button onClick={() => navigate('/scan')}>Run Your First Scan</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                  onClick={() => navigate(`/history`)}
                >
                  <div className="flex-1">
                    <p className="font-medium truncate">{scan.input}</p>
                    <p className="text-sm text-muted-foreground">
                      {scan.scanType} • {scan.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    scan.threatLevel === 'safe' ? 'bg-green-500/10 text-green-500' :
                    scan.threatLevel === 'low' ? 'bg-blue-500/10 text-blue-500' :
                    scan.threatLevel === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                    scan.threatLevel === 'high' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {scan.threatLevel.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade CTA (Free Users) */}
        {user.tier === 'free' && (
          <div className="mt-8 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/50 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">Unlock Unlimited Protection</h3>
            <p className="text-muted-foreground mb-6">
              Upgrade to Premium for unlimited scans, history, and automated monitoring
            </p>
            <Button size="lg" onClick={() => navigate('/#pricing')}>
              View Pricing Plans
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
