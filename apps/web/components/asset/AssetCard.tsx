'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Asset, AssetType, ListingStatus, TokenizationStatus } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Building2, Coins, Factory, FileText, Package, TrendingUp } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  showActions?: boolean;
}

const assetTypeIcons: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  REAL_ESTATE: Building2,
  COMMODITIES: Coins,
  EQUIPMENT: Factory,
  RECEIVABLES: FileText,
  SECURITIES: TrendingUp,
  OTHER: Package,
};

const assetTypeLabels: Record<AssetType, string> = {
  REAL_ESTATE: 'Real Estate',
  COMMODITIES: 'Commodities',
  EQUIPMENT: 'Equipment',
  RECEIVABLES: 'Receivables',
  SECURITIES: 'Securities',
  OTHER: 'Other',
};

const listingStatusColors: Record<ListingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  UNLISTED: 'secondary',
  LISTED: 'default',
  PAUSED: 'outline',
  DELISTED: 'destructive',
};

const tokenizationStatusLabels: Record<TokenizationStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  PENDING_TOKENIZATION: 'Tokenizing',
  TOKENIZED: 'Tokenized',
  FAILED: 'Failed',
};

export function AssetCard({ asset, showActions = true }: AssetCardProps) {
  const Icon = assetTypeIcons[asset.assetType] || Building2;
  
  // Calculate available tokens (for display purposes)
  const totalSupply = BigInt(asset.totalSupply);
  const holdingsCount = asset._count?.holdings ?? 0;
  
  // Estimated yield based on asset type (this could come from backend in future)
  const estimatedYield = getEstimatedYield(asset.assetType);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image or placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-secondary/20">
        {asset.metadataUri ? (
          <img
            src={asset.metadataUri}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Icon className="h-16 w-16 text-primary/40" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge variant={listingStatusColors[asset.listingStatus]}>
            {asset.listingStatus}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="bg-background/80">
            {assetTypeLabels[asset.assetType]}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <h3 className="font-semibold text-lg line-clamp-1">{asset.name}</h3>
        {asset.bank && (
          <p className="text-sm text-muted-foreground flex items-center">
            <Building2 className="h-3 w-3 mr-1" />
            {asset.bank.name}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {asset.description}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Token Price</p>
            <p className="font-semibold">{formatCurrency(asset.pricePerToken)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. Yield</p>
            <p className="font-semibold text-green-600">
              {estimatedYield}%
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Status</span>
            <span>{tokenizationStatusLabels[asset.tokenizationStatus]}</span>
          </div>
          {asset.tokenizationStatus === 'TOKENIZED' && (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60"
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Value</span>
          <span className="font-semibold">{formatCurrency(asset.totalValue)}</span>
        </div>

        {holdingsCount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Investors</span>
            <span className="font-semibold">{holdingsCount}</span>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="pt-0">
          <Button asChild className="w-full">
            <Link href={`/asset/${asset.id}`}>View Details</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// Helper function to estimate yield based on asset type
function getEstimatedYield(assetType: AssetType): number {
  const yields: Record<AssetType, number> = {
    REAL_ESTATE: 8.5,
    COMMODITIES: 6.0,
    EQUIPMENT: 10.0,
    RECEIVABLES: 12.0,
    SECURITIES: 7.5,
    OTHER: 5.0,
  };
  return yields[assetType];
}
