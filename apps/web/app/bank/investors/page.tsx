'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Search,
  MoreVertical,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Mail,
  Filter,
  Download,
  UserCheck,
  UserX,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { formatCurrency, shortenAddress } from '@/lib/utils';
import { api, BankInvestor } from '@/lib/api';

// Note: In a production app, you would fetch investors from an API
// For now, we derive investor data from asset holdings

const kycStatusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

function getKYCStatusBadge(status: string) {
  switch (status) {
    case 'verified':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Verified
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="mr-1 h-3 w-3" />
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getAccreditationBadge(status: string) {
  switch (status) {
    case 'verified':
      return <Badge variant="default">Accredited</Badge>;
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'expired':
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Expired</Badge>
      );
    case 'not_required':
      return <Badge variant="outline">Not Required</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function InvestorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);
  
  // Fetch investors from API
  const { data: investorsResponse, isLoading } = useQuery({
    queryKey: ['bank-investors', page, selectedStatus !== 'all' ? selectedStatus : undefined, searchQuery || undefined],
    queryFn: () => api.users.getBankInvestors({
      page,
      limit: 20,
      kycStatus: selectedStatus !== 'all' ? selectedStatus.toUpperCase() : undefined,
      search: searchQuery || undefined,
    }),
  });
  
  const investors = investorsResponse?.data ?? [];
  const meta = investorsResponse?.meta;
  
  // Calculate stats from fetched data
  const totalInvestors = meta?.total ?? 0;
  const verifiedInvestors = investors.filter((i) => i.kycStatus === 'VERIFIED').length;
  const pendingKYC = investors.filter((i) => i.kycStatus === 'PENDING' || i.kycStatus === 'IN_PROGRESS').length;
  const totalInvested = investors.reduce((sum, i) => sum + i.totalInvested, 0);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Investor Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage investor KYC and compliance
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvestors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verified KYC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedInvestors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingKYC}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalInvested / 1000000).toFixed(1)}M</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by wallet or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            {kycStatusFilters.map((status) => (
              <TabsTrigger key={status.value} value={status.value}>
                {status.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Investors Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : investors.length === 0 ? (
            <div className="py-16 text-center">
              <UserPlus className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-lg font-semibold mb-2">No Investors Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Investors will appear here once they purchase tokens from your listed assets.
                Start by creating and listing an asset.
              </p>
              <Button asChild>
                <Link href="/bank/assets/new">
                  Create Asset
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Investor</th>
                    <th className="text-left p-4 font-medium">KYC Status</th>
                    <th className="text-left p-4 font-medium">Accreditation</th>
                    <th className="text-left p-4 font-medium">Country</th>
                    <th className="text-right p-4 font-medium">Total Invested</th>
                    <th className="text-right p-4 font-medium">Assets</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {investors.map((investor) => (
                    <tr
                      key={investor.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            {investor.investorProfile ? (
                              <p className="font-medium text-sm">
                                {investor.investorProfile.firstName} {investor.investorProfile.lastName}
                              </p>
                            ) : (
                              <p className="font-mono text-sm">
                                {investor.walletAddress ? shortenAddress(investor.walletAddress) : 'N/A'}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">{investor.email || investor.walletAddress}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{getKYCStatusBadge(investor.kycStatus.toLowerCase())}</td>
                      <td className="p-4">{getAccreditationBadge(investor.investorProfile?.accreditationStatus?.toLowerCase() || 'none')}</td>
                      <td className="p-4">
                        <Badge variant="outline">{investor.investorProfile?.country || 'N/A'}</Badge>
                      </td>
                      <td className="p-4 text-right font-medium">
                        {investor.totalInvested > 0 ? formatCurrency(investor.totalInvested) : '-'}
                      </td>
                      <td className="p-4 text-right">{investor.assetsHeld || '-'}</td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            {(investor.kycStatus === 'PENDING' || investor.kycStatus === 'IN_PROGRESS') && (
                              <>
                                <DropdownMenuItem className="text-green-600">
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Approve KYC
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <UserX className="mr-2 h-4 w-4" />
                                  Reject KYC
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem>
                              <Shield className="mr-2 h-4 w-4" />
                              View Documents
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((meta.page - 1) * meta.limit) + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} investors
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
