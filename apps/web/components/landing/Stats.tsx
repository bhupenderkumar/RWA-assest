'use client';

import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { GlassCard } from '@/components/shared/GlassCard';
import { TrendingUp, Users, Building2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformStats } from '@/hooks/usePlatformStats';

export function Stats() {
  const { data, isLoading } = usePlatformStats();

  const stats = [
    {
      value: data?.totalValueLocked ?? 0,
      prefix: '$',
      suffix: '',
      label: 'Total Value Locked',
      icon: TrendingUp,
      color: 'text-emerald-500',
      format: (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : v.toString(),
    },
    {
      value: data?.totalAssets ?? 0,
      suffix: '+',
      label: 'Tokenized Assets',
      icon: Building2,
      color: 'text-blue-500',
    },
    {
      value: data?.verifiedInvestors ?? 0,
      suffix: '+',
      label: 'Verified Investors',
      icon: Users,
      color: 'text-purple-500',
    },
    {
      value: 1,
      prefix: '<',
      suffix: 's',
      label: 'Settlement Time',
      icon: Clock,
      color: 'text-orange-500',
      isStatic: true,
    },
  ];

  return (
    <section className="py-20 bg-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 gradient-primary-soft" />
      
      <div className="container relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ value, prefix, suffix, label, icon: Icon, color, isStatic, format }, index) => (
            <GlassCard 
              key={label}
              hover
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-6 text-center">
                <Icon className={`h-8 w-8 ${color} mx-auto mb-4`} />
                {isLoading ? (
                  <Skeleton className="h-10 w-24 mx-auto mb-2" />
                ) : isStatic ? (
                  <p className="text-4xl font-bold gradient-text">
                    {prefix}{value}{suffix}
                  </p>
                ) : (
                  <p className="text-4xl font-bold gradient-text">
                    {format ? (
                      <>
                        {prefix}
                        {format(value)}
                        {suffix}
                      </>
                    ) : (
                      <AnimatedCounter 
                        end={value} 
                        prefix={prefix} 
                        suffix={suffix}
                        duration={2500}
                        delay={index * 200}
                      />
                    )}
                  </p>
                )}
                <p className="text-muted-foreground mt-2">{label}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
