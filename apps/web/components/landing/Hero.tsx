'use client';

import Link from 'next/link';
import { ArrowRight, Building2, Sparkles } from 'lucide-react';
import { GlowButton } from '@/components/shared/GlowButton';
import { useFormattedPlatformStats } from '@/hooks/usePlatformStats';
import { Skeleton } from '@/components/ui/skeleton';

export function Hero() {
  const { stats, isLoading } = useFormattedPlatformStats();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute inset-0 pattern-grid opacity-50" />
      
      {/* Floating Blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-solana-purple/30 rounded-full blur-[100px] animate-blob" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-solana-green/20 rounded-full blur-[120px] animate-blob animation-delay-400" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] animate-blob animation-delay-700" />

      {/* Content */}
      <div className="container relative z-10 py-20 lg:py-32">
        <div className="flex flex-col items-center text-center space-y-8 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="animate-fade-in-down">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Powered by Solana Blockchain</span>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-4 animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Tokenize Real-World Assets on{' '}
              <span className="gradient-text animate-gradient bg-[length:200%_200%]">
                Solana
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Access institutional-grade real estate, commodities, and infrastructure investments 
              through compliant tokenization. Built for banks, designed for investors.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-200">
            <GlowButton asChild size="xl" variant="gradient">
              <Link href="/marketplace">
                Explore Marketplace
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </GlowButton>
            <GlowButton asChild size="xl" variant="outline">
              <Link href="/bank/dashboard">
                <Building2 className="mr-2 h-5 w-5" />
                Bank Portal
              </Link>
            </GlowButton>
          </div>

          {/* Live Stats Ticker */}
          <div className="w-full max-w-4xl mt-12 animate-fade-in-up animation-delay-300">
            <div className="glass-card rounded-2xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  {isLoading ? (
                    <Skeleton className="h-10 w-24 mx-auto mb-1" />
                  ) : (
                    <p className="text-3xl md:text-4xl font-bold gradient-text">{stats.totalValueLocked}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">Total Value Locked</p>
                </div>
                <div className="text-center">
                  {isLoading ? (
                    <Skeleton className="h-10 w-16 mx-auto mb-1" />
                  ) : (
                    <p className="text-3xl md:text-4xl font-bold gradient-text">{stats.totalAssets}+</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">Tokenized Assets</p>
                </div>
                <div className="text-center">
                  {isLoading ? (
                    <Skeleton className="h-10 w-16 mx-auto mb-1" />
                  ) : (
                    <p className="text-3xl md:text-4xl font-bold gradient-text">{stats.verifiedInvestors}+</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">Verified Investors</p>
                </div>
                <div className="text-center">
                  {isLoading ? (
                    <Skeleton className="h-10 w-12 mx-auto mb-1" />
                  ) : (
                    <p className="text-3xl md:text-4xl font-bold gradient-text">{stats.settlementTime}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">Settlement Time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-slow">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
