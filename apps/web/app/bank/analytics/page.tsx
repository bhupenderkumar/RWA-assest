'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  RefreshCw,
  Plus,
  Activity,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAssets } from '@/hooks/useAssets';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('6m');
  
  // Fetch real asset data
  const { data: assetsResponse, isLoading } = useAssets();
  
  // Calculate real stats from assets
  const stats = useMemo(() => {
    const assets = assetsResponse?.data ?? [];
    const totalAssets = assets.length;
    const totalValueLocked = assets.reduce((sum, asset) => sum + asset.totalValue, 0);
    const tokenizedAssets = assets.filter((a) => a.tokenizationStatus === 'TOKENIZED').length;
    const listedAssets = assets.filter((a) => a.listingStatus === 'LISTED').length;
    
    return { 
      totalAssets, 
      totalValueLocked, 
      tokenizedAssets,
      listedAssets,
      // These would come from a real analytics API
      totalInvestors: 0,
      monthlyVolume: 0,
    };
  }, [assetsResponse]);
  
  // Get asset performance data
  const assetPerformance = useMemo(() => {
    const assets = assetsResponse?.data ?? [];
    return assets
      .filter(a => a.tokenizationStatus === 'TOKENIZED')
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
      .map(asset => ({
        name: asset.name,
        type: asset.assetType.toLowerCase().replace('_', ' '),
        tvl: asset.totalValue,
        pricePerToken: asset.pricePerToken,
      }));
  }, [assetsResponse]);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Platform performance and investor insights
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Tabs value={timeRange} onValueChange={setTimeRange}>
            <TabsList>
              <TabsTrigger value="1m">1M</TabsTrigger>
              <TabsTrigger value="3m">3M</TabsTrigger>
              <TabsTrigger value="6m">6M</TabsTrigger>
              <TabsTrigger value="1y">1Y</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value Locked</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalValueLocked)}
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
                  {stats.listedAssets} listed for trading
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokenized Assets</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{stats.tokenizedAssets}</div>
                <p className="text-xs text-muted-foreground">
                  Ready for investment
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listed Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.listedAssets}</div>
                <p className="text-xs text-muted-foreground">
                  Available on marketplace
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* TVL Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Overview</CardTitle>
            <CardDescription>Your tokenized assets</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : stats.totalAssets === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-center">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Assets Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first asset to see analytics
                </p>
                <Button asChild>
                  <Link href="/bank/assets/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Asset
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">{stats.totalAssets}</div>
                  <p className="text-muted-foreground">Total Assets</p>
                  <div className="mt-4 flex gap-4 justify-center">
                    <div>
                      <div className="text-2xl font-semibold text-green-600">{stats.tokenizedAssets}</div>
                      <p className="text-xs text-muted-foreground">Tokenized</p>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-blue-600">{stats.listedAssets}</div>
                      <p className="text-xs text-muted-foreground">Listed</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Value Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Total Value</CardTitle>
            <CardDescription>Combined value of all assets</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : stats.totalValueLocked === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-center">
                <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Value Yet</h3>
                <p className="text-muted-foreground">
                  Add assets to track total value locked
                </p>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {formatCurrency(stats.totalValueLocked)}
                  </div>
                  <p className="text-muted-foreground">Total Value Locked</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Asset Performance Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Asset Performance</CardTitle>
          <CardDescription>Individual asset metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {assetPerformance.length === 0 ? (
            <div className="py-12 text-center">
              <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tokenized assets yet</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Asset</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-right p-4 font-medium">Value</th>
                  <th className="text-right p-4 font-medium">Price per Token</th>
                </tr>
              </thead>
              <tbody>
                {assetPerformance.map((asset, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{asset.name}</td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize">
                        {asset.type}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">{formatCurrency(asset.tvl)}</td>
                    <td className="p-4 text-right">{formatCurrency(asset.pricePerToken)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Investor Distribution by Jurisdiction */}
        <Card>
          <CardHeader>
            <CardTitle>Investors by Region</CardTitle>
            <CardDescription>Geographic distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No investor data yet</p>
            </div>
          </CardContent>
        </Card>

        {/* Investment Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Investment Size</CardTitle>
            <CardDescription>Distribution by amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No investment data yet</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest platform activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
