/**
 * Transaction Routes
 * 
 * Handles purchase transactions and escrow management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { transactionService, TransactionServiceError } from '../services/TransactionService';
import { authenticate, requireKYC } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { createTransactionSchema, listTransactionsSchema } from '../schemas';
import { uuidParamSchema } from '../middleware/validation';
import { logger } from '../utils/logger';
import { z } from 'zod';

export const transactionsRouter = Router();

/**
 * GET /api/v1/transactions
 * 
 * List user's transactions
 */
transactionsRouter.get(
  '/',
  authenticate,
  validateQuery(listTransactionsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const result = await transactionService.listUserTransactions(
        userId,
        req.query as Parameters<typeof transactionService.listUserTransactions>[1]
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
 * GET /api/v1/transactions/stats
 * 
 * Get user's transaction statistics
 */
transactionsRouter.get(
  '/stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const stats = await transactionService.getUserTransactionStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/transactions
 * 
 * Create a new transaction (purchase tokens)
 */
transactionsRouter.post(
  '/',
  authenticate,
  requireKYC,
  validateBody(createTransactionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { assetId, tokenAmount, type } = req.body;

      const transaction = await transactionService.createTransaction(
        userId,
        assetId,
        tokenAmount,
        type
      );

      logger.info('Transaction initiated', { 
        transactionId: transaction.id, 
        userId,
        assetId,
      });

      res.status(201).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      if (error instanceof TransactionServiceError) {
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
 * GET /api/v1/transactions/:id
 * 
 * Get transaction details
 */
transactionsRouter.get(
  '/:id',
  authenticate,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const transaction = await transactionService.getTransactionById(id);

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
          code: 'TX_NOT_FOUND',
        });
        return;
      }

      // Only allow access to own transactions (unless admin)
      if (transaction.buyerId !== userId && req.user!.role !== 'PLATFORM_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'FORBIDDEN',
        });
        return;
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/transactions/:id/create-escrow
 * 
 * Create escrow for transaction
 */
transactionsRouter.post(
  '/:id/create-escrow',
  authenticate,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify ownership
      const existing = await transactionService.getTransactionById(id);
      if (!existing || existing.buyerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'FORBIDDEN',
        });
        return;
      }

      const transaction = await transactionService.createEscrow(id);

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      if (error instanceof TransactionServiceError) {
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
 * POST /api/v1/transactions/:id/confirm-payment
 * 
 * Confirm payment received
 */
transactionsRouter.post(
  '/:id/confirm-payment',
  authenticate,
  validateParams(uuidParamSchema),
  validateBody(
    z.object({
      paymentTxSignature: z.string().min(1),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { paymentTxSignature } = req.body;
      const userId = req.user!.id;

      // Verify ownership
      const existing = await transactionService.getTransactionById(id);
      if (!existing || existing.buyerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'FORBIDDEN',
        });
        return;
      }

      const transaction = await transactionService.recordPayment(id, paymentTxSignature);

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      if (error instanceof TransactionServiceError) {
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
 * POST /api/v1/transactions/:id/transfer-tokens
 * 
 * Transfer tokens to buyer (admin/automated)
 */
transactionsRouter.post(
  '/:id/transfer-tokens',
  authenticate,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const transaction = await transactionService.transferTokens(id);

      logger.info('Tokens transferred', { transactionId: id });

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      if (error instanceof TransactionServiceError) {
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
 * POST /api/v1/transactions/:id/complete
 * 
 * Complete transaction and update portfolio
 */
transactionsRouter.post(
  '/:id/complete',
  authenticate,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const transaction = await transactionService.completeTransaction(id);

      logger.info('Transaction completed', { transactionId: id });

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      if (error instanceof TransactionServiceError) {
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
 * POST /api/v1/transactions/:id/cancel
 * 
 * Cancel a transaction
 */
transactionsRouter.post(
  '/:id/cancel',
  authenticate,
  validateParams(uuidParamSchema),
  validateBody(
    z.object({
      reason: z.string().min(1).max(500),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user!.id;

      // Verify ownership or admin
      const existing = await transactionService.getTransactionById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
          code: 'TX_NOT_FOUND',
        });
        return;
      }

      if (existing.buyerId !== userId && req.user!.role !== 'PLATFORM_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'FORBIDDEN',
        });
        return;
      }

      const transaction = await transactionService.cancelTransaction(id, reason);

      logger.info('Transaction cancelled', { transactionId: id, userId });

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      if (error instanceof TransactionServiceError) {
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
 * GET /api/v1/transactions/asset/:assetId
 * 
 * List transactions for an asset
 */
transactionsRouter.get(
  '/asset/:assetId',
  authenticate,
  validateParams(z.object({ assetId: z.string().uuid() })),
  validateQuery(listTransactionsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { assetId } = req.params;

      const result = await transactionService.listAssetTransactions(
        assetId,
        req.query as Parameters<typeof transactionService.listAssetTransactions>[1]
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
