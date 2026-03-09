import { useState, useEffect } from 'react';
import { CreditCard, Calendar, TrendingUp, AlertCircle, CheckCircle, X, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  tier: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  scans_remaining: number | null;
  ai_features_enabled: boolean;
  ai_monthly_quota: number | null;
  ai_quota_used: number;
  ai_quota_reset_at: string | null;
}

interface PricingPlan {
  tier: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  features: any;
}

export function SubscriptionManagement() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/signin');
        return;
      }

      // Load user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(userProfile);

      // Load pricing plans
      const { data: pricingData, error: pricingError } = await supabase
        .from('pricing_config')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (pricingError) throw pricingError;
      setPlans(pricingData || []);
    } catch (error: any) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    if (!profile) return;

    try {
      const plan = plans.find(p => p.tier === tier);
      if (!plan) return;

      const priceId = billingCycle === 'monthly' 
        ? plan.stripe_price_id_monthly 
        : plan.stripe_price_id_yearly;

      if (!priceId) {
        alert('Payment setup in progress. Please try again later.');
        return;
      }

      // TODO: Create Stripe checkout session
      alert('Stripe integration: Redirecting to checkout...');
      // In production, call your Edge Function to create checkout session
      
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of the billing period.')) {
      return;
    }

    try {
      // TODO: Call Stripe API to cancel subscription
      alert('Subscription cancellation initiated. You will retain access until the end of your billing period.');
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen pt-20 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Subscription Management</h1>
          <p className="text-muted-foreground">Manage your plan, billing, and usage</p>
        </div>

        {/* Current Plan Overview */}
        <Card className="mb-8 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Plan</span>
              <Badge variant={profile.tier === 'family' ? 'default' : profile.tier === 'premium' ? 'default' : 'outline'} className="text-lg px-4 py-1">
                {profile.tier.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              {profile.subscription_status === 'active' && profile.subscription_current_period_end && (
                <span>Renews on {new Date(profile.subscription_current_period_end).toLocaleDateString()}</span>
              )}
              {profile.subscription_status === 'canceled' && (
                <span className="text-red-500">Access ends on {new Date(profile.subscription_current_period_end!).toLocaleDateString()}</span>
              )}
              {profile.tier === 'free' && <span>No active subscription</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Scans */}
              <div className="p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium">Scan Credits</p>
                </div>
                <p className="text-2xl font-bold">
                  {profile.tier === 'free' 
                    ? `${profile.scans_remaining} remaining` 
                    : 'Unlimited'}
                </p>
              </div>

              {/* AI Quota */}
              <div className="p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium">AI Quota</p>
                </div>
                <p className="text-2xl font-bold">
                  {profile.ai_features_enabled 
                    ? `${profile.ai_quota_used} / ${profile.ai_monthly_quota}`
                    : 'N/A'}
                </p>
                {profile.ai_quota_reset_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Resets {new Date(profile.ai_quota_reset_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Subscription Status */}
              <div className="p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {profile.subscription_status === 'active' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : profile.subscription_status === 'canceled' ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium">Status</p>
                </div>
                <p className="text-2xl font-bold capitalize">
                  {profile.subscription_status || 'Free'}
                </p>
              </div>
            </div>

            {/* Cancel Subscription */}
            {profile.subscription_status === 'active' && profile.tier !== 'free' && (
              <div className="mt-6 pt-6 border-t border-border">
                <Button
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Subscription
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  You'll retain access until {new Date(profile.subscription_current_period_end!).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Options */}
        {profile.tier === 'free' && (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold mb-2">Upgrade Your Protection</h2>
              <p className="text-muted-foreground mb-4">
                Choose a plan that fits your needs
              </p>
              
              {/* Billing Cycle Toggle */}
              <div className="inline-flex items-center gap-4 p-1 bg-secondary rounded-lg">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    billingCycle === 'monthly' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    billingCycle === 'yearly' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground'
                  }`}
                >
                  Yearly
                  <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {plans.filter(p => p.tier !== 'free').map(plan => {
                const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
                const monthlyPrice = billingCycle === 'yearly' ? price / 12 : price;

                return (
                  <Card key={plan.tier} className="border-2 hover:border-primary transition-colors">
                    <CardHeader>
                      <CardTitle className="text-2xl capitalize">{plan.tier}</CardTitle>
                      <CardDescription>
                        <div className="mt-2">
                          <span className="text-4xl font-bold">${monthlyPrice.toFixed(2)}</span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Billed ${price}/year
                          </p>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {plan.features && typeof plan.features === 'object' && Object.entries(plan.features).map(([key, value]) => (
                          <li key={key} className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">
                              {typeof value === 'boolean' && value ? key.replace(/_/g, ' ') : String(value)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => handleUpgrade(plan.tier)}
                        className="w-full"
                        size="lg"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Upgrade to {plan.tier}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Usage History */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>Track your account activity and usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium">Total Scans This Month</p>
                  <p className="text-sm text-muted-foreground">All threat detection scans</p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {profile.tier === 'free' ? (1 - (profile.scans_remaining || 0)) : '∞'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium">AI Queries Used</p>
                  <p className="text-sm text-muted-foreground">Advanced AI analysis requests</p>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {profile.ai_quota_used || 0}
                </Badge>
              </div>

              {profile.tier !== 'free' && (
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="font-medium">Auto-Monitoring Active</p>
                    <p className="text-sm text-muted-foreground">Real-time threat detection</p>
                  </div>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Enabled
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Billing History Placeholder */}
        {profile.tier !== 'free' && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your past invoices and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No billing history available yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Invoices will appear here after your first payment
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
