"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Coins,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  AlertCircle,
  Play,
  Pause,
  Send,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAssets } from "@/hooks/useAssets";
import {
  api,
  Asset,
  AssetType,
  ListingStatus,
  TokenizationStatus,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const assetTypes = [
  { value: "all", label: "All Types" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "COMMODITIES", label: "Commodities" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "RECEIVABLES", label: "Receivables" },
];

const statusFilters = [
  { value: "all", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_TOKENIZATION", label: "Pending" },
  { value: "TOKENIZED", label: "Tokenized" },
];

function getTokenizationStatusBadge(status: TokenizationStatus) {
  switch (status) {
    case "TOKENIZED":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Tokenized
        </Badge>
      );
    case "PENDING_TOKENIZATION":
    case "PENDING_REVIEW":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case "DRAFT":
      return (
        <Badge variant="outline">
          <Edit className="mr-1 h-3 w-3" />
          Draft
        </Badge>
      );
    case "FAILED":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getListingStatusBadge(status: ListingStatus) {
  switch (status) {
    case "LISTED":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Listed
        </Badge>
      );
    case "UNLISTED":
      return <Badge variant="outline">Unlisted</Badge>;
    case "PAUSED":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          Paused
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function BankAssetsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Action states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch assets from API
  const {
    data: assetsResponse,
    isLoading,
    error,
    refetch,
  } = useAssets({
    type: selectedType === "all" ? undefined : (selectedType as AssetType),
  });

  // Extract assets from response
  const assets = useMemo(() => {
    return assetsResponse?.data ?? [];
  }, [assetsResponse]);

  // Filter assets by search and status
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        !searchQuery.trim() ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatus === "all" || asset.tokenizationStatus === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [assets, searchQuery, selectedStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);
    const tokenizedAssets = assets.filter(
      (a) => a.tokenizationStatus === "TOKENIZED",
    ).length;
    const pendingAssets = assets.filter(
      (a) =>
        a.tokenizationStatus === "PENDING_TOKENIZATION" ||
        a.tokenizationStatus === "PENDING_REVIEW",
    ).length;
    return {
      totalValue,
      tokenizedAssets,
      pendingAssets,
      totalAssets: assets.length,
    };
  }, [assets]);

  // Action handlers
  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;

    setIsDeleting(true);
    try {
      await api.assets.delete(assetToDelete.id);
      toast({
        title: "Asset Deleted",
        description: `"${assetToDelete.name}" has been deleted.`,
      });
      refetch(); // Refresh the list
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to delete asset",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    }
  };

  const handleSubmitForReview = async (asset: Asset) => {
    setActionLoading(asset.id);
    try {
      await api.assets.submitForReview(asset.id);
      toast({
        title: "Submitted for Review",
        description: `"${asset.name}" has been submitted for approval.`,
      });
      refetch(); // Refresh the list
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to submit for review",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleListAsset = async (asset: Asset) => {
    setActionLoading(asset.id);
    try {
      await api.assets.list_asset(asset.id);
      toast({
        title: "Asset Listed",
        description: `"${asset.name}" is now listed on the marketplace.`,
      });
      refetch(); // Refresh the list
    } catch (err: any) {
      toast({
        title: "Listing Failed",
        description: err.message || "Failed to list asset",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelistAsset = async (asset: Asset) => {
    setActionLoading(asset.id);
    try {
      await api.assets.delist_asset(asset.id);
      toast({
        title: "Asset Delisted",
        description: `"${asset.name}" has been removed from the marketplace.`,
      });
      refetch(); // Refresh the list
    } catch (err: any) {
      toast({
        title: "Delist Failed",
        description: err.message || "Failed to delist asset",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="container py-8">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{assetToDelete?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAsset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Asset Management</h1>
          <p className="text-muted-foreground">
            Manage and tokenize your real-world assets
          </p>
        </div>
        <Button asChild className="mt-4 md:mt-0">
          <Link href="/bank/assets/new">
            <Plus className="mr-2 h-4 w-4" />
            Create New Asset
          </Link>
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-8 border-destructive">
          <CardContent className="py-6 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load assets. Please try again.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalAssets}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                ${(stats.totalValue / 1000000).toFixed(1)}M
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokenized
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {stats.tokenizedAssets}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingAssets}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList>
            {assetTypes.slice(0, 4).map((type) => (
              <TabsTrigger key={type.value} value={type.value}>
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            {statusFilters.map((status) => (
              <TabsTrigger key={status.value} value={status.value}>
                {status.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Asset</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Total Value</th>
                  <th className="text-right p-4 font-medium">Tokens Sold</th>
                  <th className="text-right p-4 font-medium">Investors</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Created{" "}
                            {new Date(asset.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-sm">
                        {asset.assetType.replace("_", " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {getTokenizationStatusBadge(asset.tokenizationStatus)}
                        {asset.listingStatus === "LISTED" &&
                          getListingStatusBadge(asset.listingStatus)}
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium">
                      {formatCurrency(asset.totalValue)}
                    </td>
                    <td className="p-4 text-right">
                      {asset.tokenizationStatus === "TOKENIZED" ? (
                        <span className="text-green-600">
                          {asset._count?.holdings || 0}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {asset._count?.transactions || "-"}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionLoading === asset.id}
                          >
                            {actionLoading === asset.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* View Details - always available */}
                          <DropdownMenuItem asChild>
                            <Link href={`/bank/assets/${asset.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>

                          {/* Edit - only for non-tokenized assets */}
                          {asset.tokenizationStatus !== "TOKENIZED" && (
                            <DropdownMenuItem asChild>
                              <Link href={`/bank/assets/${asset.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {/* Submit for Review - only for DRAFT */}
                          {asset.tokenizationStatus === "DRAFT" && (
                            <DropdownMenuItem
                              onClick={() => handleSubmitForReview(asset)}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Submit for Review
                            </DropdownMenuItem>
                          )}

                          {/* Tokenize - for DRAFT or PENDING_TOKENIZATION */}
                          {(asset.tokenizationStatus === "DRAFT" ||
                            asset.tokenizationStatus ===
                              "PENDING_TOKENIZATION") && (
                            <DropdownMenuItem asChild>
                              <Link href={`/bank/assets/${asset.id}/tokenize`}>
                                <Coins className="mr-2 h-4 w-4" />
                                Tokenize
                              </Link>
                            </DropdownMenuItem>
                          )}

                          {/* List on Marketplace - for tokenized but not listed */}
                          {asset.tokenizationStatus === "TOKENIZED" &&
                            asset.listingStatus !== "LISTED" && (
                              <DropdownMenuItem
                                onClick={() => handleListAsset(asset)}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                List on Marketplace
                              </DropdownMenuItem>
                            )}

                          {/* Delist - for listed assets */}
                          {asset.tokenizationStatus === "TOKENIZED" &&
                            asset.listingStatus === "LISTED" && (
                              <DropdownMenuItem
                                onClick={() => handleDelistAsset(asset)}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Delist from Marketplace
                              </DropdownMenuItem>
                            )}

                          {/* Delete - only for DRAFT */}
                          {asset.tokenizationStatus === "DRAFT" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setAssetToDelete(asset);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading assets...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredAssets.length === 0 && (
            <div className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No assets found matching your criteria
              </p>
              <Button asChild>
                <Link href="/bank/assets/new">Create Your First Asset</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
