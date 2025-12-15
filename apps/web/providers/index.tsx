'use client';

import { FC, ReactNode, useState, useEffect } from 'react';
import { WalletProvider } from './WalletProvider';
import { CivicProvider } from './CivicProvider';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';

interface ProvidersProps {
  children: ReactNode;
}

export const Providers: FC<ProvidersProps> = ({ children }) => {
  // Track if component has mounted to prevent hydration issues
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, render a minimal version without wallet-related providers
  // This prevents hydration mismatches from browser-only wallet APIs
  if (!mounted) {
    return (
      <QueryProvider>
        {children}
      </QueryProvider>
    );
  }

  return (
    <QueryProvider>
      <WalletProvider>
        <CivicProvider>
          <AuthProvider>{children}</AuthProvider>
        </CivicProvider>
      </WalletProvider>
    </QueryProvider>
  );
};

export { WalletProvider } from './WalletProvider';
export { CivicProvider, CivicNetworks, GATEKEEPER_NETWORKS } from './CivicProvider';
export { QueryProvider } from './QueryProvider';
export { AuthProvider, useAuth } from './AuthProvider';
