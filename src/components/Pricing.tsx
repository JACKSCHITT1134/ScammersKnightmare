import { Check, DollarSign, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';

const plans = [
  {
    tier: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '1 comprehensive scan',
      'Full threat analysis',
      'Link sandbox analysis',
      'Predator detection',
      'No scan history',
    ],
  },
  {
    tier: 'premium' as const,
    name: 'Premium',
    price: '$19.99',
    period: '/month',
    yearlyPrice: '$199.99',
    popular: true,
    features: [
      'Unlimited scans',
      'Full scan history',
      'Automated monitoring',
      'Real-time alerts',
      'Priority support',
      'Export reports',
    ],
  },
  {
    tier: 'family' as const,
    name: 'Family',
    price: '$39.99',
    period: '/month',
    yearlyPrice: '$399.99',
    features: [
      'All Premium features',
      'Up to 5 family members',
      'Shared monitoring dashboard',
      'Parental controls',
      'Child safety alerts',
      'Family activity reports',
    ],
  },
];

export function Pricing() {
  const navigate = useNavigate();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const generatePaymentLink = (tier: string, period: 'monthly' | 'yearly') => {
    const plan = plans.find(p => p.tier === tier);
    if (!plan || plan.tier === 'free') return '';
    
    const amount = period === 'yearly' ? plan.yearlyPrice : plan.price;
    const note = `${plan.name} ${period === 'yearly' ? 'Yearly' : 'Monthly'} - Please include your email`;
    
    return `https://cash.app/$JACKSCHITT1134/${amount?.replace('$', '')}`;
  };

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Choose Your Protection Plan</h2>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you need comprehensive monitoring
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative bg-card border rounded-lg p-8 ${
                plan.popular ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">{plan.period}</span>
                </div>
                {plan.yearlyPrice && (
                  <p className="text-sm text-muted-foreground">
                    or {plan.yearlyPrice}/year (save 17%)
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.tier === 'free' ? (
                <Button
                  onClick={() => navigate('/signin')}
                  variant="outline"
                  className="w-full"
                >
                  Get Started
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      const link = generatePaymentLink(plan.tier, 'monthly');
                      window.open(link, '_blank');
                    }}
                    variant={plan.popular ? 'default' : 'outline'}
                    className="w-full"
                  >
                    Pay Monthly via CashApp
                  </Button>
                  <Button
                    onClick={() => {
                      const link = generatePaymentLink(plan.tier, 'yearly');
                      window.open(link, '_blank');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Pay Yearly (Save 17%)
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CashApp Payment Instructions */}
        <Card className="max-w-3xl mx-auto mt-12 bg-primary/5 border-primary">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5" />
              CashApp Payment Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Send payment to our CashApp:
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="inline-block bg-background border-2 border-primary rounded-lg px-8 py-4">
                  <span className="text-3xl font-bold text-primary">$JACKSCHITT1134</span>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard('$JACKSCHITT1134')}
                  title="Copy cash tag"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-background rounded-lg p-6 space-y-4">
              <h4 className="font-semibold text-lg">How it works:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Click the "Pay via CashApp" button for your chosen plan above</li>
                <li>You'll be directed to CashApp with the correct amount pre-filled</li>
                <li><strong className="text-foreground">IMPORTANT:</strong> Include your registered email address in the payment note</li>
                <li>Your account will be upgraded within 24 hours after payment verification</li>
              </ol>
            </div>

            <div className="bg-accent/10 border border-accent rounded-lg p-4">
              <p className="text-sm text-center">
                <strong>Need immediate activation?</strong> After payment, email a screenshot to{' '}
                <a href="mailto:jackschitt1134@gmail.com" className="text-primary hover:underline">
                  jackschitt1134@gmail.com
                </a>
                {' '}for same-day activation.
              </p>
            </div>

            <div className="text-center">
              <Button
                onClick={() => {
                  const shareText = `Pay for Scammer's Knightmare Protection:\n\nCashApp: $JACKSCHITT1134\n\nPremium: $19.99/month or $199.99/year\nFamily: $39.99/month or $399.99/year\n\nInclude your email in the payment note!`;
                  if (navigator.share) {
                    navigator.share({ text: shareText });
                  } else {
                    copyToClipboard(shareText);
                  }
                }}
                variant="outline"
              >
                Share Payment Info
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shareable Payment Links for Admin */}
        <Card className="max-w-3xl mx-auto mt-8 bg-secondary/30 border-secondary">
          <CardHeader>
            <CardTitle className="text-center text-lg">Quick Payment Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plans.filter(p => p.tier !== 'free').map(plan => (
              <div key={plan.tier} className="space-y-2">
                <h4 className="font-semibold text-sm">{plan.name} Plan:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background border rounded px-3 py-2 text-xs truncate">
                      {generatePaymentLink(plan.tier, 'monthly')}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatePaymentLink(plan.tier, 'monthly'))}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background border rounded px-3 py-2 text-xs truncate">
                      {generatePaymentLink(plan.tier, 'yearly')}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatePaymentLink(plan.tier, 'yearly'))}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
