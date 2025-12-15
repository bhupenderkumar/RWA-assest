'use client';

import { useQuery } from '@tanstack/react-query';
import { api, Portfolio } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

export function usePortfolio() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.users.getPortfolio(),
    enabled: isAuthenticated,
  });
}

export function usePortfolioStats() {
  const { data: portfolio, isLoading, error } = usePortfolio();

  const stats = {
    totalValue: portfolio?.totalValue ?? 0,
    totalCostBasis: portfolio?.totalCostBasis ?? 0,
    totalPnl: portfolio?.totalPnl ?? 0,
    totalPnlPercentage: portfolio?.totalPnlPercentage ?? 0,
    holdingsCount: portfolio?.holdings?.length ?? 0,
    topHolding: portfolio?.holdings?.[0] ?? null,
  };

  return { stats, isLoading, error };
}

export function useHoldings() {
  const { data: portfolio, isLoading, error } = usePortfolio();
  
  return {
    holdings: portfolio?.holdings ?? [],
    isLoading,
    error,
  };
}
