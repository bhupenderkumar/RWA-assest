/**
 * Zod Validation Schemas
 * 
 * Request validation schemas for all API endpoints
 */

import { z } from 'zod';

// ===========================================
// Common Schemas
// ===========================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const uuidSchema = z.string().uuid();

export const walletAddressSchema = z.string().regex(
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  'Invalid Solana wallet address'
);

// ===========================================
// Auth Schemas
// ===========================================

export const loginSchema = z.object({
  walletAddress: walletAddressSchema,
  signature: z.string().min(1, 'Signature is required'),
  message: z.string().min(1, 'Message is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const walletConnectSchema = z.object({
  walletAddress: walletAddressSchema,
});

// ===========================================
// User Schemas
// ===========================================

export const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  country: z.string().length(2).optional(), // ISO country code
});

export const createInvestorProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  country: z.string().length(2), // ISO country code
  investorType: z.enum(['INDIVIDUAL', 'INSTITUTIONAL', 'QUALIFIED_PURCHASER']).default('INDIVIDUAL'),
  riskTolerance: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

// ===========================================
// Asset Schemas
// ===========================================

export const assetTypeEnum = z.enum([
  'REAL_ESTATE',
  'EQUIPMENT',
  'RECEIVABLES',
  'SECURITIES',
  'COMMODITIES',
  'INTELLECTUAL_PROPERTY',
  'OTHER',
]);

export const createAssetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  assetType: assetTypeEnum,
  totalValue: z.number().positive(),
  totalSupply: z.number().int().positive(),
  pricePerToken: z.number().positive().optional(),
});

export const updateAssetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  totalValue: z.number().positive().optional(),
  pricePerToken: z.number().positive().optional(),
});

export const tokenizeAssetSchema = z.object({
  symbol: z.string().min(3).max(10).regex(/^[A-Z0-9-]+$/),
  minimumInvestment: z.number().positive(),
  maximumInvestment: z.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const listAssetsSchema = z.object({
  assetType: assetTypeEnum.optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PENDING_TOKENIZATION', 'TOKENIZED', 'FAILED']).optional(),
  listingStatus: z.enum(['UNLISTED', 'PENDING', 'LISTED', 'SOLD_OUT', 'DELISTED']).optional(),
  minValue: z.coerce.number().positive().optional(),
  maxValue: z.coerce.number().positive().optional(),
  search: z.string().max(100).optional(),
}).merge(paginationSchema);

// ===========================================
// Document Schemas
// ===========================================

export const documentTypeEnum = z.enum([
  'APPRAISAL',
  'LEGAL_OPINION',
  'FINANCIAL_STATEMENT',
  'TITLE_DEED',
  'INSURANCE',
  'PROSPECTUS',
  'TERM_SHEET',
  'OTHER',
]);

export const uploadDocumentSchema = z.object({
  type: documentTypeEnum,
  name: z.string().min(1).max(255),
});

// ===========================================
// Transaction Schemas
// ===========================================

export const transactionTypeEnum = z.enum([
  'PRIMARY_SALE',
  'SECONDARY_SALE',
  'AUCTION_SETTLEMENT',
  'REDEMPTION',
]);

export const createTransactionSchema = z.object({
  assetId: uuidSchema,
  tokenAmount: z.number().positive(),
  type: transactionTypeEnum.default('PRIMARY_SALE'),
});

export const listTransactionsSchema = z.object({
  assetId: uuidSchema.optional(),
  type: transactionTypeEnum.optional(),
  status: z.enum([
    'PENDING',
    'ESCROW_CREATED',
    'PAYMENT_RECEIVED',
    'TOKENS_TRANSFERRED',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
  ]).optional(),
}).merge(paginationSchema);

// ===========================================
// Auction Schemas
// ===========================================

export const createAuctionSchema = z.object({
  assetId: uuidSchema,
  reservePrice: z.number().positive(),
  tokenAmount: z.number().positive(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const placeBidSchema = z.object({
  amount: z.number().positive(),
});

export const listAuctionsSchema = z.object({
  assetId: uuidSchema.optional(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'ENDED', 'SETTLED', 'CANCELLED']).optional(),
  minReservePrice: z.coerce.number().positive().optional(),
  maxReservePrice: z.coerce.number().positive().optional(),
}).merge(paginationSchema);

// ===========================================
// Type exports
// ===========================================

export type PaginationParams = z.infer<typeof paginationSchema>;
export type LoginParams = z.infer<typeof loginSchema>;
export type RefreshTokenParams = z.infer<typeof refreshTokenSchema>;
export type WalletConnectParams = z.infer<typeof walletConnectSchema>;
export type UpdateProfileParams = z.infer<typeof updateProfileSchema>;
export type CreateInvestorProfileParams = z.infer<typeof createInvestorProfileSchema>;
export type CreateAssetParams = z.infer<typeof createAssetSchema>;
export type UpdateAssetParams = z.infer<typeof updateAssetSchema>;
export type TokenizeAssetParams = z.infer<typeof tokenizeAssetSchema>;
export type ListAssetsParams = z.infer<typeof listAssetsSchema>;
export type UploadDocumentParams = z.infer<typeof uploadDocumentSchema>;
export type CreateTransactionParams = z.infer<typeof createTransactionSchema>;
export type ListTransactionsParams = z.infer<typeof listTransactionsSchema>;
export type CreateAuctionParams = z.infer<typeof createAuctionSchema>;
export type PlaceBidParams = z.infer<typeof placeBidSchema>;
export type ListAuctionsParams = z.infer<typeof listAuctionsSchema>;