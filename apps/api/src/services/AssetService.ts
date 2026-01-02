/**
 * Asset Service
 * 
 * Handles asset CRUD operations and tokenization workflow
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { config } from '../config';
import { tokenizationService } from '../integrations/securitize/TokenizationService';
import { SecurityType } from '../integrations/securitize/types';
import { Keypair, PublicKey } from '@solana/web3.js';

// Check if we're in mock mode (no real Securitize credentials)
const isMockMode = !config.securitize.apiKey || 
  config.securitize.apiKey === 'development_securitize_api_key' ||
  config.securitize.apiKey.includes('your_') ||
  config.nodeEnv === 'development';

// Define types locally until Prisma client is generated
type AssetType = 'REAL_ESTATE' | 'EQUIPMENT' | 'RECEIVABLES' | 'SECURITIES' | 'COMMODITIES' | 'INTELLECTUAL_PROPERTY' | 'OTHER';
type TokenizationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PENDING_TOKENIZATION' | 'TOKENIZED' | 'FAILED';
type ListingStatus = 'UNLISTED' | 'PENDING' | 'LISTED' | 'SOLD_OUT' | 'DELISTED';
type DocumentType = 'APPRAISAL' | 'LEGAL_OPINION' | 'FINANCIAL_STATEMENT' | 'TITLE_DEED' | 'INSURANCE' | 'PROSPECTUS' | 'TERM_SHEET' | 'OTHER';

/**
 * Asset with relations
 */
export interface AssetWithDetails {
  id: string;
  bankId: string;
  name: string;
  description: string | null;
  assetType: AssetType;
  totalValue: number;
  totalSupply: number;
  pricePerToken: number | null;
  mintAddress: string | null;
  metadataUri: string | null;
  securitizeTokenId: string | null;
  tokenizationStatus: TokenizationStatus;
  listingStatus: ListingStatus;
  tokenizedAt: Date | null;
  listedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  bank?: {
    id: string;
    name: string;
  };
  documents?: DocumentInfo[];
  _count?: {
    documents: number;
    transactions: number;
    auctions: number;
  };
}

export interface DocumentInfo {
  id: string;
  type: DocumentType;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

/**
 * Service errors
 */
export class AssetServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AssetServiceError';
  }
}

/**
 * AssetService handles all asset-related operations
 */
export class AssetService {
  /**
   * Create a new asset
   */
  async createAsset(
    bankId: string,
    data: {
      name: string;
      description?: string;
      assetType: AssetType;
      totalValue: number;
      totalSupply: number;
      pricePerToken?: number;
    }
  ): Promise<AssetWithDetails> {
    const pricePerToken = data.pricePerToken || data.totalValue / data.totalSupply;

    const asset = await prisma.asset.create({
      data: {
        bankId,
        name: data.name,
        description: data.description,
        assetType: data.assetType,
        totalValue: data.totalValue,
        totalSupply: BigInt(data.totalSupply),
        pricePerToken,
        tokenizationStatus: 'DRAFT',
        listingStatus: 'UNLISTED',
      },
      include: {
        bank: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            documents: true,
            transactions: true,
            auctions: true,
          },
        },
      },
    });

    logger.info('Asset created', { assetId: asset.id, bankId });

    return this.formatAsset(asset);
  }

  /**
   * Get asset by ID
   */
  async getAssetById(assetId: string): Promise<AssetWithDetails | null> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        bank: {
          select: { id: true, name: true },
        },
        documents: {
          select: {
            id: true,
            type: true,
            name: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            documents: true,
            transactions: true,
            auctions: true,
          },
        },
      },
    });

    if (!asset) return null;

    return this.formatAsset(asset);
  }

  /**
   * Update asset
   */
  async updateAsset(
    assetId: string,
    data: {
      name?: string;
      description?: string;
      totalValue?: number;
      pricePerToken?: number;
    }
  ): Promise<AssetWithDetails> {
    // Check if asset can be updated
    const existing = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!existing) {
      throw new AssetServiceError('Asset not found', 'ASSET_NOT_FOUND', 404);
    }

    if (existing.tokenizationStatus === 'TOKENIZED') {
      throw new AssetServiceError(
        'Cannot update tokenized asset',
        'ASSET_TOKENIZED',
        400
      );
    }

    const asset = await prisma.asset.update({
      where: { id: assetId },
      data,
      include: {
        bank: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            documents: true,
            transactions: true,
            auctions: true,
          },
        },
      },
    });

    logger.info('Asset updated', { assetId });

    return this.formatAsset(asset);
  }

  /**
   * Delete asset (only drafts)
   */
  async deleteAsset(assetId: string): Promise<void> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new AssetServiceError('Asset not found', 'ASSET_NOT_FOUND', 404);
    }

    if (asset.tokenizationStatus !== 'DRAFT') {
      throw new AssetServiceError(
        'Only draft assets can be deleted',
        'CANNOT_DELETE',
        400
      );
    }

    // Delete documents first
    await prisma.document.deleteMany({
      where: { assetId },
    });

    await prisma.asset.delete({
      where: { id: assetId },
    });

    logger.info('Asset deleted', { assetId });
  }

  /**
   * List assets with filters
   */
  async listAssets(params: {
    bankId?: string;
    assetType?: AssetType;
    tokenizationStatus?: TokenizationStatus;
    listingStatus?: ListingStatus;
    minValue?: number;
    maxValue?: number;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: AssetWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Ensure page and limit are integers (query params come as strings)
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.bankId) {
      where.bankId = params.bankId;
    }
    if (params.assetType) {
      where.assetType = params.assetType;
    }
    if (params.tokenizationStatus) {
      where.tokenizationStatus = params.tokenizationStatus;
    }
    if (params.listingStatus) {
      where.listingStatus = params.listingStatus;
    }
    if (params.minValue || params.maxValue) {
      where.totalValue = {};
      if (params.minValue) {
        (where.totalValue as Record<string, number>).gte = params.minValue;
      }
      if (params.maxValue) {
        (where.totalValue as Record<string, number>).lte = params.maxValue;
      }
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (params.sortBy) {
      orderBy[params.sortBy] = params.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          bank: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              documents: true,
              transactions: true,
              auctions: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.asset.count({ where }),
    ]);

    return {
      data: assets.map((a: unknown) => this.formatAsset(a)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List publicly available assets (marketplace)
   */
  async listMarketplaceAssets(params: {
    assetType?: AssetType;
    minValue?: number;
    maxValue?: number;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: AssetWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.listAssets({
      ...params,
      tokenizationStatus: 'TOKENIZED',
      listingStatus: 'LISTED',
    });
  }

  /**
   * Submit asset for review
   */
  async submitForReview(assetId: string): Promise<AssetWithDetails> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        documents: true,
      },
    });

    if (!asset) {
      throw new AssetServiceError('Asset not found', 'ASSET_NOT_FOUND', 404);
    }

    if (asset.tokenizationStatus !== 'DRAFT') {
      throw new AssetServiceError(
        'Only draft assets can be submitted for review',
        'INVALID_STATUS',
        400
      );
    }

    // Check required documents
    const requiredDocTypes: DocumentType[] = ['APPRAISAL', 'LEGAL_OPINION'];
    const existingDocTypes = asset.documents.map((d: { type: DocumentType }) => d.type);
    const missingDocs = requiredDocTypes.filter((t) => !existingDocTypes.includes(t));

    if (missingDocs.length > 0) {
      throw new AssetServiceError(
        `Missing required documents: ${missingDocs.join(', ')}`,
        'MISSING_DOCUMENTS',
        400
      );
    }

    const updated = await prisma.asset.update({
      where: { id: assetId },
      data: {
        tokenizationStatus: 'PENDING_REVIEW',
      },
      include: {
        bank: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            documents: true,
            transactions: true,
            auctions: true,
          },
        },
      },
    });

    logger.info('Asset submitted for review', { assetId });

    return this.formatAsset(updated);
  }

  /**
   * Approve asset for tokenization
   */
  async approveForTokenization(assetId: string): Promise<AssetWithDetails> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new AssetServiceError('Asset not found', 'ASSET_NOT_FOUND', 404);
    }

    if (asset.tokenizationStatus !== 'PENDING_REVIEW') {
      throw new AssetServiceError(
        'Only pending review assets can be approved',
        'INVALID_STATUS',
        400
      );
    }

    const updated = await prisma.asset.update({
      where: { id: assetId },
      data: {
        tokenizationStatus: 'PENDING_TOKENIZATION',
      },
      include: {
        bank: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            documents: true,
            transactions: true,
            auctions: true,
          },
        },
      },
    });

    logger.info('Asset approved for tokenization', { assetId });

    return this.formatAsset(updated);
  }

  /**
   * Tokenize an asset
   */
  async tokenizeAsset(
    assetId: string,
    params: {
      symbol: string;
      minimumInvestment: number;
      maximumInvestment?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<AssetWithDetails> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        bank: true,
      },
    });

    if (!asset) {
      throw new AssetServiceError('Asset not found', 'ASSET_NOT_FOUND', 404);
    }

    // Allow tokenization from DRAFT (direct), PENDING_TOKENIZATION (after approval), or FAILED (retry)
    if (asset.tokenizationStatus !== 'PENDING_TOKENIZATION' && asset.tokenizationStatus !== 'DRAFT' && asset.tokenizationStatus !== 'FAILED') {
      throw new AssetServiceError(
        'Asset must be in DRAFT, PENDING_TOKENIZATION, or FAILED status to tokenize',
        'INVALID_STATUS',
        400
      );
    }

    try {
      // Map asset type to security type
      const securityTypeMap: Record<AssetType, SecurityType> = {
        REAL_ESTATE: 'REAL_ESTATE' as SecurityType,
        EQUIPMENT: 'DEBT' as SecurityType,
        RECEIVABLES: 'DEBT' as SecurityType,
        SECURITIES: 'EQUITY' as SecurityType,
        COMMODITIES: 'FUND' as SecurityType,
        INTELLECTUAL_PROPERTY: 'OTHER' as SecurityType,
        OTHER: 'OTHER' as SecurityType,
      };

      let offeringId: string;
      let mintAddress: string;
      let metadataUri: string | undefined;

      if (isMockMode) {
        // Mock mode: Generate simulated tokenization data
        logger.info('Using mock tokenization mode (no real Securitize credentials)');
        
        // Generate mock offering ID and mint address
        offeringId = `mock-offering-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const mockMint = Keypair.generate();
        mintAddress = mockMint.publicKey.toBase58();
        metadataUri = `https://mock-metadata.example.com/${offeringId}`;
        
        logger.info('Mock tokenization completed', { 
          assetId, 
          offeringId, 
          mintAddress 
        });
      } else {
        // Real mode: Use Securitize API
        const offering = await tokenizationService.createOffering({
          symbol: params.symbol,
          name: asset.name,
          description: asset.description || '',
          securityType: securityTypeMap[asset.assetType as AssetType],
          totalSupply: Number(asset.totalSupply),
          pricePerToken: Number(asset.pricePerToken) * 100, // Convert to cents
          minimumInvestment: params.minimumInvestment * 100,
          maximumInvestment: params.maximumInvestment ? params.maximumInvestment * 100 : undefined,
          startDate: params.startDate,
          endDate: params.endDate,
          underlyingAsset: {
            type: asset.assetType,
            value: Number(asset.totalValue),
          },
        });

        // Deploy token on Solana
        // In production, this would use a secure key management system
        const authorityKeypair = Keypair.generate(); // Placeholder
        const mintedToken = await tokenizationService.deployToken(offering.id, authorityKeypair);
        
        offeringId = offering.id;
        mintAddress = mintedToken.mintAddress;
        metadataUri = mintedToken.metadataUri;
      }

      // Update asset with tokenization info
      const updated = await prisma.asset.update({
        where: { id: assetId },
        data: {
          securitizeTokenId: offeringId,
          mintAddress: mintAddress,
          metadataUri: metadataUri,
          tokenizationStatus: 'TOKENIZED',
          tokenizedAt: new Date(),
        },
        include: {
          bank: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              documents: true,
              transactions: true,
              auctions: true,
            },
          },
        },
      });

      logger.info('Asset tokenized', { 
        assetId, 
        offeringId, 
        mintAddress,
        mockMode: isMockMode
      });

      return this.formatAsset(updated);
    } catch (error) {
      // Mark as failed
      await prisma.asset.update({
        where: { id: assetId },
        data: {
          tokenizationStatus: 'FAILED',
        },
      });

      logger.error('Tokenization failed', { assetId, error });

      throw new AssetServiceError(
        'Tokenization failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
        'TOKENIZATION_FAILED',
        500
      );
    }
  }

  /**
   * List asset on marketplace
   */
  async listOnMarketplace(assetId: string): Promise<AssetWithDetails> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new AssetServiceError('Asset not found', 'ASSET_NOT_FOUND', 404);
    }

    if (asset.tokenizationStatus !== 'TOKENIZED') {
      throw new AssetServiceError(
        'Only tokenized assets can be listed',
        'INVALID_STATUS',
        400
      );
    }

    const updated = await prisma.asset.update({
      where: { id: assetId },
      data: {
        listingStatus: 'LISTED',
        listedAt: new Date(),
      },
      include: {
        bank: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            documents: true,
            transactions: true,
            auctions: true,
          },
        },
      },
    });

    logger.info('Asset listed on marketplace', { assetId });

    return this.formatAsset(updated);
  }

  /**
   * Delist asset from marketplace
   */
  async delistFromMarketplace(assetId: string): Promise<AssetWithDetails> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new AssetServiceError('Asset not found', 'ASSET_NOT_FOUND', 404);
    }

    const updated = await prisma.asset.update({
      where: { id: assetId },
      data: {
        listingStatus: 'DELISTED',
      },
      include: {
        bank: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            documents: true,
            transactions: true,
            auctions: true,
          },
        },
      },
    });

    logger.info('Asset delisted from marketplace', { assetId });

    return this.formatAsset(updated);
  }

  /**
   * Get asset statistics
   */
  async getAssetStats(assetId: string): Promise<{
    totalValue: number;
    totalSupply: number;
    pricePerToken: number;
    soldTokens: number;
    availableTokens: number;
    transactionCount: number;
    investorCount: number;
  }> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        transactions: {
          where: { status: 'COMPLETED' },
          select: { tokenAmount: true, buyerId: true },
        },
        portfolioHoldings: {
          select: { tokenAmount: true },
        },
      },
    });

    if (!asset) {
      throw new AssetServiceError('Asset not found', 'ASSET_NOT_FOUND', 404);
    }

    const soldTokens = asset.portfolioHoldings.reduce(
      (sum: number, h: { tokenAmount: unknown }) => sum + Number(h.tokenAmount),
      0
    );

    const uniqueInvestors = new Set(
      asset.transactions.map((t: { buyerId: string }) => t.buyerId)
    ).size;

    return {
      totalValue: Number(asset.totalValue),
      totalSupply: Number(asset.totalSupply),
      pricePerToken: Number(asset.pricePerToken) || 0,
      soldTokens,
      availableTokens: Number(asset.totalSupply) - soldTokens,
      transactionCount: asset.transactions.length,
      investorCount: uniqueInvestors,
    };
  }

  /**
   * Format asset for response
   */
  private formatAsset(asset: unknown): AssetWithDetails {
    const a = asset as Record<string, unknown>;
    return {
      id: a.id as string,
      bankId: a.bankId as string,
      name: a.name as string,
      description: a.description as string | null,
      assetType: a.assetType as AssetType,
      totalValue: Number(a.totalValue),
      totalSupply: Number(a.totalSupply),
      pricePerToken: a.pricePerToken ? Number(a.pricePerToken) : null,
      mintAddress: a.mintAddress as string | null,
      metadataUri: a.metadataUri as string | null,
      securitizeTokenId: a.securitizeTokenId as string | null,
      tokenizationStatus: a.tokenizationStatus as TokenizationStatus,
      listingStatus: a.listingStatus as ListingStatus,
      tokenizedAt: a.tokenizedAt as Date | null,
      listedAt: a.listedAt as Date | null,
      createdAt: a.createdAt as Date,
      updatedAt: a.updatedAt as Date,
      bank: a.bank as { id: string; name: string } | undefined,
      documents: a.documents as DocumentInfo[] | undefined,
      _count: a._count as { documents: number; transactions: number; auctions: number } | undefined,
    };
  }
}

// Export singleton instance
export const assetService = new AssetService();