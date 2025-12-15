'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/providers/AuthProvider';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { api, InvestorProfile } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Shield, 
  Wallet, 
  Globe, 
  LogIn,
  Loader2,
  CheckCircle,
  Save,
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const walletState = useWallet();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const connected = mounted ? walletState.connected : false;
  const { isAuthenticated, isLoading: authLoading, user, login, refreshUser } = useAuth();
  const { isVerified, status: kycStatus } = useKYCStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [firstName, setFirstName] = useState(user?.investorProfile?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.investorProfile?.lastName ?? '');
  const [country, setCountry] = useState(user?.investorProfile?.country ?? '');
  const [investorType, setInvestorType] = useState<'INDIVIDUAL' | 'INSTITUTIONAL'>(
    user?.investorProfile?.investorType ?? 'INDIVIDUAL'
  );
  const [riskTolerance, setRiskTolerance] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(
    user?.investorProfile?.riskTolerance ?? 'MEDIUM'
  );

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (profile: Partial<InvestorProfile>) => api.users.updateProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      refreshUser();
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      firstName,
      lastName,
      country,
      investorType,
      riskTolerance,
    });
  };

  // Not connected
  if (!connected) {
    return (
      <div className="container py-8">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-16 text-center">
            <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your Solana wallet to view your profile.
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
              Sign in to view and manage your profile.
            </p>
            <Button onClick={login}>Sign In with Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                      <SelectItem value="SG">Singapore</SelectItem>
                      <SelectItem value="AE">United Arab Emirates</SelectItem>
                      <SelectItem value="CH">Switzerland</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="investorType">Investor Type</Label>
                  <Select 
                    value={investorType} 
                    onValueChange={(v) => setInvestorType(v as 'INDIVIDUAL' | 'INSTITUTIONAL')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                      <SelectItem value="INSTITUTIONAL">Institutional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                  <Select 
                    value={riskTolerance} 
                    onValueChange={(v) => setRiskTolerance(v as 'LOW' | 'MEDIUM' | 'HIGH')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low - Conservative investments</SelectItem>
                      <SelectItem value="MEDIUM">Medium - Balanced approach</SelectItem>
                      <SelectItem value="HIGH">High - Aggressive growth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
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
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Wallet Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" />
                Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Connected Address</p>
                <p className="font-mono text-xs break-all">
                  {user?.walletAddress}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">KYC Status</span>
                {isVerified ? (
                  <Badge className="bg-green-600">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary">{kycStatus}</Badge>
                )}
              </div>
              
              {user?.investorProfile?.accreditationStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Accreditation</span>
                  <Badge variant="outline">
                    {user.investorProfile.accreditationStatus}
                  </Badge>
                </div>
              )}

              {!isVerified && (
                <Button asChild variant="outline" className="w-full" size="sm">
                  <Link href="/kyc">Complete Verification</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="outline">{user?.role}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Since</span>
                <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '--'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
