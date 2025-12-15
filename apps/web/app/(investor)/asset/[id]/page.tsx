'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAsset, useAssetDocuments } from '@/hooks/useAssets';
import { usePurchaseAsset } from '@/hooks/useTransactions';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { useAuth } from '@/providers/AuthProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, shortenAddress } from '@/lib/utils';
import { AssetType } from '@/lib/api';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Coins,
  ExternalLink,
  FileText,
  Loader2,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';

const assetTypeLabels: Record<AssetType, string> = {
  REAL_ESTATE: 'Real Estate',
  COMMODITIES: 'Commodities',
  EQUIPMENT: 'Equipment',
  RECEIVABLES: 'Receivables',
  SECURITIES: 'Securities',
  OTHER: 'Other',
};

// Estimated yields per asset type
const estimatedYields: Record<AssetType, number> = {
  REAL_ESTATE: 8.5,
  COMMODITIES: 6.0,
  EQUIPMENT: 10.0,
  RECEIVABLES: 12.0,
  SECURITIES: 7.5,
  OTHER: 5.0,
};

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = params.id as string;
  const [mounted, setMounted] = useState(false);
  
  const { data: asset, isLoading } = useAsset(assetId);
  const { data: documents } = useAssetDocuments(assetId);
  const { isAuthenticated, login } = useAuth();
  const { isVerified } = useKYCStatus();
  const { toast } = useToast();
  
  const purchaseMutation = usePurchaseAsset();
  
  const [investAmount, setInvestAmount] = useState('');

  // Set mounted after hydration to safely use wallet hooks
  useEffect(() => {
    setMounted(true);
  }, []);

  // Only access wallet state after mounting
  const walletState = useWallet();
  const connected = mounted ? walletState.connected : false;
  const publicKey = mounted ? walletState.publicKey : null;

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Asset Not Found</h1>
        <Button asChild>
          <Link href="/marketplace">Back to Marketplace</Link>
        </Button>
      </div>
    );
  }

  const tokenPrice = asset.pricePerToken;
  const tokenAmount = investAmount ? parseFloat(investAmount) / tokenPrice : 0;
  const expectedYield = estimatedYields[asset.assetType];

  const handlePurchase = async () => {
    if (!investAmount || parseFloat(investAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid investment amount.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(investAmount);
    const tokens = Math.floor(amount / tokenPrice);

    if (tokens < 1) {
      toast({
        title: 'Minimum Purchase',
        description: `Minimum purchase is ${formatCurrency(tokenPrice)} (1 token).`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await purchaseMutation.mutateAsync({
        assetId: asset.id,
        amount,
        tokenAmount: tokens,
      });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleConnectAndLogin = async () => {
    if (!connected) {
      toast({
        title: 'Connect Wallet',
        description: 'Please connect your wallet first using the button in the header.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!isAuthenticated) {
      await login();
    }
  };

  return (
    <div className="container py-8">
      {/* Back button */}
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/marketplace">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Link>
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Image */}
          <div className="relative h-64 md:h-80 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
            {asset.metadataUri ? (
              <img
                src={asset.metadataUri}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Building2 className="h-24 w-24 text-primary/40" />
              </div>
            )}
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge>{assetTypeLabels[asset.assetType]}</Badge>
              <Badge variant="secondary">{asset.tokenizationStatus}</Badge>
            </div>
          </div>

          {/* Asset Info */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{asset.name}</h1>
            {asset.bank && (
              <p className="text-muted-foreground flex items-center mb-4">
                <Building2 className="h-4 w-4 mr-2" />
                Issued by {asset.bank.name}
              </p>
            )}
            <p className="text-muted-foreground">{asset.description}</p>
          </div>

          {/* Key Metrics */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-lg font-bold">{formatCurrency(asset.totalValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Yield</p>
                    <p className="text-lg font-bold text-green-600">
                      {expectedYield}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Token Holders</p>
                    <p className="text-lg font-bold">{asset._count?.holdings ?? '--'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Tabs */}
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Token Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Token Price</span>
                    <span className="font-medium">{formatCurrency(asset.pricePerToken)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total Supply</span>
                    <span className="font-medium">{BigInt(asset.totalSupply).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Tokenization Status</span>
                    <Badge variant="outline">{asset.tokenizationStatus}</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Listing Status</span>
                    <Badge variant="outline">{asset.listingStatus}</Badge>
                  </div>
                  {asset.tokenizedAt && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Tokenized Date</span>
                      <span className="font-medium flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(asset.tokenizedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {asset.mintAddress && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Mint Address</span>
                      <a
                        href={`https://explorer.solana.com/address/${asset.mintAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium flex items-center hover:text-primary"
                      >
                        {shortenAddress(asset.mintAddress)}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="documents" className="mt-4">
              <Card>
                {documents && documents.length > 0 ? (
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {doc.type} • {(doc.sizeBytes / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No documents available yet.
                  </CardContent>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No recent activity.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Invest Card */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Invest in This Asset</CardTitle>
              <CardDescription>
                Purchase tokens to become a fractional owner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Not connected or not authenticated */}
              {!connected ? (
                <div className="text-center py-4">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium mb-2">Connect Your Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    Connect a Solana wallet to invest
                  </p>
                </div>
              ) : !isAuthenticated ? (
                <div className="text-center py-4">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                  <p className="font-medium mb-2">Sign In Required</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign a message to authenticate
                  </p>
                  <Button onClick={handleConnectAndLogin} className="w-full">
                    Sign In with Wallet
                  </Button>
                </div>
              ) : !isVerified ? (
                <div className="text-center py-4">
                  <Shield className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="font-medium mb-2">KYC Required</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete identity verification to invest
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/kyc">Complete KYC</Link>
                  </Button>
                </div>
              ) : asset.listingStatus !== 'LISTED' ? (
                <div className="text-center py-4">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium mb-2">Not Available</p>
                  <p className="text-sm text-muted-foreground">
                    This asset is not currently available for purchase.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Investment Amount (USDC)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      min={tokenPrice}
                      step={tokenPrice}
                    />
                    {investAmount && parseFloat(investAmount) > 0 && (
                      <p className="text-sm text-muted-foreground">
                        ≈ {Math.floor(tokenAmount)} tokens
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Token Price</span>
                      <span>{formatCurrency(tokenPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expected Yield</span>
                      <span className="text-green-600">
                        {expectedYield}%
                      </span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(parseFloat(investAmount) || 0)}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    disabled={!investAmount || parseFloat(investAmount) <= 0 || purchaseMutation.isPending}
                    onClick={handlePurchase}
                  >
                    {purchaseMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Invest Now'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
