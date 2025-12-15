'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Portfolio } from '@/lib/api';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, Coins, PieChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PortfolioSummaryProps {
  portfolio?: Portfolio;
  isLoading?: boolean;
}

export function PortfolioSummary({ portfolio, isLoading }: PortfolioSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalPnl = portfolio?.totalPnl ?? 0;
  const totalPnlPercentage = portfolio?.totalPnlPercentage ?? 0;
  const isProfitable = totalPnl >= 0;

  // Get unique asset types from holdings
  const assetTypes = new Set(
    portfolio?.holdings?.map((h) => h.asset?.assetType).filter(Boolean) ?? []
  );

  const stats = [
    {
      title: 'Total Value',
      value: formatCurrency(portfolio?.totalValue ?? 0),
      icon: Wallet,
      description: null,
    },
    {
      title: 'Total P&L',
      value: formatCurrency(Math.abs(totalPnl)),
      icon: isProfitable ? TrendingUp : TrendingDown,
      description: `${isProfitable ? '+' : '-'}${formatPercentage(Math.abs(totalPnlPercentage))}`,
      isProfit: isProfitable,
    },
    {
      title: 'Holdings',
      value: portfolio?.holdings?.length ?? 0,
      icon: Coins,
      description: null,
    },
    {
      title: 'Asset Types',
      value: assetTypes.size,
      icon: PieChart,
      description: null,
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon 
                className={`h-4 w-4 ${
                  stat.title === 'Total P&L'
                    ? stat.isProfit
                      ? 'text-green-500'
                      : 'text-red-500'
                    : 'text-muted-foreground'
                }`} 
              />
            </CardHeader>
            <CardContent>
              <p 
                className={`text-2xl font-bold ${
                  stat.title === 'Total P&L'
                    ? stat.isProfit
                      ? 'text-green-600'
                      : 'text-red-600'
                    : ''
                }`}
              >
                {stat.title === 'Total P&L' && (stat.isProfit ? '+' : '-')}
                {stat.value}
              </p>
              {stat.description && (
                <p 
                  className={`text-sm ${
                    stat.isProfit ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.description}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
