'use client';

import { useQuery } from '@tanstack/react-query';
import { api, PlatformStats } from '@/lib/api';

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => api.health.getStats(),
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

export function useFormattedPlatformStats() {
  const { data, isLoading, error } = usePlatformStats();

  const formatValue = (value: number): string => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number): string => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const stats = {
    totalValueLocked: data ? formatValue(data.totalValueLocked) : '$0',
    totalValueLockedRaw: data?.totalValueLocked ?? 0,
    totalAssets: data ? formatNumber(data.totalAssets) : '0',
    totalAssetsRaw: data?.totalAssets ?? 0,
    listedAssets: data ? formatNumber(data.listedAssets) : '0',
    listedAssetsRaw: data?.listedAssets ?? 0,
    verifiedInvestors: data ? formatNumber(data.verifiedInvestors) : '0',
    verifiedInvestorsRaw: data?.verifiedInvestors ?? 0,
    settlementTime: data?.settlementTime ?? '<1s',
    completedTransactions: data?.completedTransactions ?? 0,
    recentVolume: data ? formatValue(data.recentVolume) : '$0',
  };

  return { stats, isLoading, error, rawData: data };
}
