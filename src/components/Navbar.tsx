import { Shield, Menu, X, LogOut, Search, List, Eye, Bot } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import knightLogo from '@/assets/knight.webp';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    auth.getCurrentUser().then(setUser).catch(console.error);
  }, [location]);

  const handleSignOut = async () => {
    await auth.signOut();
    setUser(null);
    navigate('/');
  };

  const navLinks = user
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/scan', label: 'New Scan' },
        { to: '/history', label: 'History' },
        { to: '/ai-chat', label: 'AI Assistant' },
        { to: '/reverse-lookup', label: 'Phone Lookup' },
        { to: '/block-lists', label: 'Block Lists' },
        { to: '/auto-monitor', label: 'Auto Monitor' },
        { to: '/dark-web', label: 'Dark Web' },
        { to: '/social-analyzer', label: 'Social Media' },
        { to: '/agents', label: 'AI Agents' },
        { to: '/subscription', label: 'Subscription' },
        ...(user.isAdmin ? [{ to: '/admin', label: 'Admin Panel' }] : []),
      ]
    : [
        { to: '/#features', label: 'Features' },
        { to: '/#pricing', label: 'Pricing' },
      ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <img src={knightLogo} alt="Knight" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Scammer's Knightmare
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.to ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {user.isAdmin ? '🛡️ ADMIN' : user.tier === 'free' ? `${user.scansRemaining} scans left` : user.tier.toUpperCase()}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button onClick={() => navigate('/signin')} size="sm">
                  Get Started
                </Button>
                <Button onClick={() => navigate('/admin/login')} variant="ghost" size="sm">
                  Admin
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="mt-2 w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <Button onClick={() => navigate('/signin')} size="sm" className="mt-2 w-full">
                Get Started
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
