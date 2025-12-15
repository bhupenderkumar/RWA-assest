'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Upload,
  ArrowLeft,
  ArrowRight,
  Save,
  FileText,
  MapPin,
  DollarSign,
  Settings,
  Image,
  CheckCircle2,
  Coins,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

const assetTypes = [
  { value: 'REAL_ESTATE', label: 'Real Estate', icon: Building2, description: 'Commercial or residential properties' },
  { value: 'COMMODITIES', label: 'Commodity', icon: Coins, description: 'Precious metals, agricultural products' },
  { value: 'EQUIPMENT', label: 'Equipment', icon: Settings, description: 'Machinery, vehicles, infrastructure' },
  { value: 'RECEIVABLES', label: 'Receivables', icon: FileText, description: 'Invoices, loans, credit facilities' },
];

export default function NewAssetPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    type: '',
    description: '',
    // Step 2: Location & Details
    address: '',
    city: '',
    state: '',
    country: '',
    jurisdiction: 'US',
    // Step 3: Financial Details
    totalValue: '',
    totalSupply: '',
    minimumInvestment: '',
    expectedYield: '',
    currency: 'USD',
    // Step 4: Documents
    documents: [] as File[],
    images: [] as File[],
  });

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const totalValue = parseFloat(formData.totalValue);
      const totalSupply = formData.totalSupply ? parseInt(formData.totalSupply) : Math.floor(totalValue / 100);
      
      const asset = await api.assets.create({
        name: formData.name,
        assetType: formData.type as 'REAL_ESTATE' | 'COMMODITIES' | 'EQUIPMENT' | 'RECEIVABLES',
        description: formData.description || undefined,
        totalValue,
        totalSupply,
      });
      
      // If we get here, the asset was created successfully
      toast({
        title: 'Asset Created',
        description: `${asset.name} has been created successfully.`,
      });
      router.push('/bank/assets');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create asset. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.type && formData.description;
      case 2:
        return formData.address && formData.city && formData.country;
      case 3:
        return formData.totalValue && formData.minimumInvestment;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/bank/assets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-2">Create New Asset</h1>
        <p className="text-muted-foreground">
          Add a new real-world asset for tokenization
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  step < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step}
              </div>
              {step < 4 && (
                <div
                  className={`h-1 w-full min-w-[60px] mx-2 ${
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className={currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}>
            Basic Info
          </span>
          <span className={currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}>
            Location
          </span>
          <span className={currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}>
            Financial
          </span>
          <span className={currentStep >= 4 ? 'text-primary' : 'text-muted-foreground'}>
            Documents
          </span>
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Enter the basic details about your asset
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
              />
            </div>

            <div className="space-y-2">
              <Label>Asset Type</Label>
              <div className="grid gap-4 md:grid-cols-2">
                {assetTypes.map((type) => (
                  <div
                    key={type.value}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                      formData.type === type.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    }`}
                    onClick={() => updateFormData('type', type.value)}
                  >
                    <div className="flex items-center gap-3">
                      <type.icon className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
          </CardContent>
        </Card>
      )}

      {/* Step 2: Location & Details */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Location & Details</CardTitle>
            <CardDescription>
              Specify the location and jurisdiction of the asset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="New York"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  placeholder="NY"
                  value={formData.state}
                  onChange={(e) => updateFormData('state', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="United States"
                  value={formData.country}
                  onChange={(e) => updateFormData('country', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Regulatory Jurisdiction</Label>
                <select
                  id="jurisdiction"
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={formData.jurisdiction}
                  onChange={(e) => updateFormData('jurisdiction', e.target.value)}
                >
                  <option value="US">United States (SEC)</option>
                  <option value="EU">European Union (MiFID II)</option>
                  <option value="UK">United Kingdom (FCA)</option>
                  <option value="SG">Singapore (MAS)</option>
                  <option value="CH">Switzerland (FINMA)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Financial Details */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
            <CardDescription>
              Set the valuation and token parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
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
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalSupply">Total Token Supply</Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="totalSupply"
                    type="number"
                    placeholder={formData.totalValue ? String(Math.floor(parseFloat(formData.totalValue) / 100)) : '10000'}
                    className="pl-10"
                    value={formData.totalSupply}
                    onChange={(e) => updateFormData('totalSupply', e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to auto-calculate based on $100 per token
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minimumInvestment">Minimum Investment</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="minimumInvestment"
                    type="number"
                    placeholder="1,000"
                    className="pl-10"
                    value={formData.minimumInvestment}
                    onChange={(e) => updateFormData('minimumInvestment', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedYield">Expected Annual Yield (%)</Label>
                <Input
                  id="expectedYield"
                  type="number"
                  step="0.1"
                  placeholder="8.5"
                  value={formData.expectedYield}
                  onChange={(e) => updateFormData('expectedYield', e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Token Economics Preview</p>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tokens:</span>
                  <span className="font-medium">
                    {formData.totalSupply
                      ? parseInt(formData.totalSupply).toLocaleString()
                      : formData.totalValue
                      ? Math.floor(parseFloat(formData.totalValue) / 100).toLocaleString()
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token Price:</span>
                  <span className="font-medium">
                    {formData.totalValue && (formData.totalSupply || formData.totalValue)
                      ? `$${(parseFloat(formData.totalValue) / (formData.totalSupply ? parseInt(formData.totalSupply) : Math.floor(parseFloat(formData.totalValue) / 100))).toFixed(2)}`
                      : '$100.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min. Tokens per Investor:</span>
                  <span className="font-medium">
                    {formData.minimumInvestment && formData.totalValue
                      ? Math.ceil(parseFloat(formData.minimumInvestment) / (parseFloat(formData.totalValue) / (formData.totalSupply ? parseInt(formData.totalSupply) : Math.floor(parseFloat(formData.totalValue) / 100)))).toLocaleString()
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Documents */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents & Media</CardTitle>
            <CardDescription>
              Upload legal documents and asset images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Legal Documents</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium mb-1">Drop files here or click to upload</p>
                <p className="text-xs text-muted-foreground mb-4">
                  PPM, Subscription Agreement, Operating Agreement (PDF, DOC)
                </p>
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Select Files
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Asset Images</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium mb-1">Drop images here or click to upload</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Property photos, floor plans, site maps (JPG, PNG)
                </p>
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Select Images
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Asset Summary</p>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{formData.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">
                    {formData.type?.replace('_', ' ') || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">
                    {formData.city && formData.country
                      ? `${formData.city}, ${formData.country}`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-medium">
                    {formData.totalValue
                      ? `$${parseInt(formData.totalValue).toLocaleString()}`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((prev) => prev - 1)}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        {currentStep < 4 ? (
          <Button onClick={() => setCurrentStep((prev) => prev + 1)} disabled={!canProceed()}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              'Creating...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Asset
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
