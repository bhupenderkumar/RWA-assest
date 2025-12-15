'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Transaction } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

// ===========================================
// Query Hooks
// ===========================================

export function useTransactions(params?: { page?: number; limit?: number }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const response = await api.users.getTransactionHistory(params);
      return response;
    },
    enabled: isAuthenticated,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => api.transactions.get(id),
    enabled: !!id,
  });
}

// ===========================================
// Mutation Hooks
// ===========================================

export function usePurchaseAsset() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ assetId, amount, tokenAmount }: {
      assetId: string;
      amount: number;
      tokenAmount: number;
    }) => api.transactions.purchase(assetId, amount, tokenAmount),
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast({
        title: 'Purchase Initiated',
        description: `Transaction ${transaction.id.slice(0, 8)}... is pending. Please complete escrow payment.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Purchase Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useConfirmEscrow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ transactionId, txSignature }: {
      transactionId: string;
      txSignature: string;
    }) => api.transactions.confirmEscrow(transactionId, txSignature),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast({
        title: 'Escrow Confirmed',
        description: 'Your payment has been confirmed. Tokens will be transferred shortly.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Confirmation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCancelTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.transactions.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Transaction Cancelled',
        description: 'Your transaction has been cancelled.',
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
