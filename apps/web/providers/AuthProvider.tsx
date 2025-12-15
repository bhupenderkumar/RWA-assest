'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletSignMessageError } from '@solana/wallet-adapter-base';
import { api, User, tokenStorage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import bs58 from 'bs58';

// ===========================================
// Types
// ===========================================

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ===========================================
// Context
// ===========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===========================================
// Provider
// ===========================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { publicKey, signMessage, connected, disconnect, wallet } = useWallet();
  const { toast } = useToast();
  
  // Track if component has mounted (for hydration safety)
  const [hasMounted, setHasMounted] = useState(false);
  
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Set mounted state after hydration is complete
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Check for existing session on mount (only after hydration)
  useEffect(() => {
    // Don't run until component has mounted (hydration complete)
    if (!hasMounted) return;
    
    const checkAuth = async () => {
      const token = tokenStorage.getAccessToken();
      
      if (token) {
        try {
          const user = await api.auth.me();
          setState({
            user,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        } catch {
          // Token invalid, clear it
          tokenStorage.clearTokens();
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
        }
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    };

    checkAuth();
  }, [hasMounted]);

  // Listen for auth:logout events (from API client)
  useEffect(() => {
    const handleLogout = () => {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
      disconnect();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [disconnect]);

  // List of known EVM wallet names that are not compatible with Solana signing
  const EVM_WALLET_NAMES = [
    'metamask',
    'coinbase',
    'rainbow',
    'walletconnect',
    'trust',
    'brave',
    'opera',
    'tokenpocket',
    'mathwallet',
    'bitkeep',
    'okx',
    'onekey',
  ];

  // Check if the connected wallet is an EVM wallet (not Solana compatible)
  const isEvmWallet = useCallback((adapterName: string | undefined): boolean => {
    if (!adapterName) return false;
    const lowerName = adapterName.toLowerCase();
    return EVM_WALLET_NAMES.some(evmName => lowerName.includes(evmName));
  }, []);

  // Helper function to sign message with various wallet types
  const signMessageWithWallet = useCallback(async (messageBytes: Uint8Array): Promise<Uint8Array> => {
    const adapter = wallet?.adapter;
    
    console.log('[AuthProvider] signMessageWithWallet called, adapter:', adapter?.name, 'connected:', connected);

    // Check if this is an EVM wallet - these cannot sign Solana messages
    if (adapter && isEvmWallet(adapter.name)) {
      throw new Error(
        `${adapter.name} is an EVM wallet and cannot sign Solana messages. ` +
        'Please use a Solana wallet like Phantom, Solflare, or Backpack.'
      );
    }
    
    // Helper to check if error is user rejection
    const isUserRejection = (error: unknown): boolean => {
      if (error instanceof Error) {
        const msg = error.message?.toLowerCase() || '';
        return msg.includes('user rejected') ||
               msg.includes('rejected') ||
               msg.includes('cancelled') ||
               msg.includes('canceled');
      }
      return false;
    };

    // Type for Phantom wallet provider (direct window access)
    interface PhantomProvider {
      signMessage: (message: Uint8Array, display?: 'utf8' | 'hex') => Promise<{ signature: Uint8Array }>;
      isConnected?: boolean;
      publicKey?: { toBase58: () => string };
      isPhantom?: boolean;
      connect?: () => Promise<{ publicKey: { toBase58: () => string } }>;
    }
    
    interface WindowWithPhantom {
      phantom?: {
        solana?: PhantomProvider;
      };
      solana?: PhantomProvider & { isPhantom?: boolean };
    }

    const windowWithPhantom = (typeof window !== 'undefined' ? window : {}) as WindowWithPhantom;

    // Helper to add timeout to signing operations (30 seconds is reasonable for user to approve)
    const withSigningTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(
            'Wallet signing timed out after 30 seconds. Please check if your wallet popup is visible and unlocked, then try again.'
          ));
        }, timeoutMs);
        
        promise
          .then((result) => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timer);
            reject(error);
          });
      });
    };

    // Check if Phantom is available via window object
    const phantomProvider = windowWithPhantom.phantom?.solana ||
                           (windowWithPhantom.solana?.isPhantom ? windowWithPhantom.solana : null);
    
    // Method 1: Try the useWallet signMessage hook FIRST (since wallet is connected via adapter)
    // This is the recommended approach when the wallet is connected through wallet-adapter
    if (signMessage) {
      try {
        console.log('[AuthProvider] Method 1: Trying useWallet signMessage hook...');
        console.log('[AuthProvider] Message bytes length:', messageBytes.length);
        const signature = await withSigningTimeout(signMessage(messageBytes), 60000);
        console.log('[AuthProvider] useWallet signMessage succeeded');
        return signature;
      } catch (error) {
        console.warn('[AuthProvider] useWallet signMessage failed:', error);
        if (isUserRejection(error)) {
          throw new Error('Message signing was rejected by user');
        }
        if (error instanceof Error && error.message?.includes('timed out')) {
          // Don't throw timeout here, try other methods
          console.log('[AuthProvider] Wallet adapter timed out, trying direct Phantom API...');
        }
      }
    }

    // Method 2: Try Phantom's direct signMessage API (fallback if adapter fails)
    if (phantomProvider?.signMessage) {
      try {
        console.log('[AuthProvider] Method 2: Trying Phantom direct signMessage (window.phantom.solana)...');
        console.log('[AuthProvider] Phantom isConnected:', phantomProvider.isConnected);
        
        // Ensure Phantom is connected before signing
        if (!phantomProvider.isConnected && phantomProvider.connect) {
          console.log('[AuthProvider] Phantom not connected, reconnecting...');
          await phantomProvider.connect();
          console.log('[AuthProvider] Phantom reconnected');
        }
        
        console.log('[AuthProvider] Calling Phantom signMessage now...');
        const result = await withSigningTimeout(phantomProvider.signMessage(messageBytes, 'utf8'), 60000);
        console.log('[AuthProvider] Phantom signMessage returned:', result);
        if (result?.signature) {
          console.log('[AuthProvider] Phantom direct signMessage succeeded');
          return new Uint8Array(result.signature);
        }
      } catch (error) {
        console.warn('[AuthProvider] Phantom direct signMessage failed:', error);
        if (isUserRejection(error)) {
          throw new Error('Message signing was rejected by user');
        }
        if (error instanceof Error && error.message?.includes('timed out')) {
          throw error;
        }
        // Continue to next method
      }
    }

    // Method 3: Try legacy window.solana if available (for other Solana wallets)
    if (windowWithPhantom.solana?.signMessage && !windowWithPhantom.solana.isPhantom) {
      try {
        console.log('[AuthProvider] Method 3: Trying window.solana.signMessage...');
        const result = await windowWithPhantom.solana.signMessage(messageBytes);
        if (result?.signature) {
          console.log('[AuthProvider] window.solana signMessage succeeded');
          return new Uint8Array(result.signature);
        }
      } catch (error) {
        console.warn('[AuthProvider] window.solana signMessage failed:', error);
        if (isUserRejection(error)) {
          throw new Error('Message signing was rejected by user');
        }
      }
    }

    // Method 5: Try accessing internal adapter methods (last resort for Solana wallets)
    if (adapter) {
      // Type assertion for accessing internal wallet methods
      type InternalAdapter = {
        _wallet?: {
          signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
        };
        _standardWallet?: {
          features?: {
            'solana:signMessage'?: {
              signMessage: (input: { message: Uint8Array; account: { address: string; publicKey?: Uint8Array } }) => Promise<readonly { signature: Uint8Array }[]>;
            };
          };
          accounts?: Array<{ address: string; publicKey: Uint8Array }>;
        };
      };
      
      const internalAdapter = adapter as InternalAdapter;

      // Try adapter's internal _wallet.signMessage
      if (internalAdapter._wallet?.signMessage) {
        try {
          console.log('[AuthProvider] Method 4a: Trying adapter._wallet.signMessage...');
          const result = await internalAdapter._wallet.signMessage(messageBytes);
          if (result?.signature) {
            console.log('[AuthProvider] adapter._wallet.signMessage succeeded');
            return new Uint8Array(result.signature);
          }
        } catch (error) {
          console.warn('[AuthProvider] adapter._wallet.signMessage failed:', error);
          if (isUserRejection(error)) {
            throw new Error('Message signing was rejected by user');
          }
        }
      }

      // Try Standard Wallet features with proper account format
      if (internalAdapter._standardWallet?.features?.['solana:signMessage'] && publicKey) {
        try {
          console.log('[AuthProvider] Method 4b: Trying Standard Wallet solana:signMessage feature...');
          const signMessageFeature = internalAdapter._standardWallet.features['solana:signMessage'];
          const accounts = internalAdapter._standardWallet.accounts;
          
          // Find the matching account or use the publicKey
          const walletAddress = publicKey.toBase58();
          const account = accounts?.find(a => a.address === walletAddress) || {
            address: walletAddress,
            publicKey: publicKey.toBytes()
          };
          
          const results = await signMessageFeature.signMessage({
            message: messageBytes,
            account: account,
          });
          if (results && results.length > 0 && results[0]?.signature) {
            console.log('[AuthProvider] Standard Wallet solana:signMessage succeeded');
            return new Uint8Array(results[0].signature);
          }
        } catch (error) {
          console.warn('[AuthProvider] Standard Wallet signMessage failed:', error);
          if (isUserRejection(error)) {
            throw new Error('Message signing was rejected by user');
          }
        }
      }
    }

    throw new Error(
      'Unable to sign message. Please ensure you are using a Solana wallet (like Phantom, Solflare, or Backpack) ' +
      'and that it is unlocked. EVM wallets like MetaMask are not currently supported.'
    );
  }, [signMessage, wallet, publicKey, connected, isEvmWallet]);

  // Login with wallet signature
  const login = useCallback(async () => {
    const loginStartTime = performance.now();
    
    if (!publicKey) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet to sign in.',
        variant: 'destructive',
      });
      return;
    }

    // Check if the connected wallet is an EVM wallet (not Solana compatible)
    // This check happens early to provide immediate user feedback
    const adapterName = wallet?.adapter?.name;
    if (isEvmWallet(adapterName)) {
      toast({
        title: 'Solana Wallet Required',
        description: `${adapterName} is an EVM wallet (Ethereum/Polygon). Please connect a Solana wallet like Phantom, Solflare, or Backpack to sign in.`,
        variant: 'destructive',
      });
      return;
    }

    if (!signMessage && !wallet?.adapter) {
      toast({
        title: 'Signing Not Available',
        description: 'Your wallet does not support message signing.',
        variant: 'destructive',
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const walletAddress = publicKey.toBase58();

      // Step 1: Get nonce from server
      toast({
        title: 'Connecting...',
        description: 'Requesting authentication challenge from server.',
      });
      
      const nonceStartTime = performance.now();
      const { message } = await api.auth.getNonce(walletAddress);
      console.log(`[AuthProvider] Nonce fetch took: ${(performance.now() - nonceStartTime).toFixed(0)}ms`);
      console.log(`[AuthProvider] Message from API:`, message);
      console.log(`[AuthProvider] Message length:`, message?.length);

      // Validate message exists
      if (!message || message.length === 0) {
        throw new Error('Server returned empty authentication message. Please try again.');
      }

      // Step 2: Sign the message with wallet
      toast({
        title: 'Sign Message',
        description: 'Please approve the signature request in your wallet popup.',
      });
      
      // Create a proper Uint8Array for wallet standard compatibility
      const encoder = new TextEncoder();
      const encodedMessage = encoder.encode(message);
      console.log(`[AuthProvider] Encoded message length:`, encodedMessage.length);
      
      // Create a fresh Uint8Array (not a view) to ensure maximum compatibility
      const messageBytes = new Uint8Array(encodedMessage.length);
      messageBytes.set(encodedMessage);
      console.log(`[AuthProvider] Final messageBytes length:`, messageBytes.length);
      
      const signStartTime = performance.now();
      const signatureBytes = await signMessageWithWallet(messageBytes);
      console.log(`[AuthProvider] Wallet signing took: ${(performance.now() - signStartTime).toFixed(0)}ms`);
      
      const signature = bs58.encode(signatureBytes);

      // Step 3: Login with signature and message
      const loginApiStartTime = performance.now();
      const { user } = await api.auth.login(walletAddress, signature, message);
      console.log(`[AuthProvider] Login API call took: ${(performance.now() - loginApiStartTime).toFixed(0)}ms`);
      
      console.log(`[AuthProvider] Total login flow took: ${(performance.now() - loginStartTime).toFixed(0)}ms`);

      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });

      toast({
        title: 'Welcome!',
        description: `Signed in as ${walletAddress.slice(0, 8)}...`,
      });
    } catch (error) {
      console.error('[AuthProvider] Login error:', error);
      console.log(`[AuthProvider] Login failed after: ${(performance.now() - loginStartTime).toFixed(0)}ms`);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [publicKey, signMessage, wallet, signMessageWithWallet, toast]);

  // Logout
  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await api.auth.logout();
    } catch {
      // Ignore logout errors, clear local state anyway
    }

    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });

    disconnect();

    toast({
      title: 'Signed Out',
      description: 'You have been signed out.',
    });
  }, [disconnect, toast]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!state.isAuthenticated) return;

    try {
      const user = await api.auth.me();
      setState((prev) => ({ ...prev, user }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh user';
      setState((prev) => ({ ...prev, error: message }));
    }
  }, [state.isAuthenticated]);

  // Auto-login when wallet connects (if not already authenticated)
  useEffect(() => {
    if (connected && publicKey && !state.isAuthenticated && !state.isLoading) {
      // Check if we have a stored token that might still be valid
      const token = tokenStorage.getAccessToken();
      if (!token) {
        // No token, prompt for login (don't auto-login to avoid unexpected signing prompts)
        // The user should click "Sign In" button
      }
    }
  }, [connected, publicKey, state.isAuthenticated, state.isLoading]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ===========================================
// Hook
// ===========================================

// Default context value for SSR/pre-mount state
const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  // Return default context during SSR or when not within AuthProvider
  // This prevents hydration errors when providers aren't mounted yet
  if (context === undefined) {
    return defaultAuthContext;
  }
  return context;
};

export default AuthProvider;