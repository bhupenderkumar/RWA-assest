'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useKYCStatus, useStartKYC, useCivicVerification } from '@/hooks/useKYCStatus';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Shield, 
  Wallet,
  LogIn,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function KYCPage() {
  const [mounted, setMounted] = useState(false);
  const walletState = useWallet();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const connected = mounted ? walletState.connected : false;
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const { status, isVerified, isPending, isRejected, isLoading } = useKYCStatus();
  const startKYCMutation = useStartKYC();
  const { startVerification, gatewayStatus } = useCivicVerification();

  // Not connected
  if (!connected) {
    return (
      <div className="container py-8">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-16 text-center">
            <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your Solana wallet to start the KYC verification process.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected but not authenticated
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="container py-8">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-16 text-center">
            <LogIn className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Sign in to complete your KYC verification.
            </p>
            <Button onClick={login}>Sign In with Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Identity Verification</h1>
        <p className="text-muted-foreground">
          Complete KYC verification to invest in tokenized assets
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Shield className="h-6 w-6" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || authLoading ? (
            <div className="flex items-center gap-4 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Checking verification status...</p>
            </div>
          ) : isVerified ? (
            <div className="flex items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <Badge variant="default" className="bg-green-600 mb-2">Verified</Badge>
                <p className="text-muted-foreground">
                  Your identity has been verified. You can now invest in tokenized assets.
                </p>
              </div>
            </div>
          ) : isPending ? (
            <div className="flex items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 mb-2">
                  Pending
                </Badge>
                <p className="text-muted-foreground">
                  Your verification is being processed. This usually takes 1-2 business days.
                </p>
              </div>
            </div>
          ) : isRejected ? (
            <div className="flex items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <Badge variant="destructive" className="mb-2">Rejected</Badge>
                <p className="text-muted-foreground">
                  Your verification was not successful. Please try again or contact support.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <Badge variant="outline" className="mb-2">Not Verified</Badge>
                <p className="text-muted-foreground">
                  Complete identity verification to start investing.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Options */}
      {!isVerified && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Civic Pass Option */}
          <Card>
            <CardHeader>
              <CardTitle>Civic Pass</CardTitle>
              <CardDescription>
                Fast, on-chain identity verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Instant verification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  On-chain proof of identity
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Privacy-preserving
                </li>
              </ul>
              <Button 
                className="w-full" 
                onClick={startVerification}
                disabled={isVerified}
              >
                Start Civic Verification
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Traditional KYC Option */}
          <Card>
            <CardHeader>
              <CardTitle>Document Verification</CardTitle>
              <CardDescription>
                Traditional identity verification process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Government ID verification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Address verification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Accreditation check
                </li>
              </ul>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => startKYCMutation.mutate()}
                disabled={startKYCMutation.isPending || isVerified || isPending}
              >
                {startKYCMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    Start Document Verification
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Verified - Next Steps */}
      {isVerified && (
        <Card>
          <CardHeader>
            <CardTitle>You're Ready to Invest!</CardTitle>
            <CardDescription>
              Your identity has been verified. Explore available assets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Button asChild>
                <Link href="/marketplace">Browse Marketplace</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/my-portfolio">View Portfolio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
