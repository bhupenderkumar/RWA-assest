'use client';

import { Shield, CheckCircle } from 'lucide-react';

const partners = [
  { name: 'Solana', logo: '◎' },
  { name: 'Civic', logo: '🛡️' },
  { name: 'Securitize', logo: '🔐' },
  { name: 'Anchorage', logo: '⚓' },
  { name: 'Circle', logo: '○' },
  { name: 'Chainlink', logo: '⬡' },
];

const securityBadges = [
  'SOC 2 Type II Certified',
  'Smart Contract Audited',
  'SEC Compliant',
  'Bank-Grade Security',
];

export function Partners() {
  return (
    <section className="py-20 border-y border-border/50 bg-muted/20">
      <div className="container">
        {/* Partners */}
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">
            Trusted by Leading Institutions
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {partners.map((partner) => (
              <div 
                key={partner.name}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">
                  {partner.logo}
                </span>
                <span className="font-semibold text-lg">{partner.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Badges */}
        <div className="flex flex-wrap justify-center items-center gap-4 mt-12 pt-12 border-t border-border/50">
          {securityBadges.map((badge) => (
            <div 
              key={badge}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
            >
              <CheckCircle className="h-4 w-4" />
              {badge}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
