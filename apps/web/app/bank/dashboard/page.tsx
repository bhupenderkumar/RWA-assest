'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  TrendingUp,
  Users,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  BarChart3,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  PackageOpen,
} from 'lucide-react';
import Link from 'next/link';
import { useAssets } from '@/hooks/useAssets';
import { formatCurrency } from '@/lib/utils';

export default function BankDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const walletState = useWallet();
  
  // Fetch assets from API
  const { data: assetsResponse, isLoading, error } = useAssets();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const publicKey = mounted ? walletState.publicKey : null;
  
  // Calculate stats from real data
  const stats = useMemo(() => {
    const assets = assetsResponse?.data ?? [];
    const totalAssets = assets.length;
    const totalValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);
    const pendingTokenizations = assets.filter(
      (a) => a.tokenizationStatus === 'PENDING_TOKENIZATION'
    ).length;
    const pendingReview = assets.filter(
      (a) => a.tokenizationStatus === 'PENDING_REVIEW'
    ).length;
    const tokenizedAssets = assets.filter((a) => a.tokenizationStatus === 'TOKENIZED').length;
    
    return { totalAssets, totalValue, pendingTokenizations, pendingReview, tokenizedAssets };
  }, [assetsResponse]);
  
  // Get top performing assets (sorted by value)
  const topAssets = useMemo(() => {
    const assets = assetsResponse?.data ?? [];
    return assets
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 4);
  }, [assetsResponse]);

  if (!publicKey) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your authorized bank wallet to access the dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bank Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your tokenized assets and investor relations
          </p>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
          <Button asChild variant="outline">
            <Link href="/bank/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Link>
          </Button>
          <Button asChild>
            <Link href="/bank/assets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Asset
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalAssets}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingTokenizations} pending tokenization
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value Locked</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalValue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.tokenizedAssets} tokenized assets
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokenized Assets</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.tokenizedAssets}</div>
                <p className="text-xs text-muted-foreground">
                  Ready for trading
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.pendingReview}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Review Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Review</CardTitle>
            <CardDescription>Assets awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(assetsResponse?.data ?? [])
                  .filter(a => a.tokenizationStatus === 'PENDING_REVIEW' || a.tokenizationStatus === 'PENDING_TOKENIZATION')
                  .map(asset => (
                    <div key={asset.id} className="flex items-center justify-between gap-4 p-2 border rounded">
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        <span className="text-xs text-muted-foreground">{formatCurrency(asset.totalValue)}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="secondary">{asset.tokenizationStatus.replace('_', ' ')}</Badge>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/bank/assets/${asset.id}`}>Review</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                {((assetsResponse?.data ?? []).filter(a => a.tokenizationStatus === 'PENDING_REVIEW' || a.tokenizationStatus === 'PENDING_TOKENIZATION').length === 0) && (
                  <div className="py-8 text-center text-muted-foreground text-sm">No assets pending review</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Your Assets</CardTitle>
            <CardDescription>Recently added assets</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topAssets.length === 0 ? (
              <div className="py-8 text-center">
                <PackageOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">No assets yet</p>
                <Button asChild size="sm">
                  <Link href="/bank/assets/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Asset
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {topAssets.map((asset, index) => (
                  <div key={asset.id} className="flex items-start gap-4">
                    <div className="rounded-full p-2 bg-muted">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{asset.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatCurrency(asset.totalValue)}</span>
                        <Badge variant={asset.tokenizationStatus === 'TOKENIZED' ? 'default' : 'secondary'}>
                          {asset.tokenizationStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Top Assets by Value</CardTitle>
            <CardDescription>Highest value tokenized assets</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topAssets.length === 0 ? (
              <div className="py-8 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Create assets to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {topAssets.map((asset, index) => (
                  <div key={asset.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{asset.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {asset.assetType.replace('_', ' ').toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(asset.totalValue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {asset.pricePerToken ? `${formatCurrency(asset.pricePerToken)}/token` : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/bank/assets">View All Assets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/bank/assets/new">
                <Plus className="h-6 w-6 mb-2" />
                <span>Create Asset</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/bank/investors">
                <Users className="h-6 w-6 mb-2" />
                <span>Manage Investors</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/bank/assets">
                <Coins className="h-6 w-6 mb-2" />
                <span>View Assets</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/bank/analytics">
                <BarChart3 className="h-6 w-6 mb-2" />
                <span>Analytics</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
