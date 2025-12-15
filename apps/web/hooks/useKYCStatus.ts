'use client';

import { useGateway } from '@civic/solana-gateway-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, KYCStatus } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

// GatewayStatus enum values from @civic/solana-gateway-react
export enum GatewayStatus {
  UNKNOWN = 0,
  ACTIVE = 1,
  FROZEN = 2,
  REVOKED = 3,
}

/**
 * Hook to get the current KYC verification status
 * Combines Civic Pass on-chain status with backend status
 */
export function useKYCStatus() {
  const { isAuthenticated, user } = useAuth();
  
  // Try to get Civic gateway status if available
  let civicStatus: number | undefined;
  let gatewayToken: unknown;
  let civicAvailable = false;
  
  try {
    // This will throw if CivicProvider is not wrapping this component
    // or if Civic is disabled due to network issues
    const gateway = useGateway();
    civicStatus = gateway.gatewayStatus;
    gatewayToken = gateway.gatewayToken;
    civicAvailable = true;
  } catch {
    // Gateway provider not available - this is normal when:
    // 1. Wallet is not connected
    // 2. Civic API is unreachable (network issues)
    // 3. Component is not wrapped in CivicProvider
    civicAvailable = false;
  }

  // Query backend for KYC status
  const { data: kycData, isLoading, refetch } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: () => api.users.getKYCStatus(),
    enabled: isAuthenticated,
  });

  // Combine Civic Pass status with backend status
  const getStatus = (): KYCStatus => {
    // If we have a valid gateway token, user is verified
    if (gatewayToken) {
      return 'VERIFIED';
    }

    // Check Civic gateway status
    if (civicStatus === GatewayStatus.ACTIVE) {
      return 'VERIFIED';
    }

    // Fall back to backend status or user's stored status
    return kycData?.status || user?.kycStatus || 'NONE';
  };

  const status = getStatus();

  return {
    status,
    isVerified: status === 'VERIFIED',
    isPending: status === 'PENDING',
    isRejected: status === 'REJECTED',
    isLoading,
    gatewayToken,
    /** Whether Civic gateway integration is available */
    civicAvailable,
    /** Raw Civic gateway status */
    civicStatus,
    refetch,
  };
}

export function useStartKYC() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => api.users.startKYC(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kyc-status'] });
      toast({
        title: 'KYC Verification Started',
        description: 'Please complete the verification process.',
      });
      // Open verification URL in new window
      if (data.verificationUrl) {
        window.open(data.verificationUrl, '_blank');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'KYC Start Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to start and manage Civic Pass verification
 * Provides methods to request verification and check status
 */
export function useCivicVerification() {
  let gatewayContext: {
    requestGatewayToken: () => Promise<void>;
    gatewayStatus: number | undefined;
  } = {
    requestGatewayToken: async () => {
      throw new Error(
        'Civic verification is not available. This may be because:\n' +
        '• Your wallet is not connected\n' +
        '• Civic service is temporarily unavailable\n' +
        '• Network connectivity issues\n\n' +
        'Please try again later or contact support.'
      );
    },
    gatewayStatus: undefined,
  };

  let isAvailable = false;

  try {
    const gateway = useGateway();
    gatewayContext = gateway;
    isAvailable = true;
  } catch {
    // Gateway not available - handled by default gatewayContext
  }

  const { requestGatewayToken, gatewayStatus } = gatewayContext;
  const { toast } = useToast();

  const startVerification = async () => {
    try {
      await requestGatewayToken();
      toast({
        title: 'Verification Started',
        description: 'Please complete the Civic verification process.',
      });
    } catch (error) {
      console.error('[useCivicVerification] Error:', error);
      
      // Provide user-friendly error messages
      let message = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_NAME_NOT_RESOLVED')) {
          message = 'Unable to connect to Civic service. Please check your internet connection and try again.';
        } else if (error.message.includes('wallet')) {
          message = 'Please connect your wallet to start verification.';
        } else {
          message = error.message;
        }
      }
      
      toast({
        title: 'Verification Failed',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    startVerification,
    gatewayStatus,
    /** Whether Civic verification is available */
    isAvailable,
    /** Whether verification is currently active */
    isActive: gatewayStatus === GatewayStatus.ACTIVE,
    /** Whether verification was revoked */
    isRevoked: gatewayStatus === GatewayStatus.REVOKED,
    /** Whether verification is frozen */
    isFrozen: gatewayStatus === GatewayStatus.FROZEN,
  };
}
