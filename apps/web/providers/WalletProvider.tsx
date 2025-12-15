'use client';

import { FC, ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { Adapter, WalletReadyState } from '@solana/wallet-adapter-base';
import {
  LedgerWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// List of EVM-only wallet names that should be filtered out from the Solana wallet list
// These wallets register via the Standard Wallet API but cannot sign Solana transactions
const EVM_ONLY_WALLETS = [
  'metamask',
  'coinbase wallet',
  'rainbow',
  'walletconnect',
  'trust wallet',
  'brave wallet',
  'opera wallet',
  'tokenpocket',
  'mathwallet',
  'bitkeep',
  'okx wallet',
  'onekey',
];

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  // Track if component has mounted (for hydration safety)
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get the RPC endpoint from environment or use devnet
  const endpoint = useMemo(() => {
    // Check for various environment variable names
    const envEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || process.env.NEXT_PUBLIC_RPC_ENDPOINT;
    // Validate that the endpoint is a valid URL starting with http: or https:
    if (envEndpoint && (envEndpoint.startsWith('http://') || envEndpoint.startsWith('https://'))) {
      return envEndpoint;
    }
    // Fallback to devnet
    return clusterApiUrl('devnet');
  }, []);

  // Filter function to exclude EVM-only wallets from the Standard Wallet list
  // These wallets register via the Wallet Standard API but cannot handle Solana signing
  const isEvmOnlyWallet = useCallback((walletName: string): boolean => {
    const lowerName = walletName.toLowerCase();
    return EVM_ONLY_WALLETS.some(evmWallet => lowerName.includes(evmWallet));
  }, []);

  // Wallet error handler - logs wallet connection errors
  // Suppresses common non-critical errors like auto-connect failures
  const onError = useCallback((error: Error, adapter?: Adapter) => {
    const message = error.message?.toLowerCase() || '';
    
    // Suppress non-critical auto-connect and initialization errors
    const isNonCritical = 
      message.includes('unexpected error') ||
      message.includes('user rejected') ||
      message.includes('wallet not found') ||
      message.includes('not connected') ||
      message.includes('disconnected');
    
    if (isNonCritical) {
      // Log at debug level for non-critical errors
      console.debug('[WalletProvider] Wallet info:', error.message, adapter?.name);
    } else {
      console.error('[WalletProvider] Wallet error:', error.message, adapter?.name);
    }
  }, []);

  // Initialize wallet adapters
  // Note: Phantom and Solflare are auto-detected as Standard Wallets,
  // so we only need to add adapters for wallets that don't support the standard yet
  const wallets = useMemo(
    () => [
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  // Return minimal wrapper during SSR to prevent hydration mismatch
  // The wallet adapters interact with browser APIs that don't exist on the server
  if (!mounted) {
    return (
      <ConnectionProvider endpoint={endpoint}>
        <SolanaWalletProvider 
          wallets={wallets} 
          autoConnect={false}
          onError={onError}
        >
          <WalletModalProvider>{children}</WalletModalProvider>
        </SolanaWalletProvider>
      </ConnectionProvider>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect
        onError={onError}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
