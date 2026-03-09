import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { Shield, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Hardcoded admin credentials - simple and reliable
const ADMIN_ACCOUNTS = {
  'JACKSCHITT1134': {
    password: 'Dilligaf1134#',
    email: 'admin@scammersknightmare.com'
  },
  'KRACKERJACK1134': {
    password: 'Dilligaf1134#',
    email: 'backup_admin@scammersknightmare.com'
  }
};

export function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'username' | 'password'>('username');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const upperUsername = username.toUpperCase();
    
    if (!ADMIN_ACCOUNTS[upperUsername as keyof typeof ADMIN_ACCOUNTS]) {
      toast.error('Invalid admin username');
      return;
    }

    // Check if password was already set by checking localStorage
    const savedPassword = localStorage.getItem(`admin_password_${upperUsername}`);
    
    if (!savedPassword) {
      // First time login - go directly to admin dashboard
      performLogin(upperUsername);
    } else {
      // Password is set, ask for it
      setStep('password');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const upperUsername = username.toUpperCase();
    const savedPassword = localStorage.getItem(`admin_password_${upperUsername}`);
    
    if (savedPassword && password !== savedPassword) {
      toast.error('Invalid password');
      setLoading(false);
      return;
    }

    performLogin(upperUsername);
  };

  const performLogin = (user: string) => {
    const adminData = ADMIN_ACCOUNTS[user as keyof typeof ADMIN_ACCOUNTS];
    
    // Store admin session in localStorage (more persistent than sessionStorage)
    const session = {
      username: user,
      email: adminData.email,
      isAdmin: true,
      loginTime: new Date().toISOString()
    };

    try {
      localStorage.setItem('admin_session', JSON.stringify(session));
      localStorage.setItem('admin_username', user);
      localStorage.setItem('admin_email', adminData.email);
      
      console.log('Admin session stored:', session);
      console.log('localStorage check:', localStorage.getItem('admin_session'));
      
      toast.success(`Welcome, ${user}!`);
      
      // Longer delay and force reload to ensure storage is read
      setTimeout(() => {
        window.location.href = '/admin';
      }, 200);
    } catch (error) {
      console.error('Failed to store admin session:', error);
      toast.error('Login failed - storage error');
    }
  };

  if (step === 'password') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md border-primary/20 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Lock className="w-12 h-12 text-primary" />
              </div>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Enter Password
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Welcome back, {username}
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStep('username');
                    setPassword('');
                    setLoading(false);
                  }}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Login'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md border-primary/20 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Shield className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Admin Access
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Scammer's Knightmare Control Panel
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleUsernameSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Admin Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="JACKSCHITT1134 or KRACKERJACK1134"
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                required
                className="font-mono"
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Continue
            </Button>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                First time? Just enter your username to access the admin panel.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
