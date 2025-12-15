'use client';

import { Shield, Coins, TrendingUp, Lock, Zap, Globe } from 'lucide-react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/shared/GlassCard';

const features = [
  {
    icon: Shield,
    title: 'Compliant by Design',
    description: 'Built-in KYC/AML with Civic Pass, SEC-compliant token standards, and regulatory reporting.',
    gradient: 'from-blue-500 to-purple-500',
  },
  {
    icon: Coins,
    title: 'Fractional Ownership',
    description: 'Invest in premium assets with any amount. Tokenization enables true democratization of wealth.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: TrendingUp,
    title: '24/7 Liquidity',
    description: 'Trade tokenized assets anytime on secondary markets. No lock-ups, instant settlement.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Lock,
    title: 'Institutional Security',
    description: 'Bank-grade custody with Anchorage Digital. Multi-sig wallets and cold storage protection.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Zap,
    title: 'Blazing Fast',
    description: 'Built on Solana for 400ms finality and sub-cent transaction costs. Scale without limits.',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Globe,
    title: 'Global Access',
    description: 'Access assets from anywhere in the world. Cross-border investments made simple.',
    gradient: 'from-cyan-500 to-blue-500',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-dots opacity-30" />
      
      <div className="container relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose <span className="gradient-text">Our Platform?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built on Solana for speed and low costs, with enterprise-grade security and compliance.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <GlassCard 
              key={feature.title}
              hover
              glow
              className="group animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <GlassCardHeader>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <GlassCardTitle className="group-hover:gradient-text transition-all duration-300">
                  {feature.title}
                </GlassCardTitle>
                <GlassCardDescription className="text-base">
                  {feature.description}
                </GlassCardDescription>
              </GlassCardHeader>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
