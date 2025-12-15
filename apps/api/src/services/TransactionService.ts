/**
 * Transaction Service
 * 
 * Handles purchase transactions, escrow management, and transaction history
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { config } from '../config';

// Define types locally until Prisma client is generated
type TransactionType = 'PRIMARY_SALE' | 'SECONDARY_SALE' | 'AUCTION_SETTLEMENT' | 'REDEMPTION';
type TransactionStatus = 'PENDING' | 'ESCROW_CREATED' | 'PAYMENT_RECEIVED' | 'TOKENS_TRANSFERRED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

/**
 * Transaction with asset details
 */
export interface TransactionWithDetails {
  id: string;
  assetId: string;
  buyerId: string;
  sellerId: string | null;
  type: TransactionType;
  amount: number;
  tokenAmount: number;
  txSignature: string | null;
  escrowAddress: string | null;
  status: TransactionStatus;
  failureReason: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  asset?: {
    id: string;
    name: string;
    pricePerToken: number;
    mintAddress: string | null;
  };
}

/**
 * Service errors
 */
export class TransactionServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'TransactionServiceError';
  }
}

/**
 * TransactionService handles all transaction operations
 */
export class TransactionService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment as 'confirmed' | 'finalized',
    });
  }

  /**
   * Create a new purchase transaction
   */
  async createTransaction(
    buyerId: string,
    assetId: string,
    tokenAmount: number,
    type: TransactionType = 'PRIMARY_SALE'
  ): Promise<TransactionWithDetails> {
    // Get asset
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new TransactionServiceError('Asset not found', 'ASSET_NOT_FOUND', 404);
    }

    if (asset.listingStatus !== 'LISTED') {
      throw new TransactionServiceError('Asset is not listed for sale', 'NOT_LISTED', 400);
    }

    if (!asset.pricePerToken) {
      throw new TransactionServiceError('Asset price not set', 'NO_PRICE', 400);
    }

    // Calculate amount
    const amount = tokenAmount * Number(asset.pricePerToken);

    // Check available supply
    const soldTokens = await prisma.portfolioHolding.aggregate({
      where: { assetId },
      _sum: { tokenAmount: true },
    });

    const availableTokens = Number(asset.totalSupply) - Number(soldTokens._sum.tokenAmount || 0);
    
    if (tokenAmount > availableTokens) {
      throw new TransactionServiceError(
        `Only ${availableTokens} tokens available`,
        'INSUFFICIENT_SUPPLY',
        400
      );
    }

    // Get buyer's investor profile
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      include: { investorProfile: true },
    });

    if (!buyer) {
      throw new TransactionServiceError('Buyer not found', 'BUYER_NOT_FOUND', 404);
    }

    if (buyer.kycStatus !== 'VERIFIED') {
      throw new TransactionServiceError('KYC verification required', 'KYC_REQUIRED', 403);
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        assetId,
        buyerId,
        type,
        amount,
        tokenAmount,
        status: 'PENDING',
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            pricePerToken: true,
            mintAddress: true,
          },
        },
      },
    });

    logger.info('Transaction created', { 
      transactionId: transaction.id, 
      buyerId, 
      assetId, 
      amount,
      tokenAmount,
    });

    return this.formatTransaction(transaction);
  }

  /**
   * Create escrow for transaction
   */
  async createEscrow(transactionId: string): Promise<TransactionWithDetails> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { asset: true },
    });

    if (!transaction) {
      throw new TransactionServiceError('Transaction not found', 'TX_NOT_FOUND', 404);
    }

    if (transaction.status !== 'PENDING') {
      throw new TransactionServiceError(
        'Transaction not in pending state',
        'INVALID_STATUS',
        400
      );
    }

    // TODO: Create actual escrow on Solana using the escrow program
    // For now, generate a placeholder escrow address
    const escrowKeypair = Keypair.generate();
    const escrowAddress = escrowKeypair.publicKey.toBase58();

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        escrowAddress,
        status: 'ESCROW_CREATED',
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            pricePerToken: true,
            mintAddress: true,
          },
        },
      },
    });

    logger.info('Escrow created', { transactionId, escrowAddress });

    return this.formatTransaction(updated);
  }

  /**
   * Record payment received
   */
  async recordPayment(
    transactionId: string,
    paymentTxSignature: string
  ): Promise<TransactionWithDetails> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new TransactionServiceError('Transaction not found', 'TX_NOT_FOUND', 404);
    }

    if (transaction.status !== 'ESCROW_CREATED') {
      throw new TransactionServiceError(
        'Escrow must be created first',
        'INVALID_STATUS',
        400
      );
    }

    // TODO: Verify payment on-chain
    // const confirmed = await this.connection.confirmTransaction(paymentTxSignature);

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'PAYMENT_RECEIVED',
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            pricePerToken: true,
            mintAddress: true,
          },
        },
      },
    });

    logger.info('Payment received', { transactionId, paymentTxSignature });

    return this.formatTransaction(updated);
  }

  /**
   * Transfer tokens to buyer
   */
  async transferTokens(transactionId: string): Promise<TransactionWithDetails> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        asset: true,
        buyer: true,
      },
    });

    if (!transaction) {
      throw new TransactionServiceError('Transaction not found', 'TX_NOT_FOUND', 404);
    }

    if (transaction.status !== 'PAYMENT_RECEIVED') {
      throw new TransactionServiceError(
        'Payment must be received first',
        'INVALID_STATUS',
        400
      );
    }

    // TODO: Transfer tokens on-chain using the asset-registry program
    // For now, generate a placeholder signature
    const txSignature = `tx_${Date.now()}_${transactionId.slice(0, 8)}`;

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        txSignature,
        status: 'TOKENS_TRANSFERRED',
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            pricePerToken: true,
            mintAddress: true,
          },
        },
      },
    });

    logger.info('Tokens transferred', { transactionId, txSignature });

    return this.formatTransaction(updated);
  }

  /**
   * Complete transaction and update portfolio
   */
  async completeTransaction(transactionId: string): Promise<TransactionWithDetails> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        asset: true,
        buyer: {
          include: { investorProfile: true },
        },
      },
    });

    if (!transaction) {
      throw new TransactionServiceError('Transaction not found', 'TX_NOT_FOUND', 404);
    }

    if (transaction.status !== 'TOKENS_TRANSFERRED') {
      throw new TransactionServiceError(
        'Tokens must be transferred first',
        'INVALID_STATUS',
        400
      );
    }

    if (!transaction.buyer.investorProfile) {
      throw new TransactionServiceError(
        'Buyer does not have investor profile',
        'NO_PROFILE',
        400
      );
    }

    // Update transaction and create/update portfolio holding in a transaction
    const [updated] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              pricePerToken: true,
              mintAddress: true,
            },
          },
        },
      }),
      prisma.portfolioHolding.upsert({
        where: {
          investorId_assetId: {
            investorId: transaction.buyer.investorProfile.id,
            assetId: transaction.assetId,
          },
        },
        create: {
          investorId: transaction.buyer.investorProfile.id,
          assetId: transaction.assetId,
          tokenAmount: transaction.tokenAmount,
          costBasis: transaction.amount,
        },
        update: {
          tokenAmount: {
            increment: transaction.tokenAmount,
          },
          costBasis: {
            increment: transaction.amount,
          },
        },
      }),
    ]);

    logger.info('Transaction completed', { transactionId });

    return this.formatTransaction(updated);
  }

  /**
   * Cancel a transaction
   */
  async cancelTransaction(
    transactionId: string,
    reason: string
  ): Promise<TransactionWithDetails> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new TransactionServiceError('Transaction not found', 'TX_NOT_FOUND', 404);
    }

    if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(transaction.status)) {
      throw new TransactionServiceError(
        'Transaction cannot be cancelled',
        'CANNOT_CANCEL',
        400
      );
    }

    // TODO: If escrow was created, trigger refund

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'CANCELLED',
        failureReason: reason,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            pricePerToken: true,
            mintAddress: true,
          },
        },
      },
    });

    logger.info('Transaction cancelled', { transactionId, reason });

    return this.formatTransaction(updated);
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<TransactionWithDetails | null> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            pricePerToken: true,
            mintAddress: true,
          },
        },
      },
    });

    if (!transaction) return null;

    return this.formatTransaction(transaction);
  }

  /**
   * List transactions for a user
   */
  async listUserTransactions(
    userId: string,
    params: {
      assetId?: string;
      type?: TransactionType;
      status?: TransactionStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    data: TransactionWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      buyerId: userId,
    };

    if (params.assetId) {
      where.assetId = params.assetId;
    }
    if (params.type) {
      where.type = params.type;
    }
    if (params.status) {
      where.status = params.status;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              pricePerToken: true,
              mintAddress: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map((t: unknown) => this.formatTransaction(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List transactions for an asset
   */
  async listAssetTransactions(
    assetId: string,
    params: {
      type?: TransactionType;
      status?: TransactionStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    data: TransactionWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      assetId,
    };

    if (params.type) {
      where.type = params.type;
    }
    if (params.status) {
      where.status = params.status;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              pricePerToken: true,
              mintAddress: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map((t: unknown) => this.formatTransaction(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get transaction statistics for a user
   */
  async getUserTransactionStats(userId: string): Promise<{
    totalTransactions: number;
    completedTransactions: number;
    totalInvested: number;
    totalTokens: number;
  }> {
    const [stats, totals] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['status'],
        where: { buyerId: userId },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          buyerId: userId,
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
          tokenAmount: true,
        },
      }),
    ]);

    const totalTransactions = stats.reduce((sum: number, s: { _count: number }) => sum + s._count, 0);
    const completedTransactions = stats.find((s: { status: string }) => s.status === 'COMPLETED')?._count || 0;

    return {
      totalTransactions,
      completedTransactions,
      totalInvested: Number(totals._sum.amount) || 0,
      totalTokens: Number(totals._sum.tokenAmount) || 0,
    };
  }

  /**
   * Format transaction for response
   */
  private formatTransaction(transaction: unknown): TransactionWithDetails {
    const t = transaction as Record<string, unknown>;
    return {
      id: t.id as string,
      assetId: t.assetId as string,
      buyerId: t.buyerId as string,
      sellerId: t.sellerId as string | null,
      type: t.type as TransactionType,
      amount: Number(t.amount),
      tokenAmount: Number(t.tokenAmount),
      txSignature: t.txSignature as string | null,
      escrowAddress: t.escrowAddress as string | null,
      status: t.status as TransactionStatus,
      failureReason: t.failureReason as string | null,
      completedAt: t.completedAt as Date | null,
      createdAt: t.createdAt as Date,
      updatedAt: t.updatedAt as Date,
      asset: t.asset as {
        id: string;
        name: string;
        pricePerToken: number;
        mintAddress: string | null;
      } | undefined,
    };
  }
}

// Export singleton instance
export const transactionService = new TransactionService();