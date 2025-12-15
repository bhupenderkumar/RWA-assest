'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Asset, AssetType, ListingStatus, Document } from '@/lib/api';

// ===========================================
// Query Hooks
// ===========================================

export function useAssets(params?: {
  type?: AssetType;
  status?: ListingStatus;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const response = await api.assets.list(params);
      return response;
    },
  });
}

export function useMarketplaceAssets(params?: {
  type?: AssetType;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['marketplace-assets', params],
    queryFn: async () => {
      const response = await api.assets.marketplace(params);
      return response;
    },
  });
}

export function useListedAssets() {
  return useAssets({ status: 'LISTED' });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => api.assets.get(id),
    enabled: !!id,
  });
}

export function useAssetDocuments(assetId: string) {
  return useQuery({
    queryKey: ['asset-documents', assetId],
    queryFn: () => api.assets.getDocuments(assetId),
    enabled: !!assetId,
  });
}

// ===========================================
// Mutation Hooks (Bank Admin)
// ===========================================

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (asset: {
      name: string;
      description: string;
      assetType: AssetType;
      totalValue: number;
      totalSupply: number;
      pricePerToken: number;
    }) => api.assets.create(asset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<Asset>) =>
      api.assets.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', variables.id] });
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, file, type }: { 
      assetId: string; 
      file: File; 
      type: Document['type'];
    }) => api.assets.uploadDocument(assetId, file, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['asset-documents', variables.assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset', variables.assetId] });
    },
  });
}

export function useSubmitAssetForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.assets.submitForApproval(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
    },
  });
}

export function useTokenizeAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.assets.tokenize(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
    },
  });
}

export function useListAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.assets.list_asset(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
    },
  });
}
