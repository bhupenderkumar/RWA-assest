'use client';

import { useGateway } from '@civic/solana-gateway-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKYCStatus, useCivicVerification } from '@/hooks/useKYCStatus';
import { CheckCircle2, Clock, XCircle, Shield, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function KYCVerification() {
  const { publicKey } = useWallet();
  const { status, isLoading } = useKYCStatus();
  const { startVerification } = useCivicVerification();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartVerification = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      await startVerification();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!publicKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            KYC Verification Required
          </CardTitle>
          <CardDescription>
            Connect your wallet to start the verification process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please connect your wallet to verify your identity and access all platform features.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          KYC Verification
        </CardTitle>
        <CardDescription>
          Verify your identity to access all investment opportunities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div className="flex items-center gap-3">
            <StatusIcon status={status} />
            <div>
              <p className="font-medium">Verification Status</p>
              <p className="text-sm text-muted-foreground">
                {getStatusDescription(status)}
              </p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Verification Steps */}
        {status === 'NONE' && (
          <div className="space-y-4">
            <h4 className="font-medium">What you'll need:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Valid government-issued ID
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Selfie for identity matching
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Proof of address (optional)
              </li>
            </ul>
            
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              onClick={handleStartVerification}
              disabled={isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Verification...
                </>
              ) : (
                'Start Verification with Civic'
              )}
            </Button>
          </div>
        )}

        {status === 'PENDING' && (
          <div className="text-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="font-medium">Verification in Progress</p>
            <p className="text-sm text-muted-foreground">
              This usually takes 2-5 minutes. Please don't close this window.
            </p>
          </div>
        )}

        {status === 'VERIFIED' && (
          <div className="text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="font-medium text-lg">You're Verified!</p>
            <p className="text-sm text-muted-foreground">
              You now have full access to all investment opportunities.
            </p>
          </div>
        )}

        {status === 'REJECTED' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="font-medium text-lg">Verification Failed</p>
              <p className="text-sm text-muted-foreground">
                Your verification was not successful. Please try again.
              </p>
            </div>
            <Button onClick={handleStartVerification} className="w-full">
              Retry Verification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'VERIFIED':
      return <CheckCircle2 className="h-8 w-8 text-green-500" />;
    case 'PENDING':
      return <Clock className="h-8 w-8 text-yellow-500" />;
    case 'REJECTED':
      return <XCircle className="h-8 w-8 text-destructive" />;
    default:
      return <Shield className="h-8 w-8 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'VERIFIED':
      return <Badge variant="success">Verified</Badge>;
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">Not Started</Badge>;
  }
}

function getStatusDescription(status: string): string {
  switch (status) {
    case 'VERIFIED':
      return 'Your identity has been verified';
    case 'PENDING':
      return 'Verification in progress';
    case 'REJECTED':
      return 'Verification was unsuccessful';
    default:
      return 'Complete KYC to invest';
  }
}
