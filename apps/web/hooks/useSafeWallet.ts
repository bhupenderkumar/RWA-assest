'use client';

import { useWallet as useWalletOriginal, WalletContextState } from '@solana/wallet-adapter-react';
import { useWalletModal as useWalletModalOriginal } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';

/**
 * A safe wrapper around useWallet that returns default values during SSR
 * and when wallet providers aren't yet available (prevents hydration errors)
 */

const defaultWalletState: WalletContextState = {
  autoConnect: false,
  connected: false,
  connecting: false,
  disconnect: async () => {},
  disconnecting: false,
  publicKey: null,
  select: () => {},
  sendTransaction: async () => { throw new Error('Wallet not connected'); },
  signAllTransactions: undefined,
  signMessage: undefined,
  signTransaction: undefined,
  wallet: null,
  wallets: [],
  connect: async () => { throw new Error('Wallet not connected'); },
  signIn: undefined,
};

const defaultModalState = {
  visible: false,
  setVisible: () => {},
};

export function useSafeWallet(): WalletContextState & { mounted: boolean } {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Try to use the wallet context, fall back to defaults during SSR
  try {
    const wallet = useWalletOriginal();
    return { ...wallet, mounted };
  } catch {
    return { ...defaultWalletState, mounted };
  }
}

export function useSafeWalletModal(): { visible: boolean; setVisible: (visible: boolean) => void; mounted: boolean } {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  try {
    const modal = useWalletModalOriginal();
    return { ...modal, mounted };
  } catch {
    return { ...defaultModalState, mounted };
  }
}
