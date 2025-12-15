'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePortfolio, useHoldings, usePortfolioStats } from '@/hooks/usePortfolio';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/providers/AuthProvider';
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';
import { HoldingsTable } from '@/components/portfolio/HoldingsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function PortfolioPage() {
  const [mounted, setMounted] = useState(false);
  const walletState = useWallet();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const publicKey = mounted ? walletState.publicKey : null;
  const connected = mounted ? walletState.connected : false;
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio();
  const { data: transactionsData, isLoading: txLoading } = useTransactions();

  // Not connected state
  if (!connected) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your Solana wallet to view your portfolio and investment history.
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
        <Card>
          <CardContent className="py-16 text-center">
            <LogIn className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Sign a message to authenticate and view your portfolio.
            </p>
            <Button onClick={login}>Sign In with Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const transactions = transactionsData?.data ?? [];

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Portfolio</h1>
          <p className="text-muted-foreground">
            Track your investments and performance
          </p>
        </div>
        <Button asChild>
          <Link href="/marketplace">Invest More</Link>
        </Button>
      </div>

      {/* Portfolio Summary */}
      <div className="mb-8">
        <PortfolioSummary portfolio={portfolio} isLoading={portfolioLoading || authLoading} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="holdings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="holdings">
            Holdings
            {portfolio?.holdings && (
              <Badge variant="secondary" className="ml-2">
                {portfolio.holdings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions
            {transactions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {transactions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holdings">
          <HoldingsTable holdings={portfolio?.holdings} isLoading={portfolioLoading || authLoading} />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsList transactions={transactions} isLoading={txLoading || authLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TransactionsList({
  transactions,
  isLoading,
}: {
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    tokenAmount: number;
    status: string;
    createdAt: string;
    asset?: { name: string };
  }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">No transactions yet.</p>
          <Button asChild>
            <Link href="/marketplace">Make Your First Investment</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'PRIMARY_SALE':
      case 'SECONDARY_SALE':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'REDEMPTION':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'DIVIDEND':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'PENDING':
      case 'ESCROW_FUNDED':
      case 'TOKENS_TRANSFERRED':
        return 'secondary';
      case 'FAILED':
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PRIMARY_SALE':
        return 'Purchase';
      case 'SECONDARY_SALE':
        return 'Buy';
      case 'REDEMPTION':
        return 'Redemption';
      case 'DIVIDEND':
        return 'Dividend';
      default:
        return type;
    }
  };

  return (
    <Card>
      <div className="divide-y">
        {transactions.map((tx) => (
          <div key={tx.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                {getIcon(tx.type)}
              </div>
              <div>
                <p className="font-medium">{getTypeLabel(tx.type)}</p>
                <p className="text-sm text-muted-foreground">
                  {tx.asset?.name ?? 'Unknown Asset'} • {new Date(tx.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatCurrency(tx.amount)}</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm text-muted-foreground">
                  {tx.tokenAmount} tokens
                </span>
                <Badge variant={getStatusVariant(tx.status)}>
                  {tx.status}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
