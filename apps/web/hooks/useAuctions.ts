'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Auction, AuctionStatus, Bid } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

// ===========================================
// Query Hooks
// ===========================================

export function useAuctions(params?: {
  status?: AuctionStatus;
  assetId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['auctions', params],
    queryFn: async () => {
      const response = await api.auctions.list(params);
      return response;
    },
  });
}

export function useActiveAuctions() {
  return useAuctions({ status: 'ACTIVE' });
}

export function useAuction(id: string) {
  return useQuery({
    queryKey: ['auction', id],
    queryFn: () => api.auctions.get(id),
    enabled: !!id,
    // Refetch every 30 seconds for live updates
    refetchInterval: 30000,
  });
}

export function useAuctionBids(auctionId: string) {
  return useQuery({
    queryKey: ['auction-bids', auctionId],
    queryFn: () => api.auctions.getBids(auctionId),
    enabled: !!auctionId,
    // Refetch every 10 seconds for live bid updates
    refetchInterval: 10000,
  });
}

// ===========================================
// Mutation Hooks
// ===========================================

export function usePlaceBid() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ auctionId, amount, txSignature }: {
      auctionId: string;
      amount: number;
      txSignature: string;
    }) => api.auctions.placeBid(auctionId, amount, txSignature),
    onSuccess: (bid, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auction', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction-bids', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast({
        title: 'Bid Placed!',
        description: `Your bid of $${variables.amount.toLocaleString()} has been submitted.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bid Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ===========================================
// Bank Admin Mutation Hooks
// ===========================================

export function useCreateAuction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (auction: {
      assetId: string;
      reservePrice: number;
      tokenAmount: number;
      startTime: string;
      endTime: string;
    }) => api.auctions.create(auction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast({
        title: 'Auction Created',
        description: 'Your auction has been scheduled.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCancelAuction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.auctions.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast({
        title: 'Auction Cancelled',
        description: 'The auction has been cancelled.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cancellation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSettleAuction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.auctions.settle(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast({
        title: 'Auction Settled',
        description: 'The auction has been settled and tokens transferred.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Settlement Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ===========================================
// Auction Helpers
// ===========================================

export function useAuctionTimeRemaining(endTime: string) {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const remaining = Math.max(0, end - now);

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  return {
    remaining,
    isEnded: remaining === 0,
    formatted: remaining > 0
      ? `${days}d ${hours}h ${minutes}m ${seconds}s`
      : 'Ended',
    days,
    hours,
    minutes,
    seconds,
  };
}