'use client';

import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { shortenAddress } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { 
  LogOut, 
  Wallet, 
  User, 
  Shield, 
  LogIn,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export const WalletButton: FC = () => {
  const [mounted, setMounted] = useState(false);
  
  // Ensure component is mounted before using wallet hooks
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show placeholder during SSR/hydration (avoid icons to prevent hydration mismatch)
  if (!mounted) {
    return (
      <Button size="sm" disabled>
        <span className="inline-block w-4 h-4 mr-2 rounded bg-muted" />
        Connect Wallet
      </Button>
    );
  }

  return <WalletButtonContent />;
};

// Separate component that only renders after mount (when wallet context is available)
const WalletButtonContent: FC = () => {
  const { publicKey, disconnect, connecting, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();

  // Not connected - show connect button
  if (!connected || !publicKey) {
    return (
      <Button
        onClick={() => setVisible(true)}
        disabled={connecting}
        size="sm"
      >
        <Wallet className="mr-2 h-4 w-4" />
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  // Connected but not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={login}
          disabled={isLoading}
          size="sm"
          variant="default"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing...
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </>
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Wallet className="mr-2 h-4 w-4" />
              {shortenAddress(publicKey.toBase58())}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {shortenAddress(publicKey.toBase58(), 6)}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(publicKey.toBase58())}
            >
              Copy Address
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={disconnect} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Fully authenticated
  const isVerified = user?.kycStatus === 'VERIFIED';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <div className="flex items-center gap-2">
            {isVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <User className="h-4 w-4" />
            )}
            {shortenAddress(publicKey.toBase58())}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {shortenAddress(publicKey.toBase58(), 6)}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || 'Investor Account'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {isVerified ? (
                <Badge variant="default" className="text-xs bg-green-600">
                  <Shield className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="mr-1 h-3 w-3" />
                  {user?.kycStatus || 'Unverified'}
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/portfolio">
            <Wallet className="mr-2 h-4 w-4" />
            Portfolio
          </Link>
        </DropdownMenuItem>
        
        {!isVerified && (
          <DropdownMenuItem asChild>
            <Link href="/kyc">
              <Shield className="mr-2 h-4 w-4" />
              Complete KYC
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(publicKey.toBase58())}
        >
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            window.open(
              `https://explorer.solana.com/address/${publicKey.toBase58()}?cluster=devnet`,
              '_blank'
            )
          }
        >
          View on Explorer
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={logout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
