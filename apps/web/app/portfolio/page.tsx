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
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, LogIn, TrendingUp, PieChart, Clock } from 'lucide-react';
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
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Connect your Solana wallet to view your portfolio and investment history.
            </p>
            
            {/* Features Preview */}
            <div className="grid sm:grid-cols-3 gap-4 mt-8 text-left">
              <div className="p-4 rounded-lg bg-muted/50">
                <TrendingUp className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-medium mb-1">Track Performance</h3>
                <p className="text-sm text-muted-foreground">Monitor your investment returns in real-time</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <PieChart className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-medium mb-1">Asset Allocation</h3>
                <p className="text-sm text-muted-foreground">View your portfolio diversification</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <Clock className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-medium mb-1">Transaction History</h3>
                <p className="text-sm text-muted-foreground">Access your complete investment history</p>
              </div>
            </div>
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
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6">
              <LogIn className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Sign a message to authenticate and view your portfolio.
            </p>
            <Button onClick={login} size="lg">
              Sign In with Wallet
            </Button>
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
          <Link href="/marketplace">
            <TrendingUp className="mr-2 h-4 w-4" />
            Invest More
          </Link>
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
          <Card>
            <CardHeader>
              <CardTitle>Your Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              {portfolioLoading || authLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : portfolio?.holdings && portfolio.holdings.length > 0 ? (
                <HoldingsTable holdings={portfolio.holdings} />
              ) : (
                <div className="text-center py-12">
                  <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Holdings Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start investing to build your portfolio
                  </p>
                  <Button asChild>
                    <Link href="/marketplace">Browse Marketplace</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {txLoading || authLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        tx.type === 'BUY' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {tx.type === 'BUY' ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {tx.type === 'BUY' ? 'Purchased' : 'Sold'} {tx.tokenAmount} tokens
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(tx.amount)}</p>
                        <Badge variant={tx.status === 'COMPLETED' ? 'default' : 'secondary'}>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Transactions Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Your transaction history will appear here
                  </p>
                  <Button asChild>
                    <Link href="/marketplace">Make Your First Investment</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
