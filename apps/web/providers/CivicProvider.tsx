'use client';

import { FC, ReactNode, useMemo, useState, useEffect } from 'react';
import { GatewayProvider } from '@civic/solana-gateway-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, clusterApiUrl } from '@solana/web3.js';

// Civic Gatekeeper Network for different verification levels
export const GATEKEEPER_NETWORKS = {
  // Civic Uniqueness Pass - Verifies unique human
  UNIQUENESS: 'uniqobk8oGh4XBLMqM68K8M2zNu3CdYX7q5go7whQiv',
  // Civic ID Verification Pass - KYC verification
  ID_VERIFICATION: 'bni1ewus6aMxTxBi5SAfzEmmXLf8KcVFRmTfproJuKw',
  // Civic Captcha Pass - Bot protection
  CAPTCHA: 'ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6',
} as const;

interface CivicProviderProps {
  children: ReactNode;
  gatekeeperNetwork?: string;
  /** If true, Civic integration is disabled and children render without GatewayProvider */
  disabled?: boolean;
}

// Check if Civic is disabled via environment variable
const isCivicDisabledByEnv = (): boolean => {
  const disabled = process.env.NEXT_PUBLIC_CIVIC_DISABLED;
  return disabled === 'true' || disabled === '1';
};

// Get a valid Solana RPC endpoint
const getEndpoint = (): string => {
  const envEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_ENDPOINT;
  if (envEndpoint && (envEndpoint.startsWith('http://') || envEndpoint.startsWith('https://'))) {
    return envEndpoint;
  }
  return clusterApiUrl('devnet');
};

/**
 * CivicProvider wraps children with Civic Gateway integration for KYC/identity verification.
 *
 * This provider can be disabled via NEXT_PUBLIC_CIVIC_DISABLED=true environment variable.
 * When disabled or when wallet is not connected, children are rendered without the GatewayProvider wrapper.
 *
 * Note: The Civic gatekeeper-api.civic.com domain may not be resolvable on some corporate networks/VPNs.
 * In such cases, set NEXT_PUBLIC_CIVIC_DISABLED=true to prevent connection errors.
 */
export const CivicProvider: FC<CivicProviderProps> = ({
  children,
  gatekeeperNetwork = GATEKEEPER_NETWORKS.ID_VERIFICATION,
  disabled = false,
}) => {
  const wallet = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const [hasLoggedDisabled, setHasLoggedDisabled] = useState(false);
  
  // Check if disabled by environment variable - only on client side
  const isEnvDisabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return isCivicDisabledByEnv();
  }, []);

  // Ensure client-side only rendering for Civic
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Log once on mount if Civic is disabled (separate effect to avoid hydration issues)
  useEffect(() => {
    if (isMounted && isEnvDisabled && !hasLoggedDisabled) {
      console.info('[CivicProvider] Civic integration is disabled via NEXT_PUBLIC_CIVIC_DISABLED environment variable.');
      setHasLoggedDisabled(true);
    }
  }, [isMounted, isEnvDisabled, hasLoggedDisabled]);

  // Convert gatekeeperNetwork string to PublicKey
  const gatekeeperNetworkKey = useMemo(() => {
    try {
      return new PublicKey(gatekeeperNetwork);
    } catch {
      console.error('[CivicProvider] Invalid gatekeeper network address:', gatekeeperNetwork);
      return null;
    }
  }, [gatekeeperNetwork]);

  // Get the cluster URL for Civic provider - must be a valid http/https URL
  const clusterUrl = useMemo(() => getEndpoint(), []);

  // Always render just children during SSR to avoid hydration issues
  if (!isMounted) {
    return <>{children}</>;
  }

  // Conditions to skip Civic wrapper:
  // - Explicitly disabled via prop
  // - Disabled via environment variable
  // - Wallet not connected (Civic requires a connected wallet)
  // - Invalid gatekeeper network address
  const shouldSkipCivic =
    disabled ||
    isEnvDisabled ||
    !wallet.publicKey ||
    !gatekeeperNetworkKey;

  // Skip Civic wrapper if conditions are met
  if (shouldSkipCivic) {
    return <>{children}</>;
  }

  return (
    <GatewayProvider
      wallet={wallet}
      gatekeeperNetwork={gatekeeperNetworkKey}
      clusterUrl={clusterUrl}
      cluster="devnet"
      options={{
        autoShowModal: false,
      }}
    >
      {children}
    </GatewayProvider>
  );
};

export { GATEKEEPER_NETWORKS as CivicNetworks };
