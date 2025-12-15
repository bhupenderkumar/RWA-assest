'use client';

import Link from 'next/link';
import { ArrowRight, Building2, MapPin, TrendingUp, Loader2 } from 'lucide-react';
import { GradientCard } from '@/components/shared/GradientCard';
import { GlowButton } from '@/components/shared/GlowButton';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketplaceAssets } from '@/hooks/useAssets';
import { Asset } from '@/lib/api';

// Asset type to emoji mapping
const assetTypeEmoji: Record<string, string> = {
  'REAL_ESTATE': '🏢',
  'EQUIPMENT': '🏭',
  'RECEIVABLES': '📄',
  'COMMODITIES': '⚡',
  'SECURITIES': '📈',
  'OTHER': '🏛️',
};

// Asset type to display name mapping
const assetTypeDisplay: Record<string, string> = {
  'REAL_ESTATE': 'Real Estate',
  'EQUIPMENT': 'Equipment',
  'RECEIVABLES': 'Receivables',
  'COMMODITIES': 'Commodities',
  'SECURITIES': 'Securities',
  'OTHER': 'Other',
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function AssetCardSkeleton() {
  return (
    <div className="p-6 rounded-xl border bg-card">
      <Skeleton className="h-16 w-16 mb-4" />
      <Skeleton className="h-5 w-20 mb-3" />
      <Skeleton className="h-6 w-48 mb-1" />
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div>
          <Skeleton className="h-4 w-12 mb-1" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

interface AssetCardProps {
  asset: Asset;
  index: number;
}

function AssetCard({ asset, index }: AssetCardProps) {
  // Calculate a mock APY based on asset value (in real app, this would come from the API)
  const mockApy = (8 + (asset.totalValue % 5)).toFixed(1);
  
  // Determine status based on tokenization status
  const getStatus = () => {
    if (asset.tokenizationStatus === 'TOKENIZED' && asset.listingStatus === 'LISTED') {
      return { label: 'Live', variant: 'secondary' as const };
    }
    if (asset.tokenizationStatus === 'PENDING_TOKENIZATION') {
      return { label: 'Coming Soon', variant: 'default' as const };
    }
    return { label: 'New', variant: 'default' as const };
  };

  const status = getStatus();

  return (
    <Link href={`/marketplace/${asset.id}`}>
      <GradientCard
        variant="border"
        hover
        className="animate-fade-in-up group cursor-pointer h-full"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        {/* Asset Image/Icon */}
        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
          {assetTypeEmoji[asset.assetType] || '🏢'}
        </div>
        
        {/* Status Badge */}
        <Badge variant={status.variant} className="mb-3">
          {status.label}
        </Badge>
        
        {/* Asset Info */}
        <h3 className="font-semibold text-lg mb-1 group-hover:gradient-text transition-all duration-300 line-clamp-1">
          {asset.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          {assetTypeDisplay[asset.assetType] || asset.assetType}
        </p>
        
        {/* Bank */}
        {asset.bank && (
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <Building2 className="h-4 w-4 mr-1" />
            {asset.bank.name}
          </div>
        )}
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              APY
            </div>
            <p className="font-semibold text-emerald-500">{mockApy}%</p>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Min.</div>
            <p className="font-semibold">${asset.pricePerToken.toFixed(0)}</p>
          </div>
        </div>
        
        {/* Total Value */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Value</span>
            <span className="font-semibold">{formatCurrency(asset.totalValue)}</span>
          </div>
        </div>
      </GradientCard>
    </Link>
  );
}

export function FeaturedAssets() {
  const { data, isLoading, error } = useMarketplaceAssets({ limit: 4 });
  
  const assets = data?.data || [];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div className="animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Featured <span className="gradient-text">Assets</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Explore institutional-grade tokenized assets with attractive yields.
            </p>
          </div>
          <GlowButton asChild variant="outline" className="animate-fade-in-up animation-delay-200">
            <Link href="/marketplace">
              View All Assets
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </GlowButton>
        </div>

        {/* Asset Cards */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <AssetCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Unable to load assets. Please try again later.</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏗️</div>
            <h3 className="text-xl font-semibold mb-2">No Assets Available Yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to tokenize assets on our platform.
            </p>
            <GlowButton asChild variant="gradient">
              <Link href="/bank/dashboard">
                <Building2 className="mr-2 h-4 w-4" />
                Get Started as a Bank
              </Link>
            </GlowButton>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {assets.map((asset, index) => (
              <AssetCard key={asset.id} asset={asset} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
