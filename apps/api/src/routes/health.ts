import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

healthRouter.get('/ready', async (req, res) => {
  // Add database and other service checks here
  res.json({
    success: true,
    status: 'ready',
    services: {
      database: 'connected',
      redis: 'connected',
    },
  });
});

/**
 * GET /api/v1/health/stats
 * 
 * Public platform statistics for landing page
 */
healthRouter.get('/stats', async (req, res) => {
  try {
    // Get counts and aggregates
    const [
      totalAssets,
      listedAssets,
      totalUsers,
      verifiedInvestors,
      completedTransactions,
      totalValueLocked,
    ] = await Promise.all([
      // Total tokenized assets
      prisma.asset.count({
        where: { tokenizationStatus: 'TOKENIZED' },
      }),
      // Listed assets in marketplace
      prisma.asset.count({
        where: { listingStatus: 'LISTED' },
      }),
      // Total users
      prisma.user.count(),
      // Verified investors (KYC completed)
      prisma.user.count({
        where: { kycStatus: 'VERIFIED' },
      }),
      // Completed transactions
      prisma.transaction.count({
        where: { status: 'COMPLETED' },
      }),
      // Total value locked (sum of listed asset values)
      prisma.asset.aggregate({
        where: { listingStatus: 'LISTED' },
        _sum: { totalValue: true },
      }),
    ]);

    // Get recent transactions volume
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentVolume = await prisma.transaction.aggregate({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: last30Days },
      },
      _sum: { amount: true },
    });

    res.json({
      success: true,
      data: {
        totalValueLocked: totalValueLocked._sum.totalValue || 0,
        totalAssets: totalAssets,
        listedAssets: listedAssets,
        verifiedInvestors: verifiedInvestors,
        totalUsers: totalUsers,
        completedTransactions: completedTransactions,
        recentVolume: recentVolume._sum.amount || 0,
        settlementTime: '<1s', // Solana settlement time
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to fetch platform stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform statistics',
    });
  }
});

