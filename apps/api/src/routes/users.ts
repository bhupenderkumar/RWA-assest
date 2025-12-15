/**
 * User Routes
 * 
 * Handles user profile management and KYC operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { userService, UserServiceError } from '../services/UserService';
import { authenticate, requirePlatformAdmin, requireBankAdmin, requireKYC } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';
import { updateProfileSchema, createInvestorProfileSchema, paginationSchema } from '../schemas';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

export const usersRouter = Router();

/**
 * GET /api/v1/users/me
 * 
 * Get current user profile
 */
usersRouter.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const user = await userService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/users/me
 * 
 * Update current user profile
 */
usersRouter.put(
  '/me',
  authenticate,
  validateBody(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { email } = req.body;

      const user = await userService.updateProfile(userId, { email });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof UserServiceError) {
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
 * GET /api/v1/users/me/investor-profile
 * 
 * Get investor profile
 */
usersRouter.get(
  '/me/investor-profile',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const profile = await userService.getInvestorProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/me/investor-profile
 * 
 * Create or update investor profile
 */
usersRouter.post(
  '/me/investor-profile',
  authenticate,
  validateBody(createInvestorProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const profile = await userService.upsertInvestorProfile(userId, req.body);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      if (error instanceof UserServiceError) {
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
 * GET /api/v1/users/me/kyc-status
 * 
 * Get KYC status
 */
usersRouter.get(
  '/me/kyc-status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const status = await userService.getKycStatus(userId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      if (error instanceof UserServiceError) {
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
 * POST /api/v1/users/me/initiate-kyc
 * 
 * Initiate KYC verification
 */
usersRouter.post(
  '/me/initiate-kyc',
  authenticate,
  validateBody(
    z.object({
      redirectUrl: z.string().url().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { redirectUrl } = req.body;

      const result = await userService.initiateKyc(userId, redirectUrl);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof UserServiceError) {
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
 * POST /api/v1/users/me/kyc-callback
 * 
 * KYC verification callback (from Civic Pass)
 */
usersRouter.post(
  '/me/kyc-callback',
  authenticate,
  validateBody(
    z.object({
      status: z.enum(['VERIFIED', 'REJECTED', 'EXPIRED']),
      civicPassToken: z.string().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const walletAddress = req.user!.walletAddress;
      const { status, civicPassToken } = req.body;

      await userService.updateKycStatus(walletAddress, status, civicPassToken);

      res.json({
        success: true,
        message: 'KYC status updated',
      });
    } catch (error) {
      if (error instanceof UserServiceError) {
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
 * GET /api/v1/users/me/portfolio
 * 
 * Get user's portfolio holdings
 */
usersRouter.get(
  '/me/portfolio',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const portfolio = await userService.getPortfolioHoldings(userId);

      res.json({
        success: true,
        data: portfolio,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// Bank Admin Routes
// ===========================================

/**
 * GET /api/v1/users/bank-investors
 * 
 * List investors who hold assets from the bank admin's bank
 */
usersRouter.get(
  '/bank-investors',
  authenticate,
  requireBankAdmin,
  validateQuery(
    paginationSchema.extend({
      kycStatus: z.enum(['PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'EXPIRED']).optional(),
      search: z.string().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      
      // Get the bank for this admin
      const bank = await prisma.bank.findFirst({
        where: { adminUserId: user.id },
        select: { id: true },
      });

      if (!bank && user.role !== 'PLATFORM_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'No bank associated with this admin',
          code: 'NO_BANK',
        });
        return;
      }

      const { page = 1, limit = 20, kycStatus, search } = req.query as {
        page?: number;
        limit?: number;
        kycStatus?: string;
        search?: string;
      };

      // Build where clause for investors with holdings in bank's assets
      const whereClause: any = {
        role: 'INVESTOR',
        investorProfile: {
          portfolioHoldings: {
            some: bank ? {
              asset: { bankId: bank.id }
            } : {}
          }
        }
      };

      if (kycStatus) {
        whereClause.kycStatus = kycStatus;
      }

      if (search) {
        whereClause.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { walletAddress: { contains: search, mode: 'insensitive' } },
          { investorProfile: { firstName: { contains: search, mode: 'insensitive' } } },
          { investorProfile: { lastName: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [total, investors] = await Promise.all([
        prisma.user.count({ where: whereClause }),
        prisma.user.findMany({
          where: whereClause,
          include: {
            investorProfile: {
              include: {
                portfolioHoldings: {
                  where: bank ? {
                    asset: { bankId: bank.id }
                  } : {},
                  include: {
                    asset: {
                      select: {
                        id: true,
                        name: true,
                        pricePerToken: true,
                      }
                    }
                  }
                }
              }
            }
          },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // Transform data to include calculated fields
      const transformedInvestors = investors.map((investor) => {
        const holdings = investor.investorProfile?.portfolioHoldings ?? [];
        const totalInvested = holdings.reduce((sum: number, h: any) => sum + Number(h.costBasis), 0);
        const assetsHeld = holdings.length;
        
        return {
          id: investor.id,
          email: investor.email,
          walletAddress: investor.walletAddress,
          kycStatus: investor.kycStatus,
          kycVerifiedAt: investor.kycVerifiedAt,
          isActive: investor.isActive,
          createdAt: investor.createdAt,
          investorProfile: investor.investorProfile ? {
            firstName: investor.investorProfile.firstName,
            lastName: investor.investorProfile.lastName,
            country: investor.investorProfile.country,
            accreditationStatus: investor.investorProfile.accreditationStatus,
            investorType: investor.investorProfile.investorType,
          } : null,
          totalInvested,
          assetsHeld,
          holdings: holdings.map((h: any) => ({
            assetId: h.assetId,
            assetName: h.asset.name,
            tokenAmount: h.tokenAmount,
            costBasis: h.costBasis,
          })),
        };
      });

      res.json({
        success: true,
        data: transformedInvestors,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===========================================
// Platform Admin Routes
// ===========================================

/**
 * GET /api/v1/users
 * 
 * List all users (platform admin only)
 */
usersRouter.get(
  '/',
  authenticate,
  requirePlatformAdmin,
  validateQuery(
    paginationSchema.extend({
      role: z.enum(['PLATFORM_ADMIN', 'BANK_ADMIN', 'BANK_VIEWER', 'INVESTOR', 'AUDITOR']).optional(),
      kycStatus: z.enum(['PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'EXPIRED']).optional(),
      search: z.string().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.listUsers(req.query as Parameters<typeof userService.listUsers>[0]);

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
 * GET /api/v1/users/:id
 * 
 * Get user by ID (admin only)
 */
usersRouter.get(
  '/:id',
  authenticate,
  requirePlatformAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const user = await userService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/:id/disable
 * 
 * Disable user account (admin only)
 */
usersRouter.post(
  '/:id/disable',
  authenticate,
  requirePlatformAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await userService.disableUser(id);

      logger.info('User disabled by admin', { targetUserId: id, adminUserId: req.user!.id });

      res.json({
        success: true,
        message: 'User disabled',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/users/:id/enable
 * 
 * Enable user account (admin only)
 */
usersRouter.post(
  '/:id/enable',
  authenticate,
  requirePlatformAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await userService.enableUser(id);

      logger.info('User enabled by admin', { targetUserId: id, adminUserId: req.user!.id });

      res.json({
        success: true,
        message: 'User enabled',
      });
    } catch (error) {
      next(error);
    }
  }
);
