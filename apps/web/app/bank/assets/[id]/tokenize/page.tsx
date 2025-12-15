'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  CheckCircle2,
  AlertCircle,
  Shield,
  FileCheck,
  Loader2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { api, Asset } from '@/lib/api';

const tokenizationSteps = [
  {
    id: 1,
    title: 'Configuration',
    description: 'Set token parameters',
  },
  {
    id: 2,
    title: 'Compliance',
    description: 'Configure transfer restrictions',
  },
  {
    id: 3,
    title: 'Review',
    description: 'Confirm settings',
  },
  {
    id: 4,
    title: 'Deploy',
    description: 'Create on-chain',
  },
];

export default function TokenizePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const assetId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentComplete, setDeploymentComplete] = useState(false);
  const [mintAddress, setMintAddress] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch asset data
  useEffect(() => {
    async function fetchAsset() {
      try {
        setLoading(true);
        const data = await api.assets.get(assetId);
        setAsset(data);
        
        // Pre-populate config based on asset
        const tokenSymbol = data.name
          .split(' ')
          .map((w) => w.charAt(0))
          .join('')
          .toUpperCase()
          .slice(0, 5);
        const totalSupply = data.totalSupply ? parseInt(data.totalSupply) : Math.floor(data.totalValue / 100);
        const tokenPrice = totalSupply > 0 ? data.totalValue / totalSupply : 100;
        
        setConfig((prev) => ({
          ...prev,
          tokenName: data.name.replace(/\s+/g, ''),
          tokenSymbol,
          totalSupply,
          tokenPrice,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch asset');
      } finally {
        setLoading(false);
      }
    }
    if (assetId) {
      fetchAsset();
    }
  }, [assetId]);

  const [config, setConfig] = useState({
    // Step 1: Token Configuration
    tokenName: '',
    tokenSymbol: '',
    tokenDecimals: 6,
    totalSupply: 0,
    tokenPrice: 100,
    // Step 2: Compliance
    requireKYC: true,
    requireAccreditation: true,
    transferRestrictions: true,
    maxHoldersLimit: 2000,
    minInvestment: 10000,
    maxInvestment: 1000000,
    lockupPeriod: 12, // months
    allowedJurisdictions: ['US', 'EU', 'UK', 'SG', 'CH'],
  });

  const updateConfig = (field: string, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeploy = async () => {
    if (!config.tokenSymbol || config.tokenSymbol.length < 3) {
      toast({
        title: 'Validation Error',
        description: 'Token symbol must be at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }
    setIsDeploying(true);
    try {
      // Call the actual tokenization API with configuration
      const tokenizedAsset = await api.assets.tokenize(assetId, {
        symbol: config.tokenSymbol,
        minimumInvestment: config.minInvestment,
        maximumInvestment: config.maxInvestment,
      });
      // Update local state with the result
      setAsset(tokenizedAsset);
      setMintAddress(tokenizedAsset.mintAddress || 'Pending...');
      setDeploymentComplete(true);
      toast({
        title: 'Tokenization Complete!',
        description: 'Your asset has been successfully tokenized on Solana.',
      });
    } catch (error: any) {
      toast({
        title: 'Deployment Failed',
        description: error.message || 'Failed to deploy token. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Address copied to clipboard',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="container py-8 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-48 mb-8" />
        <div className="flex justify-between mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-full" />
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !asset) {
    return (
      <div className="container py-8 max-w-4xl">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/bank/assets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading Asset</h2>
            <p className="text-muted-foreground mb-4">{error || 'Asset not found'}</p>
            <Button onClick={() => router.push('/bank/assets')}>
              Return to Assets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if asset can be tokenized
  if (asset.tokenizationStatus !== 'DRAFT' && asset.tokenizationStatus !== 'APPROVED') {
    return (
      <div className="container py-8 max-w-4xl">
        <Button asChild variant="ghost" className="mb-4">
          <Link href={`/bank/assets/${assetId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Asset
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Cannot Tokenize</h2>
            <p className="text-muted-foreground mb-4">
              This asset is currently in &quot;{asset.tokenizationStatus}&quot; status and cannot be tokenized.
              {asset.tokenizationStatus === 'TOKENIZED' && ' It has already been tokenized.'}
            </p>
            <Button onClick={() => router.push(`/bank/assets/${assetId}`)}>
              View Asset Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (deploymentComplete) {
    return (
      <div className="container py-8 max-w-2xl">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Tokenization Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Your asset has been successfully tokenized on the Solana blockchain.
            </p>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Token Mint Address</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono">{mintAddress}</code>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(mintAddress)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 text-sm mb-8">
              <div className="flex justify-between p-3 bg-muted/50 rounded">
                <span>Token Name</span>
                <span className="font-medium">{config.tokenName}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded">
                <span>Token Symbol</span>
                <span className="font-medium">{config.tokenSymbol}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded">
                <span>Total Supply</span>
                <span className="font-medium">{config.totalSupply.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded">
                <span>Token Price</span>
                <span className="font-medium">{formatCurrency(config.tokenPrice)}</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href={`/bank/assets/${assetId}`}>View Asset</Link>
              </Button>
              <Button asChild>
                <Link href="/bank/assets">Back to Assets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href={`/bank/assets/${assetId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Asset
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-2">Tokenize Asset</h1>
        <p className="text-muted-foreground">
          Create Token-2022 tokens for {asset.name}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {tokenizationSteps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    step.id < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step.id === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.id < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step.id}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${step.id === currentStep ? 'text-primary' : ''}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden md:block">{step.description}</p>
                </div>
              </div>
              {index < tokenizationSteps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    step.id < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Token Configuration */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Token Configuration
            </CardTitle>
            <CardDescription>
              Configure the token parameters for your asset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tokenName">Token Name</Label>
                <Input
                  id="tokenName"
                  value={config.tokenName}
                  onChange={(e) => updateConfig('tokenName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokenSymbol">Token Symbol</Label>
                <Input
                  id="tokenSymbol"
                  value={config.tokenSymbol}
                  onChange={(e) => updateConfig('tokenSymbol', e.target.value.toUpperCase())}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="totalSupply">Total Supply</Label>
                <Input
                  id="totalSupply"
                  type="number"
                  value={config.totalSupply}
                  onChange={(e) => updateConfig('totalSupply', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Based on asset value of {formatCurrency(asset.totalValue)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokenPrice">Token Price (USD)</Label>
                <Input
                  id="tokenPrice"
                  type="number"
                  value={config.tokenPrice}
                  onChange={(e) => updateConfig('tokenPrice', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="decimals">Token Decimals</Label>
              <select
                id="decimals"
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={config.tokenDecimals}
                onChange={(e) => updateConfig('tokenDecimals', parseInt(e.target.value))}
              >
                <option value={0}>0 (Whole tokens only)</option>
                <option value={2}>2 (0.01 precision)</option>
                <option value={6}>6 (Standard SPL)</option>
                <option value={9}>9 (High precision)</option>
              </select>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Token-2022 Standard
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Tokens will be created using Solana's Token-2022 program with transfer hooks
                    for compliance enforcement.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Compliance Configuration */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance Configuration
            </CardTitle>
            <CardDescription>
              Set up transfer restrictions and compliance rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Require KYC Verification</p>
                  <p className="text-sm text-muted-foreground">
                    Only verified investors can hold tokens
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.requireKYC}
                  onChange={(e) => updateConfig('requireKYC', e.target.checked)}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Require Accreditation</p>
                  <p className="text-sm text-muted-foreground">
                    Only accredited investors can participate
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.requireAccreditation}
                  onChange={(e) => updateConfig('requireAccreditation', e.target.checked)}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Transfer Restrictions</p>
                  <p className="text-sm text-muted-foreground">
                    Enforce compliance on all token transfers
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.transferRestrictions}
                  onChange={(e) => updateConfig('transferRestrictions', e.target.checked)}
                  className="h-5 w-5"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minInvestment">Minimum Investment (USD)</Label>
                <Input
                  id="minInvestment"
                  type="number"
                  value={config.minInvestment}
                  onChange={(e) => updateConfig('minInvestment', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxInvestment">Maximum Investment (USD)</Label>
                <Input
                  id="maxInvestment"
                  type="number"
                  value={config.maxInvestment}
                  onChange={(e) => updateConfig('maxInvestment', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxHolders">Maximum Token Holders</Label>
                <Input
                  id="maxHolders"
                  type="number"
                  value={config.maxHoldersLimit}
                  onChange={(e) => updateConfig('maxHoldersLimit', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Reg D 506(c) limit: 2,000</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lockup">Lockup Period (Months)</Label>
                <Input
                  id="lockup"
                  type="number"
                  value={config.lockupPeriod}
                  onChange={(e) => updateConfig('lockupPeriod', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allowed Jurisdictions</Label>
              <div className="flex flex-wrap gap-2">
                {['US', 'EU', 'UK', 'SG', 'CH', 'JP', 'AU', 'CA'].map((j) => (
                  <Badge
                    key={j}
                    variant={config.allowedJurisdictions.includes(j) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const updated = config.allowedJurisdictions.includes(j)
                        ? config.allowedJurisdictions.filter((x) => x !== j)
                        : [...config.allowedJurisdictions, j];
                      updateConfig('allowedJurisdictions', updated);
                    }}
                  >
                    {j}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Review Configuration
            </CardTitle>
            <CardDescription>
              Review your token settings before deployment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-medium">Token Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{config.tokenName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Symbol</span>
                    <span className="font-medium">{config.tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total Supply</span>
                    <span className="font-medium">{config.totalSupply.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Price per Token</span>
                    <span className="font-medium">{formatCurrency(config.tokenPrice)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Decimals</span>
                    <span className="font-medium">{config.tokenDecimals}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Compliance Rules</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">KYC Required</span>
                    <Badge variant={config.requireKYC ? 'default' : 'secondary'}>
                      {config.requireKYC ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Accreditation</span>
                    <Badge variant={config.requireAccreditation ? 'default' : 'secondary'}>
                      {config.requireAccreditation ? 'Required' : 'Optional'}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Transfer Restrictions</span>
                    <Badge variant={config.transferRestrictions ? 'default' : 'secondary'}>
                      {config.transferRestrictions ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Min Investment</span>
                    <span className="font-medium">{formatCurrency(config.minInvestment)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Max Holders</span>
                    <span className="font-medium">{config.maxHoldersLimit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Lockup Period</span>
                    <span className="font-medium">{config.lockupPeriod} months</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Important Notice
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Once deployed, token parameters cannot be changed. Transfer restrictions can be
                    updated but the core token configuration is immutable.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Deploy */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Deploy Token
            </CardTitle>
            <CardDescription>
              Create your token on the Solana blockchain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              {isDeploying ? (
                <>
                  <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
                  <h3 className="text-xl font-bold mb-2">Deploying Token...</h3>
                  <p className="text-muted-foreground">
                    Please wait while we create your token on-chain
                  </p>
                </>
              ) : (
                <>
                  <Coins className="h-16 w-16 text-primary mx-auto mb-6" />
                  <h3 className="text-xl font-bold mb-2">Ready to Deploy</h3>
                  <p className="text-muted-foreground mb-6">
                    Click the button below to create your Token-2022 token
                  </p>
                  <Button size="lg" onClick={handleDeploy}>
                    <Coins className="mr-2 h-5 w-5" />
                    Deploy Token
                  </Button>
                </>
              )}
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Deployment Details</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium">Solana Devnet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Program</span>
                  <span className="font-medium">Token-2022</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="font-medium">~0.02 SOL</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      {currentStep < 4 && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button onClick={() => setCurrentStep((prev) => prev + 1)}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {currentStep === 4 && !isDeploying && (
        <div className="flex justify-start mt-6">
          <Button variant="outline" onClick={() => setCurrentStep(3)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review
          </Button>
        </div>
      )}
    </div>
  );
}
