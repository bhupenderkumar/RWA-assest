/**
 * Asset Routes
 * 
 * Handles asset CRUD, tokenization, and document management
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { assetService, AssetServiceError } from '../services/AssetService';
import { authenticate, requireBankAdmin, requirePlatformAdmin, requireKYC } from '../middleware/auth';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { 
  createAssetSchema, 
  updateAssetSchema, 
  tokenizeAssetSchema, 
  listAssetsSchema,
  uploadDocumentSchema,
} from '../schemas';
import { uuidParamSchema } from '../middleware/validation';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { z } from 'zod';

export const assetsRouter = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

/**
 * GET /api/v1/assets
 * 
 * List assets (with filters)
 */
assetsRouter.get(
  '/',
  authenticate,
  validateQuery(listAssetsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      
      // If bank admin, filter to their bank's assets
      let bankId: string | undefined;
      if (user.role === 'BANK_ADMIN' || user.role === 'BANK_VIEWER') {
        const bank = await prisma.bank.findFirst({
          where: { adminUserId: user.id },
          select: { id: true },
        });
        bankId = bank?.id;
      }

      const result = await assetService.listAssets({
        ...req.query as Parameters<typeof assetService.listAssets>[0],
        bankId,
      });

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
 * GET /api/v1/assets/marketplace
 * 
 * List publicly available assets
 */
assetsRouter.get(
  '/marketplace',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await assetService.listMarketplaceAssets(
        req.query as Parameters<typeof assetService.listMarketplaceAssets>[0]
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
 * POST /api/v1/assets
 * 
 * Create a new asset
 */
assetsRouter.post(
  '/',
  authenticate,
  requireBankAdmin,
  validateBody(createAssetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;

      // Get bank ID for this admin
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

      const asset = await assetService.createAsset(bank.id, req.body);

      logger.info('Asset created', { assetId: asset.id, userId: user.id });

      res.status(201).json({
        success: true,
        data: asset,
      });
    } catch (error) {
      if (error instanceof AssetServiceError) {
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
 * GET /api/v1/assets/:id
 * 
 * Get asset details
 */
assetsRouter.get(
  '/:id',
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const asset = await assetService.getAssetById(id);

      if (!asset) {
        res.status(404).json({
          success: false,
          error: 'Asset not found',
          code: 'ASSET_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: asset,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/assets/:id
 * 
 * Update asset
 */
assetsRouter.put(
  '/:id',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  validateBody(updateAssetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const asset = await assetService.updateAsset(id, req.body);

      res.json({
        success: true,
        data: asset,
      });
    } catch (error) {
      if (error instanceof AssetServiceError) {
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
 * DELETE /api/v1/assets/:id
 * 
 * Delete asset (only drafts)
 */
assetsRouter.delete(
  '/:id',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await assetService.deleteAsset(id);

      res.json({
        success: true,
        message: 'Asset deleted',
      });
    } catch (error) {
      if (error instanceof AssetServiceError) {
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
 * POST /api/v1/assets/:id/submit-review
 * 
 * Submit asset for review
 */
assetsRouter.post(
  '/:id/submit-review',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const asset = await assetService.submitForReview(id);

      logger.info('Asset submitted for review', { assetId: id, userId: req.user!.id });

      res.json({
        success: true,
        data: asset,
      });
    } catch (error) {
      if (error instanceof AssetServiceError) {
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
 * POST /api/v1/assets/:id/approve
 * 
 * Approve asset for tokenization (bank admin - temporary, will be platform admin later)
 */
assetsRouter.post(
  '/:id/approve',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const asset = await assetService.approveForTokenization(id);

      logger.info('Asset approved for tokenization', { assetId: id, adminId: req.user!.id });

      res.json({
        success: true,
        data: asset,
      });
    } catch (error) {
      if (error instanceof AssetServiceError) {
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
 * POST /api/v1/assets/:id/tokenize
 * 
 * Tokenize an approved asset
 */
assetsRouter.post(
  '/:id/tokenize',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  validateBody(tokenizeAssetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const asset = await assetService.tokenizeAsset(id, {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });

      logger.info('Asset tokenized', { assetId: id, userId: req.user!.id });

      res.json({
        success: true,
        data: asset,
      });
    } catch (error) {
      if (error instanceof AssetServiceError) {
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
 * POST /api/v1/assets/:id/list
 * 
 * List asset on marketplace
 */
assetsRouter.post(
  '/:id/list',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const asset = await assetService.listOnMarketplace(id);

      logger.info('Asset listed on marketplace', { assetId: id, userId: req.user!.id });

      res.json({
        success: true,
        data: asset,
      });
    } catch (error) {
      if (error instanceof AssetServiceError) {
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
 * POST /api/v1/assets/:id/delist
 * 
 * Delist asset from marketplace
 */
assetsRouter.post(
  '/:id/delist',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const asset = await assetService.delistFromMarketplace(id);

      logger.info('Asset delisted from marketplace', { assetId: id, userId: req.user!.id });

      res.json({
        success: true,
        data: asset,
      });
    } catch (error) {
      if (error instanceof AssetServiceError) {
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
 * GET /api/v1/assets/:id/stats
 * 
 * Get asset statistics
 */
assetsRouter.get(
  '/:id/stats',
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const stats = await assetService.getAssetStats(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      if (error instanceof AssetServiceError) {
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

// ===========================================
// Document Management
// ===========================================

/**
 * GET /api/v1/assets/:id/documents
 * 
 * Get asset documents
 */
assetsRouter.get(
  '/:id/documents',
  validateParams(uuidParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const documents = await prisma.document.findMany({
        where: { assetId: id },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/assets/:id/documents
 * 
 * Upload a document
 */
assetsRouter.post(
  '/:id/documents',
  authenticate,
  requireBankAdmin,
  validateParams(uuidParamSchema),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { type, name } = req.body;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
          code: 'NO_FILE',
        });
        return;
      }

      // Validate document type
      const validTypes = ['APPRAISAL', 'LEGAL_OPINION', 'FINANCIAL_STATEMENT', 'TITLE_DEED', 'INSURANCE', 'PROSPECTUS', 'TERM_SHEET', 'OTHER'];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid document type',
          code: 'INVALID_TYPE',
        });
        return;
      }

      // Check asset exists
      const asset = await prisma.asset.findUnique({
        where: { id },
      });

      if (!asset) {
        res.status(404).json({
          success: false,
          error: 'Asset not found',
          code: 'ASSET_NOT_FOUND',
        });
        return;
      }

      // In production, upload to S3 and store the key
      // For now, we'll just create a placeholder
      const s3Key = `documents/${id}/${Date.now()}-${file.originalname}`;

      const document = await prisma.document.create({
        data: {
          assetId: id,
          type,
          name: name || file.originalname,
          s3Key,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          uploadedBy: req.user!.id,
        },
      });

      logger.info('Document uploaded', { documentId: document.id, assetId: id });

      res.status(201).json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/assets/:id/documents/:documentId
 * 
 * Delete a document
 */
assetsRouter.delete(
  '/:id/documents/:documentId',
  authenticate,
  requireBankAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, documentId } = req.params;

      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          assetId: id,
        },
      });

      if (!document) {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          code: 'DOCUMENT_NOT_FOUND',
        });
        return;
      }

      // In production, also delete from S3
      await prisma.document.delete({
        where: { id: documentId },
      });

      logger.info('Document deleted', { documentId, assetId: id });

      res.json({
        success: true,
        message: 'Document deleted',
      });
    } catch (error) {
      next(error);
    }
  }
);
