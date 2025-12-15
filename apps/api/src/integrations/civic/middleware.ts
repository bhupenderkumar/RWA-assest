/**
 * Civic Pass Integration - Express Middleware
 * 
 * Middleware for protecting routes with Civic Pass verification
 */

import { Request, Response, NextFunction } from 'express';
import { civicService } from './CivicService';
import { VerificationLevel, CivicError, CivicErrorCode } from './types';
import { ASSET_TYPE_VERIFICATION_REQUIREMENTS } from './constants';
import { logger } from '../../utils/logger';

/**
 * Extended Request interface with Civic verification data
 */
export interface CivicVerifiedRequest extends Request {
  civicPass?: {
    isVerified: boolean;
    level: VerificationLevel;
    walletAddress: string;
    expiresAt?: Date;
  };
}

/**
 * Middleware to require a valid Civic Pass
 * 
 * Usage:
 * ```typescript
 * router.post('/invest', requireCivicPass(), investHandler);
 * ```
 */
export function requireCivicPass(
  options: {
    /** Minimum required verification level */
    level?: VerificationLevel;
    /** Check jurisdiction compliance */
    checkJurisdiction?: boolean;
  } = {}
) {
  return async (
    req: CivicVerifiedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Get wallet address from request
      const walletAddress = getWalletAddress(req);

      if (!walletAddress) {
        return res.status(401).json({
          error: 'Wallet address required',
          code: 'WALLET_REQUIRED',
        });
      }

      // Verify the wallet has a valid Civic Pass
      const status = await civicService.verifyWallet(walletAddress);

      if (!status.isVerified) {
        logger.warn('Civic Pass verification failed', { walletAddress });
        return res.status(403).json({
          error: 'Valid Civic Pass required',
          code: CivicErrorCode.WALLET_NOT_VERIFIED,
          details: {
            state: status.gatewayToken?.state,
          },
        });
      }

      // Check verification level if required
      if (options.level) {
        const levelOrder = {
          [VerificationLevel.BASIC]: 1,
          [VerificationLevel.ACCREDITED]: 2,
          [VerificationLevel.INSTITUTIONAL]: 3,
        };

        const currentLevel = status.level || VerificationLevel.BASIC;
        
        if (levelOrder[currentLevel] < levelOrder[options.level]) {
          return res.status(403).json({
            error: `Requires ${options.level} verification level`,
            code: 'INSUFFICIENT_VERIFICATION_LEVEL',
            details: {
              required: options.level,
              current: currentLevel,
            },
          });
        }
      }

      // Check jurisdiction if required
      if (options.checkJurisdiction) {
        const jurisdictionResult = await civicService.checkJurisdiction(walletAddress);
        
        if (!jurisdictionResult.allowed) {
          return res.status(403).json({
            error: jurisdictionResult.reason,
            code: 'JURISDICTION_BLOCKED',
            details: {
              country: jurisdictionResult.country,
            },
          });
        }
      }

      // Attach verification info to request
      req.civicPass = {
        isVerified: true,
        level: status.level || VerificationLevel.BASIC,
        walletAddress,
        expiresAt: status.expiresAt,
      };

      next();
    } catch (error) {
      logger.error('Civic verification middleware error', { error });
      
      if (error instanceof CivicError) {
        return res.status(500).json({
          error: error.message,
          code: error.code,
        });
      }

      return res.status(500).json({
        error: 'Failed to verify Civic Pass',
        code: 'VERIFICATION_ERROR',
      });
    }
  };
}

/**
 * Middleware to require verification for specific asset types
 * 
 * Usage:
 * ```typescript
 * router.post('/invest/:assetId', requireAssetTypeVerification(), investHandler);
 * ```
 */
export function requireAssetTypeVerification() {
  return async (
    req: CivicVerifiedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const walletAddress = getWalletAddress(req);
      const assetType = req.body?.assetType || req.query?.assetType;

      if (!walletAddress) {
        return res.status(401).json({
          error: 'Wallet address required',
          code: 'WALLET_REQUIRED',
        });
      }

      if (!assetType) {
        return res.status(400).json({
          error: 'Asset type required',
          code: 'ASSET_TYPE_REQUIRED',
        });
      }

      const requiredLevel = ASSET_TYPE_VERIFICATION_REQUIREMENTS[assetType];
      
      if (!requiredLevel) {
        // Unknown asset type, default to basic verification
        return requireCivicPass()(req, res, next);
      }

      const result = await civicService.validateForAssetType(
        walletAddress,
        assetType,
        requiredLevel
      );

      if (!result.valid) {
        return res.status(403).json({
          error: result.reason,
          code: 'ASSET_VERIFICATION_FAILED',
          details: {
            assetType,
            requiredLevel,
          },
        });
      }

      // Get full verification status for request
      const status = await civicService.verifyWallet(walletAddress);
      
      req.civicPass = {
        isVerified: true,
        level: status.level || VerificationLevel.BASIC,
        walletAddress,
        expiresAt: status.expiresAt,
      };

      next();
    } catch (error) {
      logger.error('Asset type verification middleware error', { error });
      return res.status(500).json({
        error: 'Failed to verify for asset type',
        code: 'VERIFICATION_ERROR',
      });
    }
  };
}

/**
 * Optional Civic Pass check - attaches verification info but doesn't block
 * 
 * Usage:
 * ```typescript
 * router.get('/assets', optionalCivicPass(), assetsHandler);
 * ```
 */
export function optionalCivicPass() {
  return async (
    req: CivicVerifiedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const walletAddress = getWalletAddress(req);

      if (!walletAddress) {
        req.civicPass = undefined;
        return next();
      }

      const status = await civicService.verifyWallet(walletAddress);

      if (status.isVerified) {
        req.civicPass = {
          isVerified: true,
          level: status.level || VerificationLevel.BASIC,
          walletAddress,
          expiresAt: status.expiresAt,
        };
      }

      next();
    } catch (error) {
      // Don't fail on optional check
      logger.warn('Optional Civic Pass check failed', { error });
      next();
    }
  };
}

/**
 * Extract wallet address from request
 */
function getWalletAddress(req: Request): string | undefined {
  // Check multiple sources for wallet address
  return (
    req.headers['x-wallet-address'] as string ||
    req.body?.walletAddress ||
    req.query?.walletAddress as string ||
    (req as any).user?.walletAddress
  );
}

/**
 * Middleware to check if pass needs refresh
 */
export function checkPassRefresh() {
  return async (
    req: CivicVerifiedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const walletAddress = getWalletAddress(req);

      if (!walletAddress) {
        return next();
      }

      const needsRefresh = await civicService.needsRefresh(walletAddress);

      if (needsRefresh) {
        // Add header to notify client
        res.setHeader('X-Civic-Pass-Refresh-Required', 'true');
      }

      next();
    } catch (error) {
      // Don't fail the request, just skip the check
      next();
    }
  };
}
