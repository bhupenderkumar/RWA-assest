/**
 * Authentication Routes
 * 
 * Handles user authentication via wallet signature and JWT tokens
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService, AuthError } from '../services/AuthService';
import { validateBody, validateParams } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { loginSchema, refreshTokenSchema, walletConnectSchema } from '../schemas';
import { logger } from '../utils/logger';

export const authRouter = Router();

/**
 * GET /api/v1/auth/nonce/:walletAddress
 * 
 * Get a nonce for wallet signature verification
 */
authRouter.get(
  '/nonce/:walletAddress',
  validateParams(z.object({ walletAddress: z.string() })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress } = req.params;
      
      const nonce = await authService.generateNonce(walletAddress);

      res.json({
        success: true,
        data: {
          nonce,
          expiresIn: 300, // 5 minutes
        },
      });
    } catch (error) {
      if (error instanceof AuthError) {
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
 * POST /api/v1/auth/login
 * 
 * Authenticate with wallet signature
 */
authRouter.post(
  '/login',
  validateBody(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress, signature, message } = req.body;

      const result = await authService.authenticateWithWallet(
        walletAddress,
        signature,
        message
      );

      logger.info('User logged in', { userId: result.user.id, walletAddress });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof AuthError) {
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
 * POST /api/v1/auth/login/password
 * 
 * Authenticate with email/password (for admin users)
 */
authRouter.post(
  '/login/password',
  validateBody(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const result = await authService.authenticateWithPassword(email, password);

      logger.info('Admin user logged in', { userId: result.user.id, email });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof AuthError) {
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
 * POST /api/v1/auth/logout
 * 
 * Logout and invalidate tokens
 */
authRouter.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.token!;
      const refreshToken = req.body.refreshToken;

      await authService.logout(accessToken, refreshToken);

      logger.info('User logged out', { userId: req.user?.id });

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/logout/all
 * 
 * Logout from all sessions
 */
authRouter.post(
  '/logout/all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      await authService.logoutAll(userId);

      logger.info('User logged out from all sessions', { userId });

      res.json({
        success: true,
        message: 'Logged out from all sessions',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/refresh
 * 
 * Refresh access token using refresh token
 */
authRouter.post(
  '/refresh',
  validateBody(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof AuthError) {
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
 * POST /api/v1/auth/wallet-connect
 * 
 * Connect a wallet to existing account (requires auth)
 */
authRouter.post(
  '/wallet-connect',
  authenticate,
  validateBody(walletConnectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress } = req.body;

      // Generate nonce for the new wallet
      const nonce = await authService.generateNonce(walletAddress);

      res.json({
        success: true,
        data: {
          nonce,
          message: 'Sign this nonce to connect your wallet',
          expiresIn: 300,
        },
      });
    } catch (error) {
      if (error instanceof AuthError) {
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
 * GET /api/v1/auth/me
 * 
 * Get current authenticated user
 */
authRouter.get(
  '/me',
  authenticate,
  (req: Request, res: Response) => {
    res.json({
      success: true,
      data: req.user,
    });
  }
);

/**
 * POST /api/v1/auth/verify
 * 
 * Verify if access token is valid
 */
authRouter.post(
  '/verify',
  authenticate,
  (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        valid: true,
        user: req.user,
      },
    });
  }
);
