import { Shield, Link as LinkIcon, Users, Brain, Bell, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Pricing } from '@/components/Pricing';
import { Stats } from '@/components/Stats';
import knightHero from '@/assets/knight.webp';

const features = [
  {
    icon: LinkIcon,
    title: 'Link Sandbox Analysis',
    description: 'Safely analyze suspicious links in an isolated environment. Track redirect chains, detect phishing, and identify malicious content.',
  },
  {
    icon: Users,
    title: 'Predator Detection',
    description: 'AI-powered behavioral analysis identifies grooming patterns, inappropriate messaging, and predatory behavior across social platforms.',
  },
  {
    icon: Brain,
    title: 'Multi-Layer Scanning',
    description: 'Comprehensive analysis of phone numbers, emails, URLs, usernames, and social profiles using advanced threat intelligence.',
  },
  {
    icon: Bell,
    title: 'Automated Monitoring',
    description: 'Premium users get real-time alerts and automated scans for connected accounts, ensuring continuous protection.',
  },
  {
    icon: FileCheck,
    title: 'Detailed Reports',
    description: 'Get comprehensive threat assessments with severity scores, indicators, recommendations, and exportable reports.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your scans are encrypted and private. We never share your data or scanning history with third parties.',
  },
];

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20 -z-10" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary rounded-full px-4 py-2 mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Advanced Threat Detection Platform</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Protect Yourself from{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Online Threats
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Scan phone numbers, emails, URLs, and social profiles for scammers, predators, and malicious content. 
              AI-powered detection with sandbox link analysis and automated monitoring.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={() => navigate('/signin')}>
                Start Free Scan
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/#pricing')}>
                View Pricing
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <a 
                href="/admin/login" 
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Admin Access
              </a>
            </div>
          </div>
          
          {/* Knight Hero Image */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <img 
                src={knightHero} 
                alt="Scammer's Knightmare Guardian" 
                className="relative w-full max-w-md h-auto object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <Stats />

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Comprehensive Protection Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Multi-layer threat detection combining AI analysis, threat intelligence, and behavioral patterns
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Pricing />

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/50 rounded-2xl p-12">
            <h2 className="text-4xl font-bold mb-4">Ready to Stay Protected?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start with a free comprehensive scan. No credit card required.
            </p>
            <Button size="lg" onClick={() => navigate('/signin')} className="text-lg px-8">
              Get Started Now
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
