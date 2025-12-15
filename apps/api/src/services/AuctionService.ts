/**
 * Auction Service
 * 
 * Handles auction creation, bidding, and settlement
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { config } from '../config';

// Define types locally until Prisma client is generated
type AuctionStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED';

/**
 * Auction with details
 */
export interface AuctionWithDetails {
  id: string;
  assetId: string;
  reservePrice: number;
  currentBid: number | null;
  currentBidder: string | null;
  tokenAmount: number;
  startTime: Date;
  endTime: Date;
  status: AuctionStatus;
  onChainAddress: string | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  asset?: {
    id: string;
    name: string;
    pricePerToken: number;
    mintAddress: string | null;
  };
  bids?: BidInfo[];
  _count?: {
    bids: number;
  };
}

export interface BidInfo {
  id: string;
  bidder: string;
  amount: number;
  txSignature: string | null;
  isWinning: boolean;
  createdAt: Date;
}

/**
 * Service errors
 */
export class AuctionServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuctionServiceError';
  }
}

/**
 * AuctionService handles all auction operations
 */
export class AuctionService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment as 'confirmed' | 'finalized',
    });
  }

  /**
   * Create a new auction
   */
  async createAuction(
    assetId: string,
    data: {
      reservePrice: number;
      tokenAmount: number;
      startTime: Date;
      endTime: Date;
    }
  ): Promise<AuctionWithDetails> {
    // Validate asset
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new AuctionServiceError('Asset not found', 'ASSET_NOT_FOUND', 404);
    }

    if (asset.tokenizationStatus !== 'TOKENIZED') {
      throw new AuctionServiceError(
        'Only tokenized assets can be auctioned',
        'NOT_TOKENIZED',
        400
      );
    }

    // Validate times
    const now = new Date();
    if (data.startTime < now) {
      throw new AuctionServiceError(
        'Start time must be in the future',
        'INVALID_START_TIME',
        400
      );
    }

    if (data.endTime <= data.startTime) {
      throw new AuctionServiceError(
        'End time must be after start time',
        'INVALID_END_TIME',
        400
      );
    }

    // Check for overlapping auctions
    const overlapping = await prisma.auction.findFirst({
      where: {
        assetId,
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        OR: [
          {
            startTime: { lte: data.endTime },
            endTime: { gte: data.startTime },
          },
        ],
      },
    });

    if (overlapping) {
      throw new AuctionServiceError(
        'An auction already exists for this time period',
        'OVERLAPPING_AUCTION',
        400
      );
    }

    // Determine initial status
    const status: AuctionStatus = data.startTime <= now ? 'ACTIVE' : 'SCHEDULED';

    // TODO: Create auction on-chain using the auction program
    const auctionKeypair = Keypair.generate();
    const onChainAddress = auctionKeypair.publicKey.toBase58();

    const auction = await prisma.auction.create({
      data: {
        assetId,
        reservePrice: data.reservePrice,
        tokenAmount: data.tokenAmount,
        startTime: data.startTime,
        endTime: data.endTime,
        status,
        onChainAddress,
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
        _count: {
          select: { bids: true },
        },
      },
    });

    logger.info('Auction created', { 
      auctionId: auction.id, 
      assetId, 
      reservePrice: data.reservePrice,
    });

    return this.formatAuction(auction);
  }

  /**
   * Get auction by ID
   */
  async getAuctionById(auctionId: string): Promise<AuctionWithDetails | null> {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            pricePerToken: true,
            mintAddress: true,
          },
        },
        bids: {
          orderBy: { amount: 'desc' },
          take: 10,
        },
        _count: {
          select: { bids: true },
        },
      },
    });

    if (!auction) return null;

    return this.formatAuction(auction);
  }

  /**
   * List auctions
   */
  async listAuctions(params: {
    assetId?: string;
    status?: AuctionStatus;
    minReservePrice?: number;
    maxReservePrice?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AuctionWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.assetId) {
      where.assetId = params.assetId;
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.minReservePrice || params.maxReservePrice) {
      where.reservePrice = {};
      if (params.minReservePrice) {
        (where.reservePrice as Record<string, number>).gte = params.minReservePrice;
      }
      if (params.maxReservePrice) {
        (where.reservePrice as Record<string, number>).lte = params.maxReservePrice;
      }
    }

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
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
          _count: {
            select: { bids: true },
          },
        },
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
      }),
      prisma.auction.count({ where }),
    ]);

    return {
      data: auctions.map((a: unknown) => this.formatAuction(a)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List active auctions
   */
  async listActiveAuctions(params: {
    assetId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AuctionWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.listAuctions({
      ...params,
      status: 'ACTIVE',
    });
  }

  /**
   * Place a bid
   */
  async placeBid(
    auctionId: string,
    bidder: string,
    amount: number
  ): Promise<BidInfo> {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new AuctionServiceError('Auction not found', 'AUCTION_NOT_FOUND', 404);
    }

    // Check auction is active
    const now = new Date();
    if (auction.status !== 'ACTIVE' || now < auction.startTime || now > auction.endTime) {
      throw new AuctionServiceError('Auction is not active', 'AUCTION_NOT_ACTIVE', 400);
    }

    // Check bid amount
    const minimumBid = auction.currentBid 
      ? Number(auction.currentBid) * 1.05 // 5% increment
      : Number(auction.reservePrice);

    if (amount < minimumBid) {
      throw new AuctionServiceError(
        `Bid must be at least ${minimumBid}`,
        'BID_TOO_LOW',
        400
      );
    }

    // Get bidder's user record for KYC check
    const user = await prisma.user.findFirst({
      where: { walletAddress: bidder },
    });

    if (!user || user.kycStatus !== 'VERIFIED') {
      throw new AuctionServiceError(
        'KYC verification required to bid',
        'KYC_REQUIRED',
        403
      );
    }

    // TODO: Place bid on-chain
    const txSignature = `bid_${Date.now()}_${auctionId.slice(0, 8)}`;

    // Create bid and update auction in transaction
    const [bid] = await prisma.$transaction([
      prisma.bid.create({
        data: {
          auctionId,
          bidder,
          amount,
          txSignature,
          isWinning: true,
        },
      }),
      // Mark previous winning bid as not winning
      prisma.bid.updateMany({
        where: {
          auctionId,
          isWinning: true,
          NOT: { bidder },
        },
        data: { isWinning: false },
      }),
      // Update auction current bid
      prisma.auction.update({
        where: { id: auctionId },
        data: {
          currentBid: amount,
          currentBidder: bidder,
        },
      }),
    ]);

    logger.info('Bid placed', { auctionId, bidder, amount });

    return {
      id: bid.id,
      bidder: bid.bidder,
      amount: Number(bid.amount),
      txSignature: bid.txSignature,
      isWinning: bid.isWinning,
      createdAt: bid.createdAt,
    };
  }

  /**
   * Cancel a bid
   */
  async cancelBid(bidId: string, bidder: string): Promise<void> {
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { auction: true },
    });

    if (!bid) {
      throw new AuctionServiceError('Bid not found', 'BID_NOT_FOUND', 404);
    }

    if (bid.bidder !== bidder) {
      throw new AuctionServiceError('Not your bid', 'FORBIDDEN', 403);
    }

    if (bid.isWinning) {
      throw new AuctionServiceError(
        'Cannot cancel winning bid',
        'CANNOT_CANCEL_WINNING',
        400
      );
    }

    // TODO: Cancel bid on-chain and refund

    await prisma.bid.delete({
      where: { id: bidId },
    });

    logger.info('Bid cancelled', { bidId });
  }

  /**
   * Settle an auction
   */
  async settleAuction(auctionId: string): Promise<AuctionWithDetails> {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          where: { isWinning: true },
          take: 1,
        },
      },
    });

    if (!auction) {
      throw new AuctionServiceError('Auction not found', 'AUCTION_NOT_FOUND', 404);
    }

    if (auction.status !== 'ENDED' && auction.status !== 'ACTIVE') {
      throw new AuctionServiceError(
        'Auction cannot be settled',
        'INVALID_STATUS',
        400
      );
    }

    const now = new Date();
    if (now < auction.endTime) {
      throw new AuctionServiceError(
        'Auction has not ended yet',
        'AUCTION_NOT_ENDED',
        400
      );
    }

    const winningBid = auction.bids[0];

    if (!winningBid) {
      // No bids - mark as cancelled
      const updated = await prisma.auction.update({
        where: { id: auctionId },
        data: {
          status: 'CANCELLED',
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
          _count: {
            select: { bids: true },
          },
        },
      });

      logger.info('Auction cancelled - no bids', { auctionId });
      return this.formatAuction(updated);
    }

    // Check reserve price met
    if (Number(winningBid.amount) < Number(auction.reservePrice)) {
      const updated = await prisma.auction.update({
        where: { id: auctionId },
        data: {
          status: 'CANCELLED',
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
          _count: {
            select: { bids: true },
          },
        },
      });

      logger.info('Auction cancelled - reserve not met', { auctionId });
      return this.formatAuction(updated);
    }

    // TODO: Settle auction on-chain
    // - Transfer tokens to winner
    // - Transfer payment to seller
    // - Refund losing bids

    // Create transaction for the winner
    const winner = await prisma.user.findFirst({
      where: { walletAddress: winningBid.bidder },
    });

    if (winner) {
      await prisma.transaction.create({
        data: {
          assetId: auction.assetId,
          buyerId: winner.id,
          type: 'AUCTION_SETTLEMENT',
          amount: winningBid.amount,
          tokenAmount: auction.tokenAmount,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
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
        _count: {
          select: { bids: true },
        },
      },
    });

    logger.info('Auction settled', { 
      auctionId, 
      winner: winningBid.bidder,
      amount: winningBid.amount,
    });

    return this.formatAuction(updated);
  }

  /**
   * Cancel an auction
   */
  async cancelAuction(auctionId: string): Promise<AuctionWithDetails> {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new AuctionServiceError('Auction not found', 'AUCTION_NOT_FOUND', 404);
    }

    if (['SETTLED', 'CANCELLED'].includes(auction.status)) {
      throw new AuctionServiceError(
        'Auction cannot be cancelled',
        'INVALID_STATUS',
        400
      );
    }

    // TODO: Cancel auction on-chain and refund all bids

    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: 'CANCELLED',
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
        _count: {
          select: { bids: true },
        },
      },
    });

    logger.info('Auction cancelled', { auctionId });

    return this.formatAuction(updated);
  }

  /**
   * Extend auction end time
   */
  async extendAuction(
    auctionId: string,
    newEndTime: Date
  ): Promise<AuctionWithDetails> {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new AuctionServiceError('Auction not found', 'AUCTION_NOT_FOUND', 404);
    }

    if (!['SCHEDULED', 'ACTIVE'].includes(auction.status)) {
      throw new AuctionServiceError(
        'Auction cannot be extended',
        'INVALID_STATUS',
        400
      );
    }

    if (newEndTime <= auction.endTime) {
      throw new AuctionServiceError(
        'New end time must be after current end time',
        'INVALID_END_TIME',
        400
      );
    }

    // TODO: Extend auction on-chain

    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        endTime: newEndTime,
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
        _count: {
          select: { bids: true },
        },
      },
    });

    logger.info('Auction extended', { auctionId, newEndTime });

    return this.formatAuction(updated);
  }

  /**
   * Get bid history for auction
   */
  async getBidHistory(
    auctionId: string,
    params: {
      page?: number;
      limit?: number;
    }
  ): Promise<{
    data: BidInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const [bids, total] = await Promise.all([
      prisma.bid.findMany({
        where: { auctionId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bid.count({ where: { auctionId } }),
    ]);

    return {
      data: bids.map((b: {
        id: string;
        bidder: string;
        amount: unknown;
        txSignature: string | null;
        isWinning: boolean;
        createdAt: Date;
      }) => ({
        id: b.id,
        bidder: b.bidder,
        amount: Number(b.amount),
        txSignature: b.txSignature,
        isWinning: b.isWinning,
        createdAt: b.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update auction statuses (cron job)
   */
  async updateAuctionStatuses(): Promise<void> {
    const now = new Date();

    // Activate scheduled auctions
    await prisma.auction.updateMany({
      where: {
        status: 'SCHEDULED',
        startTime: { lte: now },
      },
      data: {
        status: 'ACTIVE',
      },
    });

    // End active auctions past end time
    await prisma.auction.updateMany({
      where: {
        status: 'ACTIVE',
        endTime: { lte: now },
      },
      data: {
        status: 'ENDED',
      },
    });

    logger.info('Auction statuses updated');
  }

  /**
   * Format auction for response
   */
  private formatAuction(auction: unknown): AuctionWithDetails {
    const a = auction as Record<string, unknown>;
    return {
      id: a.id as string,
      assetId: a.assetId as string,
      reservePrice: Number(a.reservePrice),
      currentBid: a.currentBid ? Number(a.currentBid) : null,
      currentBidder: a.currentBidder as string | null,
      tokenAmount: Number(a.tokenAmount),
      startTime: a.startTime as Date,
      endTime: a.endTime as Date,
      status: a.status as AuctionStatus,
      onChainAddress: a.onChainAddress as string | null,
      settledAt: a.settledAt as Date | null,
      createdAt: a.createdAt as Date,
      updatedAt: a.updatedAt as Date,
      asset: a.asset as {
        id: string;
        name: string;
        pricePerToken: number;
        mintAddress: string | null;
      } | undefined,
      bids: (a.bids as Array<{
        id: string;
        bidder: string;
        amount: unknown;
        txSignature: string | null;
        isWinning: boolean;
        createdAt: Date;
      }>)?.map((b) => ({
        id: b.id,
        bidder: b.bidder,
        amount: Number(b.amount),
        txSignature: b.txSignature,
        isWinning: b.isWinning,
        createdAt: b.createdAt,
      })),
      _count: a._count as { bids: number } | undefined,
    };
  }
}

// Export singleton instance
export const auctionService = new AuctionService();