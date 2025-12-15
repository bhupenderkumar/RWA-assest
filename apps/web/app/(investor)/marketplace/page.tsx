'use client';

import { useState, useMemo } from 'react';
import { useMarketplaceAssets } from '@/hooks/useAssets';
import { AssetGrid } from '@/components/asset/AssetGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { AssetType } from '@/lib/api';

const assetTypes: { value: string; label: string }[] = [
  { value: 'all', label: 'All Assets' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'COMMODITIES', label: 'Commodities' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'RECEIVABLES', label: 'Receivables' },
  { value: 'SECURITIES', label: 'Securities' },
];

export default function MarketplacePage() {
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch marketplace assets (public endpoint, no auth required)
  const { data: assetsResponse, isLoading, error } = useMarketplaceAssets(
    selectedType === 'all'
      ? undefined
      : { type: selectedType as AssetType }
  );

  // Extract assets from paginated response
  const assets = useMemo(() => {
    return assetsResponse?.data ?? [];
  }, [assetsResponse]);

  // Filter by search query
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    
    const query = searchQuery.toLowerCase();
    return assets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(query) ||
        asset.description.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  // Calculate marketplace stats
  const stats = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0);
    const totalAssets = assets.length;
    return { totalValue, totalAssets };
  }, [assets]);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Asset Marketplace</h1>
        <p className="text-muted-foreground">
          Discover and invest in tokenized real-world assets
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Market Value</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-lg font-bold">
                    ${stats.totalValue.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <SlidersHorizontal className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Listed Assets</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-lg font-bold">{stats.totalAssets}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Asset Type Tabs */}
      <Tabs value={selectedType} onValueChange={setSelectedType} className="mb-8">
        <TabsList className="flex-wrap h-auto gap-2">
          {assetTypes.map((type) => (
            <TabsTrigger key={type.value} value={type.value}>
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Error State */}
      {error && (
        <Card className="mb-8">
          <CardContent className="py-8 text-center text-destructive">
            <p>Failed to load assets. Please try again.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Asset Grid */}
      <AssetGrid
        assets={filteredAssets}
        isLoading={isLoading}
        emptyMessage="No assets match your search criteria"
      />

      {/* Pagination Info */}
      {assetsResponse?.meta && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Showing {filteredAssets.length} of {assetsResponse.meta.total} assets
        </div>
      )}
    </div>
  );
}
