'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  ArrowLeft,
  Edit,
  Coins,
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  ExternalLink,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Loader2,
  Trash2,
  Send,
  Play,
  Pause,
  Upload,
  Download,
  XCircle,
} from 'lucide-react';
import { formatCurrency, shortenAddress } from '@/lib/utils';
import { api, Asset, Transaction, AssetHolder, Document as AssetDocument } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

function getStatusBadge(status: string) {
  switch (status) {
    case 'TOKENIZED':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Tokenized</Badge>;
    case 'PENDING_APPROVAL':
    case 'PENDING_TOKENIZATION':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    case 'APPROVED':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approved</Badge>;
    case 'DRAFT':
      return <Badge variant="secondary">Draft</Badge>;
    case 'FAILED':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getAssetTypeLabel(type: string) {
  const labels: Record<string, string> = {
    REAL_ESTATE: 'Real Estate',
    EQUIPMENT: 'Equipment',
    RECEIVABLES: 'Receivables',
    COMMODITIES: 'Commodities',
    SECURITIES: 'Securities',
    OTHER: 'Other',
  };
  return labels[type] || type;
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const assetId = params.id as string;
  const [activeTab, setActiveTab] = useState('overview');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Action states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Data for tabs
  const [holders, setHolders] = useState<AssetHolder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const fetchAsset = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.assets.get(assetId);
      setAsset(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch asset');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (assetId) {
      fetchAsset();
    }
  }, [assetId, fetchAsset]);

  // Fetch holders when investors tab is selected
  useEffect(() => {
    if (activeTab === 'investors' && asset?.tokenizationStatus === 'TOKENIZED') {
      setHoldersLoading(true);
      api.assets.getHolders(assetId)
        .then(setHolders)
        .catch((err) => console.error('Failed to fetch holders:', err))
        .finally(() => setHoldersLoading(false));
    }
  }, [activeTab, assetId, asset?.tokenizationStatus]);

  // Fetch transactions when transactions tab is selected
  useEffect(() => {
    if (activeTab === 'transactions' && asset?.tokenizationStatus === 'TOKENIZED') {
      setTransactionsLoading(true);
      api.assets.getTransactions(assetId)
        .then((res) => setTransactions(res.data || []))
        .catch((err) => console.error('Failed to fetch transactions:', err))
        .finally(() => setTransactionsLoading(false));
    }
  }, [activeTab, assetId, asset?.tokenizationStatus]);

  // Action handlers
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.assets.delete(assetId);
      toast({
        title: 'Asset Deleted',
        description: 'The asset has been successfully deleted.',
      });
      router.push('/bank/assets');
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete asset',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitForReview = async () => {

    const hasAppraisal = asset.documents?.some(doc => doc.type === 'APPRAISAL');
    const hasLegalOpinion = asset.documents?.some(doc => doc.type === 'LEGAL_OPINION');
    if (!hasAppraisal || !hasLegalOpinion) {
      toast({
        title: 'Submission Failed',
        description: 'Missing required documents: APPRAISAL, LEGAL_OPINION',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await api.assets.submitForReview(assetId);
      setAsset(updated);
      toast({
        title: 'Submitted for Review',
        description: 'Your asset has been submitted for approval.',
      });
    } catch (err: any) {
      toast({
        title: 'Submission Failed',
        description: err.message || 'Failed to submit for review',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleListAsset = async () => {
    setIsListing(true);
    try {
      const updated = await api.assets.list_asset(assetId);
      setAsset(updated);
      toast({
        title: 'Asset Listed',
        description: 'Your asset is now listed on the marketplace.',
      });
    } catch (err: any) {
      toast({
        title: 'Listing Failed',
        description: err.message || 'Failed to list asset',
        variant: 'destructive',
      });
    } finally {
      setIsListing(false);
    }
  };

  const handleDelistAsset = async () => {
    setIsListing(true);
    try {
      const updated = await api.assets.delist_asset(assetId);
      setAsset(updated);
      toast({
        title: 'Asset Delisted',
        description: 'Your asset has been removed from the marketplace.',
      });
    } catch (err: any) {
      toast({
        title: 'Delist Failed',
        description: err.message || 'Failed to delist asset',
        variant: 'destructive',
      });
    } finally {
      setIsListing(false);
    }
  };

  const [selectedDocType, setSelectedDocType] = useState<'APPRAISAL' | 'LEGAL_OPINION' | 'PROSPECTUS' | 'AUDIT' | 'OTHER'>('APPRAISAL');
  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await api.assets.uploadDocument(assetId, file, selectedDocType);
      // Refresh asset to get updated documents
      await fetchAsset();
      toast({
        title: 'Document Uploaded',
        description: 'The document has been uploaded successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Upload Failed',
        description: err.message || 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDownloadDocument = async (doc: AssetDocument) => {
    try {
      const url = await api.assets.downloadDocument(assetId, doc.id);
      window.open(url, '_blank');
    } catch (err: any) {
      toast({
        title: 'Download Failed',
        description: err.message || 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await api.assets.deleteDocument(assetId, docId);
      await fetchAsset();
      toast({
        title: 'Document Deleted',
        description: 'The document has been deleted.',
      });
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Asset not found'}</p>
          <Button asChild variant="outline">
            <Link href="/bank/assets">Back to Assets</Link>
          </Button>
        </div>
      </div>
    );
  }

  const totalTokens = asset.totalSupply ? parseInt(asset.totalSupply) : 0;
  const tokensSold = asset._count?.holdings || 0;
  const tokensSoldPercent = totalTokens > 0 ? Math.round((tokensSold / totalTokens) * 100) : 0;
  const investors = asset._count?.holdings || 0;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/bank/assets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Link>
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{asset.name}</h1>
                {getStatusBadge(asset.tokenizationStatus)}
                {asset.listingStatus === 'LISTED' && (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Listed</Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {getAssetTypeLabel(asset.assetType)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Edit button - only for non-tokenized assets */}
            {asset.tokenizationStatus !== 'TOKENIZED' && (
              <Button asChild variant="outline">
                <Link href={`/bank/assets/${assetId}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}

            {/* Submit for Review - only for DRAFT status */}
            {asset.tokenizationStatus === 'DRAFT' && (
              <Button
                variant="outline"
                onClick={handleSubmitForReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit for Review
              </Button>
            )}

            {/* Tokenize button - for DRAFT or APPROVED */}
            {(asset.tokenizationStatus === 'DRAFT' || asset.tokenizationStatus === 'APPROVED') && (
              <Button asChild>
                <Link href={`/bank/assets/${assetId}/tokenize`}>
                  <Coins className="mr-2 h-4 w-4" />
                  Tokenize
                </Link>
              </Button>
            )}

            {/* List/Delist buttons - only for TOKENIZED assets */}
            {asset.tokenizationStatus === 'TOKENIZED' && asset.listingStatus !== 'LISTED' && (
              <Button onClick={handleListAsset} disabled={isListing}>
                {isListing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                List on Marketplace
              </Button>
            )}

            {asset.tokenizationStatus === 'TOKENIZED' && asset.listingStatus === 'LISTED' && (
              <Button variant="outline" onClick={handleDelistAsset} disabled={isListing}>
                {isListing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="mr-2 h-4 w-4" />
                )}
                Delist
              </Button>
            )}

            {/* Delete button - only for DRAFT status */}
            {asset.tokenizationStatus === 'DRAFT' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{asset.name}&quot;? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(asset.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokens Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tokensSoldPercent}%</div>
            <p className="text-xs text-muted-foreground">
              {tokensSold.toLocaleString()} / {totalTokens.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Investors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{investors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Price per Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(asset.pricePerToken)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="investors">Investors</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Asset Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{asset.description || 'No description provided'}</p>
                
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Type: {getAssetTypeLabel(asset.assetType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Created: {new Date(asset.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {asset.tokenizedAt && (
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Tokenized: {new Date(asset.tokenizedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Token Price</span>
                    <span className="font-medium">{formatCurrency(asset.pricePerToken)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Supply</span>
                    <span className="font-medium">{totalTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Circulating</span>
                    <span className="font-medium">{tokensSold.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className="font-medium">
                      {(totalTokens - tokensSold).toLocaleString()}
                    </span>
                  </div>
                </div>

                {asset.mintAddress && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Mint Address</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {shortenAddress(asset.mintAddress)}
                      </code>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Token Sale Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Token Sale Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${tokensSoldPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(tokensSold * asset.pricePerToken)} raised
                  </span>
                  <span className="font-medium">{tokensSoldPercent}% sold</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(asset.totalValue)} goal
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investors Tab */}
        <TabsContent value="investors">
          <Card>
            <CardHeader>
              <CardTitle>Top Token Holders</CardTitle>
              <CardDescription>Largest investors in this asset</CardDescription>
            </CardHeader>
            <CardContent>
              {holdersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : holders.length > 0 ? (
                <div className="space-y-4">
                  {holders.map((holder, index) => (
                    <div
                      key={holder.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">
                            {holder.user?.investorProfile 
                              ? `${holder.user.investorProfile.firstName} ${holder.user.investorProfile.lastName}`
                              : shortenAddress(holder.walletAddress)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {shortenAddress(holder.walletAddress)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{holder.tokenAmount.toLocaleString()} tokens</p>
                        <p className="text-xs text-muted-foreground">
                          {holder.percentage.toFixed(2)}% of supply
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : asset.tokenizationStatus === 'TOKENIZED' ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No investors yet</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Investors will appear here once tokens are purchased.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Asset not yet tokenized</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Investor data will be available once the asset is tokenized.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest buy/sell activity</CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${
                          tx.type === 'PRIMARY_SALE' || tx.type === 'SECONDARY_SALE' 
                            ? 'bg-green-100' 
                            : 'bg-blue-100'
                        }`}>
                          {tx.type === 'PRIMARY_SALE' || tx.type === 'SECONDARY_SALE' ? (
                            <ArrowUpRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {tx.type.replace('_', ' ').toLowerCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()} • {tx.tokenAmount} tokens
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(tx.amount)}</p>
                        <Badge 
                          variant={tx.status === 'COMPLETED' ? 'default' : 'secondary'}
                          className={tx.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : asset.tokenizationStatus === 'TOKENIZED' ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No transactions yet</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Transactions will appear here once tokens are traded.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Asset not yet tokenized</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Transactions will appear here once the asset is tokenized and traded.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Legal Documents</CardTitle>
                <CardDescription>Required documentation for this asset</CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={selectedDocType}
                  onChange={e => setSelectedDocType(e.target.value as any)}
                  disabled={isUploading}
                >
                  <option value="APPRAISAL">Appraisal</option>
                  <option value="LEGAL_OPINION">Legal Opinion</option>
                  <option value="PROSPECTUS">Prospectus</option>
                  <option value="AUDIT">Audit</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  type="file"
                  id="document-upload"
                  className="hidden"
                  onChange={handleUploadDocument}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('document-upload')?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {asset.documents && asset.documents.length > 0 ? (
                <div className="space-y-4">
                  {asset.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground uppercase">
                            {doc.type} • {(doc.sizeBytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadDocument(doc)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{doc.name}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents uploaded</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Upload legal documents, prospectuses, or other required files.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
