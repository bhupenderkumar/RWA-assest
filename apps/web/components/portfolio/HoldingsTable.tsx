'use client';

import Link from 'next/link';
import { PortfolioHolding, AssetType } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, ExternalLink, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface HoldingsTableProps {
  holdings?: PortfolioHolding[];
  isLoading?: boolean;
}

const assetTypeLabels: Record<AssetType, string> = {
  REAL_ESTATE: 'Real Estate',
  COMMODITIES: 'Commodities',
  EQUIPMENT: 'Equipment',
  RECEIVABLES: 'Receivables',
  SECURITIES: 'Securities',
  OTHER: 'Other',
};

export function HoldingsTable({ holdings, isLoading }: HoldingsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!holdings || holdings.length === 0) {
    return (
      <div className="rounded-lg border">
        <div className="p-8 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            You don't have any holdings yet.
          </p>
          <Button asChild>
            <Link href="/marketplace">Browse Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-medium text-sm">Asset</th>
              <th className="text-right p-4 font-medium text-sm">Tokens</th>
              <th className="text-right p-4 font-medium text-sm">Current Value</th>
              <th className="text-right p-4 font-medium text-sm">Cost Basis</th>
              <th className="text-right p-4 font-medium text-sm">P&L</th>
              <th className="text-right p-4 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {holdings.map((holding) => {
              const pnl = holding.pnl ?? 0;
              const pnlPercentage = holding.pnlPercentage ?? 0;
              const currentValue = holding.currentValue ?? (holding.tokenAmount * (holding.asset?.pricePerToken ?? 0));
              const isProfitable = pnl >= 0;
              
              return (
                <tr key={holding.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {holding.asset?.name?.charAt(0) ?? '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{holding.asset?.name ?? 'Unknown Asset'}</p>
                        {holding.asset?.assetType && (
                          <Badge variant="outline" className="text-xs">
                            {assetTypeLabels[holding.asset.assetType]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-medium">
                    {holding.tokenAmount.toLocaleString()}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatCurrency(currentValue)}
                  </td>
                  <td className="p-4 text-right text-muted-foreground">
                    {formatCurrency(holding.costBasis)}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isProfitable ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={
                          isProfitable ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {isProfitable ? '+' : '-'}
                        {formatCurrency(Math.abs(pnl))}
                        <span className="text-xs ml-1">
                          ({isProfitable ? '+' : ''}{formatPercentage(pnlPercentage)})
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/asset/${holding.assetId}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Summary row */}
      <div className="bg-muted/50 p-4 flex justify-between items-center border-t">
        <span className="font-medium">Total ({holdings.length} holdings)</span>
        <span className="font-bold">
          {formatCurrency(holdings.reduce((sum, h) => sum + (h.currentValue ?? 0), 0))}
        </span>
      </div>
    </div>
  );
}
