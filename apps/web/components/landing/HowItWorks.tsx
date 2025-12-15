'use client';

import { Wallet, Users, Building2, Coins, ArrowRight } from 'lucide-react';

const steps = [
  {
    step: 1,
    icon: Wallet,
    title: 'Connect Wallet',
    description: 'Link your Solana wallet (Phantom, Solflare, Ledger) to get started',
    color: 'from-purple-500 to-violet-600',
  },
  {
    step: 2,
    icon: Users,
    title: 'Complete KYC',
    description: 'One-time verification with Civic Pass for compliant investing',
    color: 'from-violet-500 to-indigo-600',
  },
  {
    step: 3,
    icon: Building2,
    title: 'Browse Assets',
    description: 'Explore tokenized real estate, commodities & infrastructure',
    color: 'from-indigo-500 to-blue-600',
  },
  {
    step: 4,
    icon: Coins,
    title: 'Invest & Earn',
    description: 'Purchase tokens and start earning yields immediately',
    color: 'from-blue-500 to-cyan-600',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-radial opacity-30" />
      
      <div className="container relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From wallet connection to your first investment in minutes.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 rounded-full" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ step, icon: Icon, title, description, color }, index) => (
              <div 
                key={step} 
                className="relative text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Step Number */}
                <div className="relative mb-6 group">
                  <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-glow-md transition-all duration-300`}>
                    <Icon className="h-10 w-10 text-white" />
                  </div>
                  <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-sm font-bold shadow-md">
                    {step}
                  </span>
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                
                {/* Arrow (hidden on last item and mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-24 -right-4 transform translate-x-1/2">
                    <ArrowRight className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
