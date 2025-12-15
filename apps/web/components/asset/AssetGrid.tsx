import { Asset } from '@/lib/api';
import { AssetCard } from './AssetCard';
import { Skeleton } from '@/components/ui/skeleton';

interface AssetGridProps {
  assets?: Asset[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function AssetGrid({
  assets,
  isLoading = false,
  emptyMessage = 'No assets found',
}: AssetGridProps) {
  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <AssetCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}

function AssetCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <Skeleton className="h-48 rounded-none" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
