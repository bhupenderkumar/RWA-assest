/**
 * Auction Routes
 * 
 * Handles auction creation, bidding, and settlement
 */

import { Router, Request, Response, NextFunction } from 'express';
import { auctionService, AuctionServiceError } from '../services/AuctionService';
import { authenticate, requireBankAdmin, requirePlatformAdmin, requireKYC } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { createAuctionSchema, placeBidSchema, listAuctionsSchema } from '../schemas';
import { uuidParamSchema } from '../middleware/validation';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { z } from 'zod';

export const auctionsRouter = Router();

/**
 * GET /api/v1/auctions
 * 
 * List auctions
 */
auctionsRouter.get(
  '/',
  validateQuery(listAuctionsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await auctionService.listAuctions(
        req.query as Parameters<typeof auctionService.listAuctions>[0]
      );

      res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/auctions/active
 * 
 * List active auctions
 */
auctionsRouter.get(
  '/active',
  validateQuery(
    z.object({
      assetId: z.string().uuid().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await auctionService.listActiveAuctions(
        req.query as Parameters<typeof auctionService.listActiveAuctions>[0]
      );

      res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auctions
 * 
 * Create a new auction
 */
auctionsRouter.post(
  '/',
  authenticate,
  requireBankAdmin,
  validateBody(createAuctionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { assetId, reservePrice, tokenAmount, startTime, endTime } = req.body;

      // Verify bank owns the asset
      const user = req.user!;
      const bank = await prisma.bank.findFirst({
        where: { adminUserId: user.id },
        select: { id: true },
      });

      if (!bank) {
        res.status(403).json({
          success: false,
          error: 'No bank associated with this user',
          code: 'NO_BANK',
        });
        return;
      }

      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { bankId: true },
      });

      if (!asset || asset.bankId !== bank.id) {
        res.status(403).json({
          success: false,
          error: 'Asset does not belong to your bank',
          code: 'FORBIDDEN',
        });
        return;
      }

      const auction = await auctionService.createAuction(assetId, {
        reservePrice,
        tokenAmount,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });

      logger.info('Auction created', { auctionId: auction.id, userId: user.id });

      res.status(201).json({
        success: true,
        data: auction,
      });
    } catch (error) {
      if (error instanceof AuctionServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/auctions/:id
 * 
 * Get auction details
 */
auctionsRouter.get(
  '/:id',
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const auction = await auctionService.getAuctionById(id);

      if (!auction) {
        res.status(404).json({
          success: false,
          error: 'Auction not found',
          code: 'AUCTION_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auctions/:id/bid
 * 
 * Place a bid
 */
auctionsRouter.post(
  '/:id/bid',
  authenticate,
  requireKYC,
  validateParams(uuidParamSchema),
  validateBody(placeBidSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const walletAddress = req.user!.walletAddress;

      const bid = await auctionService.placeBid(id, walletAddress, amount);

      logger.info('Bid placed', { 
        auctionId: id, 
        bidder: walletAddress, 
        amount,
      });

      res.status(201).json({
        success: true,
        data: bid,
      });
    } catch (error) {
      if (error instanceof AuctionServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/auctions/:id/bids/:bidId
 * 
 * Cancel a bid
 */
auctionsRouter.delete(
  '/:id/bids/:bidId',
  authenticate,
  validateParams(
    z.object({
      id: z.string().uuid(),
      bidId: z.string().uuid(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bidId } = req.params;
      const walletAddress = req.user!.walletAddress;

      await auctionService.cancelBid(bidId, walletAddress);

      res.json({
        success: true,
        message: 'Bid cancelled',
      });
    } catch (error) {
      if (error instanceof AuctionServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/v1/auctions/:id/bids
 * 
 * Get bid history
 */
auctionsRouter.get(
  '/:id/bids',
  validateParams(uuidParamSchema),
  validateQuery(
    z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(50),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const result = await auctionService.getBidHistory(
        id,
        req.query as { page?: number; limit?: number }
      );

      res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auctions/:id/settle
 * 
 * Settle an auction
 */
auctionsRouter.post(
  '/:id/settle',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const auction = await auctionService.settleAuction(id);

      logger.info('Auction settled', { auctionId: id, userId: req.user!.id });

      res.json({
        success: true,
        data: auction,
      });
    } catch (error) {
      if (error instanceof AuctionServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/auctions/:id/cancel
 * 
 * Cancel an auction
 */
auctionsRouter.post(
  '/:id/cancel',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const auction = await auctionService.cancelAuction(id);

      logger.info('Auction cancelled', { auctionId: id, userId: req.user!.id });

      res.json({
        success: true,
        data: auction,
      });
    } catch (error) {
      if (error instanceof AuctionServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/auctions/:id/extend
 * 
 * Extend auction end time
 */
auctionsRouter.post(
  '/:id/extend',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  validateBody(
    z.object({
      newEndTime: z.string().datetime(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { newEndTime } = req.body;

      const auction = await auctionService.extendAuction(id, new Date(newEndTime));

      logger.info('Auction extended', { auctionId: id, newEndTime });

      res.json({
        success: true,
        data: auction,
      });
    } catch (error) {
      if (error instanceof AuctionServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/auctions/update-statuses
 * 
 * Update auction statuses (cron job endpoint)
 */
auctionsRouter.post(
  '/update-statuses',
  authenticate,
  requirePlatformAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await auctionService.updateAuctionStatuses();

      res.json({
        success: true,
        message: 'Auction statuses updated',
      });
    } catch (error) {
      next(error);
    }
  }
);
