
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import { 
  Users, 
  Activity, 
  Shield, 
  Trash2, 
  Edit, 
  TrendingUp,
  BarChart3,
  AlertTriangle,
  DollarSign,
  Copy,
  CheckCircle,
  Lock,
  Key,
  Sparkles,
  Brain,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  tier: string;
  scans_remaining: number | null;
  auto_scan_enabled: boolean;
  is_admin: boolean;
  created_at: string;
  ai_features_enabled?: boolean;
  ai_chat_enabled?: boolean;
  ai_analysis_enabled?: boolean;
  ai_monthly_quota?: number | null;
  ai_quota_used?: number;
}

interface QuotaData {
  date: string;
  total_calls: number;
  ip_scans: number;
  email_scans: number;
  url_scans: number;
  phone_scans: number;
}

interface ScanStats {
  total: number;
  byType: { name: string; value: number }[];
  byThreat: { name: string; value: number }[];
}

const THREAT_COLORS = {
  safe: '#10b981',
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626'
};

export function Admin() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [stats, setStats] = useState<ScanStats>({ total: 0, byType: [], byThreat: [] });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [editTier, setEditTier] = useState<string>('');
  const [editScans, setEditScans] = useState<string>('');
  const [aiUsageStats, setAiUsageStats] = useState<any>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    username: '',
    tier: 'free',
    scans_remaining: ''
  });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    console.log('Checking admin access...');
    console.log('localStorage admin_session:', localStorage.getItem('admin_session'));
    
    const currentUser = await auth.getCurrentUser();
    console.log('Current user:', currentUser);
    
    if (!currentUser?.isAdmin) {
      console.log('Not admin, redirecting to home');
      navigate('/');
      return;
    }
    
    console.log('Admin access granted');
    setUser(currentUser);
    
    // Check if admin has set password (check localStorage)
    const adminUsername = localStorage.getItem('admin_username');
    if (adminUsername) {
      const savedPassword = localStorage.getItem(`admin_password_${adminUsername}`);
      setHasPassword(!!savedPassword);
    }
    
    loadData();
  };

  const loadData = async () => {
    // Load all users with AI features
    const { data: usersData } = await supabase
      .from('user_profiles')
      .select('*, ai_features_enabled, ai_chat_enabled, ai_analysis_enabled, ai_monthly_quota, ai_quota_used')
      .order('created_at', { ascending: false });

    if (usersData) setUsers(usersData);

    // Load AI usage statistics
    const { data: aiUsage } = await supabase
      .from('ai_usage_log')
      .select('feature_type, total_tokens, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (aiUsage) {
      const stats = {
        totalRequests: aiUsage.length,
        totalTokens: aiUsage.reduce((sum, log) => sum + (log.total_tokens || 0), 0),
        byFeature: aiUsage.reduce((acc: any, log) => {
          acc[log.feature_type] = (acc[log.feature_type] || 0) + 1;
          return acc;
        }, {}),
      };
      setAiUsageStats(stats);
    }

    // Load today's quota
    const today = new Date().toISOString().split('T')[0];
    const { data: quotaData } = await supabase
      .from('api_quota')
      .select('*')
      .eq('date', today)
      .single();

    setQuota(quotaData);

    // Load scan statistics
    const { data: scans } = await supabase
      .from('scan_history')
      .select('scan_type, threat_level');

    if (scans) {
      const typeCount: Record<string, number> = {};
      const threatCount: Record<string, number> = {};

      scans.forEach(scan => {
        typeCount[scan.scan_type] = (typeCount[scan.scan_type] || 0) + 1;
        threatCount[scan.threat_level] = (threatCount[scan.threat_level] || 0) + 1;
      });

      setStats({
        total: scans.length,
        byType: Object.entries(typeCount).map(([name, value]) => ({ name, value })),
        byThreat: Object.entries(threatCount).map(([name, value]) => ({ name, value }))
      });
    }
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (!error) {
      // Log admin activity
      await supabase.from('admin_activity_log').insert({
        admin_id: user?.id,
        action: 'manual_tier_activation',
        target_user_id: userId,
        details: updates
      });

      toast.success('User updated successfully!');
      loadData();
    } else {
      toast.error('Failed to update user');
    }
  };

  const handleToggleAIFeature = async (userId: string, field: string, currentValue: boolean) => {
    const updates: any = { [field]: !currentValue };
    await handleUpdateUser(userId, updates);
  };

  const handleUpdateAIQuota = async (userId: string, quota: number | null) => {
    const updates: any = { ai_monthly_quota: quota };
    await handleUpdateUser(userId, updates);
  };

  const handleManualActivation = async (userEmail: string, tier: string, period: string) => {
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError || !targetUser) {
      toast.error('User not found with that email');
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        tier,
        scans_remaining: null // unlimited
      })
      .eq('id', targetUser.id);

    if (!error) {
      // Log admin activity (skip if admin_id is 'admin' from session)
      if (user?.id !== 'admin') {
        await supabase.from('admin_activity_log').insert({
          admin_id: user?.id,
          action: 'cashapp_manual_activation',
          target_user_id: targetUser.id,
          details: { tier, period, payment_method: 'cashapp' }
        });
      }

      toast.success(`${userEmail} upgraded to ${tier} (${period})`);
      loadData();
    } else {
      console.error('Activation error:', error);
      toast.error('Failed to activate subscription');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.username) {
      toast.error('Email, password, and username are required');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_manual_user', {
        p_email: newUser.email,
        p_password: newUser.password,
        p_username: newUser.username,
        p_tier: newUser.tier,
        p_scans_remaining: newUser.scans_remaining ? parseInt(newUser.scans_remaining) : null
      });

      if (error) throw error;

      // Log admin activity
      if (user?.id && user?.id !== 'admin') {
        await supabase.from('admin_activity_log').insert({
          admin_id: user.id,
          action: 'manual_user_creation',
          target_user_id: data.user_id,
          details: {
            email: newUser.email,
            tier: newUser.tier,
            created_by_admin: true
          }
        });
      }

      toast.success(`User ${newUser.email} created successfully!`);
      setShowCreateUser(false);
      setNewUser({
        email: '',
        password: '',
        username: '',
        tier: 'free',
        scans_remaining: ''
      });
      loadData();
    } catch (error: any) {
      console.error('User creation error:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const copyPaymentLink = (tier: string, period: string) => {
    const prices: Record<string, { monthly: string; yearly: string }> = {
      premium: { monthly: '19.99', yearly: '199.99' },
      family: { monthly: '39.99', yearly: '399.99' }
    };

    const amount = prices[tier]?.[period as 'monthly' | 'yearly'];
    if (!amount) return;

    const link = `https://cash.app/$JACKSCHITT1134/${amount}`;
    navigator.clipboard.writeText(link);
    toast.success('Payment link copied!');
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user and all their data?')) return;

    // Delete from auth.users (cascade will handle user_profiles and scan_history)
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (!error) {
      loadData();
    } else {
      alert('Delete failed. This requires service role permissions.');
    }
  };

  const handleSetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const adminUsername = localStorage.getItem('admin_username');
    if (!adminUsername) {
      toast.error('Admin session not found');
      return;
    }

    // Store password in localStorage
    localStorage.setItem(`admin_password_${adminUsername}`, newPassword);
    
    toast.success(hasPassword ? 'Password changed successfully!' : 'Password set successfully!');
    setHasPassword(true);
    setShowPasswordForm(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  const quotaData = quota ? [
    { name: 'IP', value: quota.ip_scans || 0 },
    { name: 'Email', value: quota.email_scans || 0 },
    { name: 'URL', value: quota.url_scans || 0 },
    { name: 'Phone', value: quota.phone_scans || 0 },
  ] : [];

  return (
    <div className="min-h-screen pt-20 px-4 py-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">System management and analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              variant="outline"
              size="sm"
            >
              <Lock className="w-4 h-4 mr-2" />
              {hasPassword ? 'Change Password' : 'Set Password'}
            </Button>
            <Shield className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Password Management Card */}
        {showPasswordForm && (
          <Card className="mb-8 bg-accent/5 border-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {hasPassword ? 'Change Admin Password' : 'Set Admin Password'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-4">
                {!hasPassword && (
                  <div className="bg-primary/10 border border-primary rounded-lg p-4 mb-4">
                    <p className="text-sm">
                      <strong>First time setup:</strong> Set a password to secure your admin account. 
                      You'll need this password along with your username for future logins.
                    </p>
                  </div>
                )}
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password (min 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSetPassword}>
                    {hasPassword ? 'Update Password' : 'Set Password'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's API Calls</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quota?.total_calls || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.tier !== 'free').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create New User */}
        <Card className="mb-8 bg-green-500/5 border-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Create New User
              </CardTitle>
              <Button
                onClick={() => setShowCreateUser(!showCreateUser)}
                variant="outline"
                size="sm"
              >
                {showCreateUser ? 'Close' : 'Add User'}
              </Button>
            </div>
          </CardHeader>
          {showCreateUser && (
            <CardContent>
              <div className="bg-background rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Create a new user manually with any tier. No payment required - perfect for giving access to family, friends, or testers.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-user-email">Email Address*</Label>
                    <Input
                      id="new-user-email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-user-username">Username*</Label>
                    <Input
                      id="new-user-username"
                      placeholder="johndoe"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-user-password">Password*</Label>
                    <Input
                      id="new-user-password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-user-tier">Account Tier*</Label>
                    <Select 
                      value={newUser.tier} 
                      onValueChange={(val) => setNewUser({ ...newUser, tier: val })}
                    >
                      <SelectTrigger id="new-user-tier">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free (Limited Scans)</SelectItem>
                        <SelectItem value="premium">Premium (Unlimited + AI)</SelectItem>
                        <SelectItem value="family">Family (All Features)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newUser.tier === 'free' && (
                    <div>
                      <Label htmlFor="new-user-scans">Free Scans (default: 1)</Label>
                      <Input
                        id="new-user-scans"
                        type="number"
                        placeholder="1"
                        value={newUser.scans_remaining}
                        onChange={(e) => setNewUser({ ...newUser, scans_remaining: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    onClick={handleCreateUser} 
                    disabled={creating || !newUser.email || !newUser.password || !newUser.username}
                  >
                    {creating ? 'Creating...' : 'Create User'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateUser(false);
                      setNewUser({
                        email: '',
                        password: '',
                        username: '',
                        tier: 'free',
                        scans_remaining: ''
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="mt-4 p-3 bg-primary/10 border border-primary rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> Created users can log in immediately with the email and password you set. 
                    Premium/Family users get unlimited scans and full AI features automatically.
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Analytics Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Scans by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.byType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Threat Level Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.byThreat}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.byThreat.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={THREAT_COLORS[entry.name as keyof typeof THREAT_COLORS] || '#888'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Today's Quota Breakdown */}
        {quota && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Today's API Usage by Scan Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={quotaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* CashApp Payment Activation */}
        <Card className="mb-8 bg-primary/5 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Manual CashApp Payment Activation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-background rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-lg mb-2">CashApp: $JACKSCHITT1134</h4>
                  <p className="text-sm text-muted-foreground">
                    Share these payment links with customers
                  </p>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText('$JACKSCHITT1134');
                    toast.success('Cash tag copied!');
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Tag
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Premium Plan Links:</h5>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <code className="flex-1 bg-secondary px-3 py-2 rounded text-xs truncate">
                        https://cash.app/$JACKSCHITT1134/19.99
                      </code>
                      <Button
                        onClick={() => copyPaymentLink('premium', 'monthly')}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-secondary px-3 py-2 rounded text-xs truncate">
                        https://cash.app/$JACKSCHITT1134/199.99
                      </code>
                      <Button
                        onClick={() => copyPaymentLink('premium', 'yearly')}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Family Plan Links:</h5>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <code className="flex-1 bg-secondary px-3 py-2 rounded text-xs truncate">
                        https://cash.app/$JACKSCHITT1134/39.99
                      </code>
                      <Button
                        onClick={() => copyPaymentLink('family', 'monthly')}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-secondary px-3 py-2 rounded text-xs truncate">
                        https://cash.app/$JACKSCHITT1134/399.99
                      </code>
                      <Button
                        onClick={() => copyPaymentLink('family', 'yearly')}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-background rounded-lg p-6">
              <h4 className="font-semibold mb-4">Activate User After Payment</h4>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const email = formData.get('email') as string;
                  const tier = formData.get('tier') as string;
                  const period = formData.get('period') as string;
                  handleManualActivation(email, tier, period);
                  e.currentTarget.reset();
                }}
                className="space-y-4"
              >
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="activation-email">Customer Email</Label>
                    <Input
                      id="activation-email"
                      name="email"
                      type="email"
                      placeholder="customer@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="activation-tier">Plan Tier</Label>
                    <Select name="tier" required>
                      <SelectTrigger id="activation-tier">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="activation-period">Billing Period</Label>
                    <Select name="period" required>
                      <SelectTrigger id="activation-period">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full md:w-auto">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate Subscription
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* AI Features Management */}
        <Card className="mb-8 bg-accent/10 border-accent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Operit AI Features Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {aiUsageStats && (
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total AI Requests (30d)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiUsageStats.totalRequests}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiUsageStats.totalTokens.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active AI Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users.filter(u => u.ai_features_enabled).length}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="bg-background rounded-lg p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                User AI Access Control
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Enable or disable AI features for individual users and set monthly usage quotas.
              </p>
              
              <div className="space-y-3">
                {users.filter(u => !u.is_admin).map((u) => (
                  <div key={u.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{u.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.tier.toUpperCase()} • AI Quota: {u.ai_quota_used || 0} / {u.ai_monthly_quota || '∞'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleToggleAIFeature(u.id, 'ai_features_enabled', u.ai_features_enabled || false)}
                          variant={u.ai_features_enabled ? 'default' : 'outline'}
                          size="sm"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          {u.ai_features_enabled ? 'Enabled' : 'Disabled'}
                        </Button>
                      </div>
                    </div>

                    {u.ai_features_enabled && (
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={u.ai_chat_enabled || false}
                            onChange={() => handleToggleAIFeature(u.id, 'ai_chat_enabled', u.ai_chat_enabled || false)}
                            className="rounded"
                          />
                          <label className="text-sm flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            AI Chat
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={u.ai_analysis_enabled || false}
                            onChange={() => handleToggleAIFeature(u.id, 'ai_analysis_enabled', u.ai_analysis_enabled || false)}
                            className="rounded"
                          />
                          <label className="text-sm flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            AI Analysis
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Monthly quota"
                            defaultValue={u.ai_monthly_quota || ''}
                            onBlur={(e) => {
                              const val = e.target.value ? parseInt(e.target.value) : null;
                              if (val !== u.ai_monthly_quota) {
                                handleUpdateAIQuota(u.id, val);
                              }
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((u) => (
                <div key={u.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{u.email}</h3>
                        {u.is_admin && (
                          <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="block font-medium text-foreground">Tier</span>
                          {u.tier.toUpperCase()}
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">Scans Left</span>
                          {u.scans_remaining ?? '∞'}
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">Auto-Scan</span>
                          {u.auto_scan_enabled ? 'Enabled' : 'Disabled'}
                        </div>
                        <div>
                          <span className="block font-medium text-foreground">Joined</span>
                          {new Date(u.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {selectedUser === u.id && (
                        <div className="mt-4 p-4 bg-accent/20 border border-primary rounded-lg">
                          <h4 className="font-semibold text-sm mb-3 text-primary">Edit User Settings</h4>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <Label>Change Tier</Label>
                              <Select value={editTier} onValueChange={(val) => {
                                console.log('Tier changed to:', val);
                                setEditTier(val);
                              }}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tier" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                  <SelectItem value="family">Family</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Set Scans (empty = unlimited)</Label>
                              <Input
                                type="number"
                                value={editScans}
                                onChange={(e) => {
                                  console.log('Scans changed to:', e.target.value);
                                  setEditScans(e.target.value);
                                }}
                                placeholder="Leave empty for unlimited"
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <Button onClick={() => {
                                const updates: any = {};
                                if (editTier) updates.tier = editTier;
                                if (editScans) updates.scans_remaining = parseInt(editScans);
                                else if (editTier) updates.scans_remaining = null; // unlimited
                                console.log('Saving updates:', updates);
                                handleUpdateUser(u.id, updates);
                                setSelectedUser(null);
                                setEditTier('');
                                setEditScans('');
                              }} size="sm" disabled={!editTier && !editScans}>
                                Save Changes
                              </Button>
                              <Button 
                                onClick={() => {
                                  console.log('Cancelling edit');
                                  setSelectedUser(null);
                                  setEditTier('');
                                  setEditScans('');
                                }} 
                                variant="outline" 
                                size="sm"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!u.is_admin && (
                        <>
                          <Button
                            onClick={() => {
                              console.log('Edit clicked for user:', u.id, 'Current selectedUser:', selectedUser);
                              setSelectedUser(selectedUser === u.id ? null : u.id);
                            }}
                            variant={selectedUser === u.id ? 'default' : 'ghost'}
                            size="sm"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            {selectedUser === u.id ? 'Close' : 'Edit'}
                          </Button>
                          <Button
                            onClick={() => handleDeleteUser(u.id)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
