import { Shield, Users, TrendingUp, Zap } from 'lucide-react';

const stats = [
  { icon: Shield, value: '2.5M+', label: 'Threats Detected' },
  { icon: Users, value: '500K+', label: 'Protected Users' },
  { icon: TrendingUp, value: '99.7%', label: 'Accuracy Rate' },
  { icon: Zap, value: '<2s', label: 'Scan Speed' },
];

export function Stats() {
  return (
    <section className="py-16 px-4 border-y border-border">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="text-center">
                <Icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
