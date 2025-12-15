'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  ArrowLeft,
  Save,
  FileText,
  DollarSign,
  Settings,
  Coins,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { api, Asset } from '@/lib/api';

const assetTypes = [
  { value: 'REAL_ESTATE', label: 'Real Estate', icon: Building2 },
  { value: 'COMMODITIES', label: 'Commodity', icon: Coins },
  { value: 'EQUIPMENT', label: 'Equipment', icon: Settings },
  { value: 'RECEIVABLES', label: 'Receivables', icon: FileText },
];

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    totalValue: '',
  });

  // Fetch asset data on mount
  useEffect(() => {
    const fetchAsset = async () => {
      try {
        setIsLoading(true);
        const asset = await api.assets.get(assetId);
        setFormData({
          name: asset.name,
          description: asset.description || '',
          totalValue: String(asset.totalValue),
        });
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load asset');
        toast({
          title: 'Error',
          description: 'Failed to load asset details',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (assetId) {
      fetchAsset();
    }
  }, [assetId, toast]);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const updates: Partial<Asset> = {
        name: formData.name,
        description: formData.description || undefined,
        totalValue: parseFloat(formData.totalValue),
      };

      await api.assets.update(assetId, updates);
      
      toast({
        title: 'Asset Updated',
        description: 'Your changes have been saved successfully.',
      });
      router.push(`/bank/assets/${assetId}`);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update asset. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 max-w-2xl">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-48 mb-8" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8 max-w-2xl">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/bank/assets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => router.push('/bank/assets')}>
              Return to Assets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href={`/bank/assets/${assetId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Asset
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-2">Edit Asset</h1>
        <p className="text-muted-foreground">
          Update asset information
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
            <CardDescription>
              Edit the basic details of your asset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Asset Name</Label>
              <Input
                id="name"
                placeholder="e.g., Manhattan Office Tower"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Describe the asset, its features, and investment opportunity..."
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalValue">Total Asset Value</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="totalValue"
                  type="number"
                  placeholder="1000000"
                  className="pl-10"
                  value={formData.totalValue}
                  onChange={(e) => updateFormData('totalValue', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/bank/assets/${assetId}`)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !formData.name || !formData.totalValue}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
