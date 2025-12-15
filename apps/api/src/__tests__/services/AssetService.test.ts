/**
 * AssetService Unit Tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma, mockTokenizationService } from '../setup';
import {
  createTestAsset,
  createTokenizedTestAsset,
  createTestBank,
} from '../utils/testHelpers';

// Import after mocks are set up
import { AssetService, AssetServiceError } from '../../services/AssetService';

describe('AssetService', () => {
  let assetService: AssetService;

  beforeEach(() => {
    assetService = new AssetService();
    jest.clearAllMocks();
  });

  describe('createAsset', () => {
    it('should create a new asset', async () => {
      const bank = createTestBank();
      const assetData = {
        name: 'Test Property',
        description: 'A test real estate property',
        assetType: 'REAL_ESTATE' as const,
        totalValue: 1000000,
        totalSupply: 10000,
      };

      const expectedAsset = createTestAsset(bank.id, assetData);
      mockPrisma.asset.create.mockResolvedValue({
        ...expectedAsset,
        bank: { id: bank.id, name: bank.name },
        _count: { documents: 0, transactions: 0, auctions: 0 },
      });

      const result = await assetService.createAsset(bank.id, assetData);

      expect(result).toBeDefined();
      expect(result.name).toBe(assetData.name);
      expect(result.tokenizationStatus).toBe('DRAFT');
      expect(result.listingStatus).toBe('UNLISTED');
      expect(mockPrisma.asset.create).toHaveBeenCalled();
    });

    it('should calculate price per token from total value and supply', async () => {
      const bank = createTestBank();
      const assetData = {
        name: 'Test Asset',
        assetType: 'EQUIPMENT' as const,
        totalValue: 500000,
        totalSupply: 5000,
      };

      const expectedAsset = createTestAsset(bank.id, {
        ...assetData,
        pricePerToken: 100, // 500000 / 5000
      });
      mockPrisma.asset.create.mockResolvedValue({
        ...expectedAsset,
        bank: { id: bank.id, name: bank.name },
        _count: { documents: 0, transactions: 0, auctions: 0 },
      });

      const result = await assetService.createAsset(bank.id, assetData);

      expect(result.pricePerToken).toBe(100);
    });
  });

  describe('getAssetById', () => {
    it('should return asset with details', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id);

      mockPrisma.asset.findUnique.mockResolvedValue({
        ...asset,
        bank: { id: bank.id, name: bank.name },
        documents: [],
        _count: { documents: 0, transactions: 0, auctions: 0 },
      });

      const result = await assetService.getAssetById(asset.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(asset.id);
      expect(mockPrisma.asset.findUnique).toHaveBeenCalledWith({
        where: { id: asset.id },
        include: expect.any(Object),
      });
    });

    it('should return null for non-existent asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      const result = await assetService.getAssetById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateAsset', () => {
    it('should update asset details', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id);
      const updateData = {
        name: 'Updated Asset Name',
        description: 'Updated description',
      };

      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.asset.update.mockResolvedValue({
        ...asset,
        ...updateData,
        bank: { id: bank.id, name: bank.name },
        _count: { documents: 0, transactions: 0, auctions: 0 },
      });

      const result = await assetService.updateAsset(asset.id, updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
    });

    it('should throw error for non-existent asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        assetService.updateAsset('non-existent', { name: 'New Name' })
      ).rejects.toThrow(AssetServiceError);
      await expect(
        assetService.updateAsset('non-existent', { name: 'New Name' })
      ).rejects.toMatchObject({
        code: 'ASSET_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw error when updating tokenized asset', async () => {
      const bank = createTestBank();
      const tokenizedAsset = createTokenizedTestAsset(bank.id);

      mockPrisma.asset.findUnique.mockResolvedValue(tokenizedAsset);

      await expect(
        assetService.updateAsset(tokenizedAsset.id, { name: 'New Name' })
      ).rejects.toThrow(AssetServiceError);
      await expect(
        assetService.updateAsset(tokenizedAsset.id, { name: 'New Name' })
      ).rejects.toMatchObject({
        code: 'ASSET_TOKENIZED',
        statusCode: 400,
      });
    });
  });

  describe('deleteAsset', () => {
    it('should delete a draft asset', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id);

      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.asset.delete.mockResolvedValue(asset);

      await assetService.deleteAsset(asset.id);

      expect(mockPrisma.document.deleteMany).toHaveBeenCalledWith({
        where: { assetId: asset.id },
      });
      expect(mockPrisma.asset.delete).toHaveBeenCalledWith({
        where: { id: asset.id },
      });
    });

    it('should throw error for non-existent asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(assetService.deleteAsset('non-existent')).rejects.toThrow(
        AssetServiceError
      );
      await expect(assetService.deleteAsset('non-existent')).rejects.toMatchObject({
        code: 'ASSET_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw error when deleting non-draft asset', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id, {
        tokenizationStatus: 'PENDING_REVIEW',
      });

      mockPrisma.asset.findUnique.mockResolvedValue(asset);

      await expect(assetService.deleteAsset(asset.id)).rejects.toThrow(
        AssetServiceError
      );
      await expect(assetService.deleteAsset(asset.id)).rejects.toMatchObject({
        code: 'CANNOT_DELETE',
        statusCode: 400,
      });
    });
  });

  describe('listAssets', () => {
    it('should list assets with pagination', async () => {
      const bank = createTestBank();
      const assets = [
        createTestAsset(bank.id),
        createTestAsset(bank.id),
        createTestAsset(bank.id),
      ];

      mockPrisma.asset.findMany.mockResolvedValue(
        assets.map((a) => ({
          ...a,
          bank: { id: bank.id, name: bank.name },
          _count: { documents: 0, transactions: 0, auctions: 0 },
        }))
      );
      mockPrisma.asset.count.mockResolvedValue(3);

      const result = await assetService.listAssets({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by bank ID', async () => {
      const bank = createTestBank();
      mockPrisma.asset.findMany.mockResolvedValue([]);
      mockPrisma.asset.count.mockResolvedValue(0);

      await assetService.listAssets({ bankId: bank.id });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ bankId: bank.id }),
        })
      );
    });

    it('should filter by asset type', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);
      mockPrisma.asset.count.mockResolvedValue(0);

      await assetService.listAssets({ assetType: 'REAL_ESTATE' });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assetType: 'REAL_ESTATE' }),
        })
      );
    });

    it('should filter by value range', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);
      mockPrisma.asset.count.mockResolvedValue(0);

      await assetService.listAssets({ minValue: 100000, maxValue: 500000 });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            totalValue: { gte: 100000, lte: 500000 },
          }),
        })
      );
    });
  });

  describe('listMarketplaceAssets', () => {
    it('should list only tokenized and listed assets', async () => {
      const bank = createTestBank();
      const listedAssets = [createTokenizedTestAsset(bank.id)];

      mockPrisma.asset.findMany.mockResolvedValue(
        listedAssets.map((a) => ({
          ...a,
          bank: { id: bank.id, name: bank.name },
          _count: { documents: 0, transactions: 0, auctions: 0 },
        }))
      );
      mockPrisma.asset.count.mockResolvedValue(1);

      const result = await assetService.listMarketplaceAssets({});

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tokenizationStatus: 'TOKENIZED',
            listingStatus: 'LISTED',
          }),
        })
      );
    });
  });

  describe('submitForReview', () => {
    it('should submit draft asset for review', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id);
      const documents = [
        { type: 'APPRAISAL' },
        { type: 'LEGAL_OPINION' },
      ];

      mockPrisma.asset.findUnique.mockResolvedValue({
        ...asset,
        documents,
      });
      mockPrisma.asset.update.mockResolvedValue({
        ...asset,
        tokenizationStatus: 'PENDING_REVIEW',
        bank: { id: bank.id, name: bank.name },
        _count: { documents: 2, transactions: 0, auctions: 0 },
      });

      const result = await assetService.submitForReview(asset.id);

      expect(result.tokenizationStatus).toBe('PENDING_REVIEW');
    });

    it('should throw error for non-existent asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(assetService.submitForReview('non-existent')).rejects.toThrow(
        AssetServiceError
      );
    });

    it('should throw error when required documents are missing', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id);

      mockPrisma.asset.findUnique.mockResolvedValue({
        ...asset,
        documents: [], // No documents
      });

      await expect(assetService.submitForReview(asset.id)).rejects.toThrow(
        AssetServiceError
      );
      await expect(assetService.submitForReview(asset.id)).rejects.toMatchObject({
        code: 'MISSING_DOCUMENTS',
        statusCode: 400,
      });
    });

    it('should throw error for non-draft asset', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id, {
        tokenizationStatus: 'PENDING_TOKENIZATION',
      });

      mockPrisma.asset.findUnique.mockResolvedValue({
        ...asset,
        documents: [],
      });

      await expect(assetService.submitForReview(asset.id)).rejects.toThrow(
        AssetServiceError
      );
      await expect(assetService.submitForReview(asset.id)).rejects.toMatchObject({
        code: 'INVALID_STATUS',
        statusCode: 400,
      });
    });
  });

  describe('approveForTokenization', () => {
    it('should approve asset for tokenization', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id, {
        tokenizationStatus: 'PENDING_REVIEW',
      });

      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.asset.update.mockResolvedValue({
        ...asset,
        tokenizationStatus: 'PENDING_TOKENIZATION',
        bank: { id: bank.id, name: bank.name },
        _count: { documents: 0, transactions: 0, auctions: 0 },
      });

      const result = await assetService.approveForTokenization(asset.id);

      expect(result.tokenizationStatus).toBe('PENDING_TOKENIZATION');
    });

    it('should throw error for non-pending-review asset', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id, { tokenizationStatus: 'DRAFT' });

      mockPrisma.asset.findUnique.mockResolvedValue(asset);

      await expect(
        assetService.approveForTokenization(asset.id)
      ).rejects.toThrow(AssetServiceError);
      await expect(
        assetService.approveForTokenization(asset.id)
      ).rejects.toMatchObject({
        code: 'INVALID_STATUS',
        statusCode: 400,
      });
    });
  });

  describe('tokenizeAsset', () => {
    it('should tokenize an approved asset', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id, {
        tokenizationStatus: 'PENDING_TOKENIZATION',
      });
      const params = {
        symbol: 'TEST',
        minimumInvestment: 1000,
      };

      mockPrisma.asset.findUnique.mockResolvedValue({
        ...asset,
        bank,
      });
      mockTokenizationService.createOffering.mockResolvedValue({
        id: 'offering-123',
        status: 'ACTIVE',
      });
      mockTokenizationService.deployToken.mockResolvedValue({
        mintAddress: 'mint-address-123',
        metadataUri: 'https://metadata.uri',
      });
      mockPrisma.asset.update.mockResolvedValue({
        ...asset,
        tokenizationStatus: 'TOKENIZED',
        mintAddress: 'mint-address-123',
        securitizeTokenId: 'offering-123',
        bank: { id: bank.id, name: bank.name },
        _count: { documents: 0, transactions: 0, auctions: 0 },
      });

      const result = await assetService.tokenizeAsset(asset.id, params);

      expect(result.tokenizationStatus).toBe('TOKENIZED');
      expect(result.mintAddress).toBe('mint-address-123');
    });

    it('should throw error for non-approved asset', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id, { tokenizationStatus: 'DRAFT' });

      mockPrisma.asset.findUnique.mockResolvedValue({
        ...asset,
        bank,
      });

      await expect(
        assetService.tokenizeAsset(asset.id, {
          symbol: 'TEST',
          minimumInvestment: 1000,
        })
      ).rejects.toThrow(AssetServiceError);
      await expect(
        assetService.tokenizeAsset(asset.id, {
          symbol: 'TEST',
          minimumInvestment: 1000,
        })
      ).rejects.toMatchObject({
        code: 'INVALID_STATUS',
        statusCode: 400,
      });
    });
  });

  describe('listOnMarketplace', () => {
    it('should list tokenized asset on marketplace', async () => {
      const bank = createTestBank();
      const asset = createTokenizedTestAsset(bank.id, {
        listingStatus: 'UNLISTED',
      });

      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.asset.update.mockResolvedValue({
        ...asset,
        listingStatus: 'LISTED',
        listedAt: new Date(),
        bank: { id: bank.id, name: bank.name },
        _count: { documents: 0, transactions: 0, auctions: 0 },
      });

      const result = await assetService.listOnMarketplace(asset.id);

      expect(result.listingStatus).toBe('LISTED');
    });

    it('should throw error for non-tokenized asset', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id);

      mockPrisma.asset.findUnique.mockResolvedValue(asset);

      await expect(assetService.listOnMarketplace(asset.id)).rejects.toThrow(
        AssetServiceError
      );
      await expect(assetService.listOnMarketplace(asset.id)).rejects.toMatchObject({
        code: 'INVALID_STATUS',
        statusCode: 400,
      });
    });
  });

  describe('delistFromMarketplace', () => {
    it('should delist asset from marketplace', async () => {
      const bank = createTestBank();
      const asset = createTokenizedTestAsset(bank.id);

      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.asset.update.mockResolvedValue({
        ...asset,
        listingStatus: 'DELISTED',
        bank: { id: bank.id, name: bank.name },
        _count: { documents: 0, transactions: 0, auctions: 0 },
      });

      const result = await assetService.delistFromMarketplace(asset.id);

      expect(result.listingStatus).toBe('DELISTED');
    });
  });

  describe('getAssetStats', () => {
    it('should return asset statistics', async () => {
      const bank = createTestBank();
      const asset = createTokenizedTestAsset(bank.id);

      mockPrisma.asset.findUnique.mockResolvedValue({
        ...asset,
        transactions: [
          { tokenAmount: 100, buyerId: 'buyer-1' },
          { tokenAmount: 50, buyerId: 'buyer-2' },
        ],
        portfolioHoldings: [{ tokenAmount: 100 }, { tokenAmount: 50 }],
      });

      const result = await assetService.getAssetStats(asset.id);

      expect(result.totalValue).toBe(Number(asset.totalValue));
      expect(result.totalSupply).toBe(Number(asset.totalSupply));
      expect(result.soldTokens).toBe(150);
      expect(result.investorCount).toBe(2);
      expect(result.transactionCount).toBe(2);
    });

    it('should throw error for non-existent asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(assetService.getAssetStats('non-existent')).rejects.toThrow(
        AssetServiceError
      );
    });
  });
});