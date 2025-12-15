/**
 * TransactionService Unit Tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../setup';
import {
  createTestTransaction,
  createCompletedTestTransaction,
  createTestAsset,
  createTokenizedTestAsset,
  createTestBank,
  createVerifiedTestUser,
  createTestUser,
  createTestInvestorProfile,
  generateWalletAddress,
} from '../utils/testHelpers';

// Import after mocks are set up
import { TransactionService, TransactionServiceError } from '../../services/TransactionService';

describe('TransactionService', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    transactionService = new TransactionService();
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should create a new purchase transaction', async () => {
      const bank = createTestBank();
      const asset = createTokenizedTestAsset(bank.id);
      const buyer = createVerifiedTestUser();
      const profile = createTestInvestorProfile(buyer.id);

      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.portfolioHolding.aggregate.mockResolvedValue({
        _sum: { tokenAmount: 0 },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...buyer,
        investorProfile: profile,
      });

      const transaction = createTestTransaction(asset.id, buyer.id, {
        tokenAmount: 100,
        amount: 10000,
      });
      mockPrisma.transaction.create.mockResolvedValue({
        ...transaction,
        asset: {
          id: asset.id,
          name: asset.name,
          pricePerToken: asset.pricePerToken,
          mintAddress: asset.mintAddress,
        },
      });

      const result = await transactionService.createTransaction(
        buyer.id,
        asset.id,
        100
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
      expect(result.type).toBe('PRIMARY_SALE');
      expect(mockPrisma.transaction.create).toHaveBeenCalled();
    });

    it('should throw error for non-existent asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        transactionService.createTransaction('buyer-id', 'non-existent', 100)
      ).rejects.toThrow(TransactionServiceError);
      await expect(
        transactionService.createTransaction('buyer-id', 'non-existent', 100)
      ).rejects.toMatchObject({
        code: 'ASSET_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw error for unlisted asset', async () => {
      const bank = createTestBank();
      const asset = createTestAsset(bank.id, { listingStatus: 'UNLISTED' });

      mockPrisma.asset.findUnique.mockResolvedValue(asset);

      await expect(
        transactionService.createTransaction('buyer-id', asset.id, 100)
      ).rejects.toThrow(TransactionServiceError);
      await expect(
        transactionService.createTransaction('buyer-id', asset.id, 100)
      ).rejects.toMatchObject({
        code: 'NOT_LISTED',
        statusCode: 400,
      });
    });

    it('should throw error when insufficient tokens available', async () => {
      const bank = createTestBank();
      const asset = createTokenizedTestAsset(bank.id);
      const buyer = createVerifiedTestUser();

      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.portfolioHolding.aggregate.mockResolvedValue({
        _sum: { tokenAmount: Number(asset.totalSupply) }, // All tokens sold
      });

      await expect(
        transactionService.createTransaction(buyer.id, asset.id, 100)
      ).rejects.toThrow(TransactionServiceError);
      await expect(
        transactionService.createTransaction(buyer.id, asset.id, 100)
      ).rejects.toMatchObject({
        code: 'INSUFFICIENT_SUPPLY',
        statusCode: 400,
      });
    });

    it('should throw error when buyer KYC not verified', async () => {
      const bank = createTestBank();
      const asset = createTokenizedTestAsset(bank.id);
      const buyer = createTestUser({ kycStatus: 'PENDING' });

      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.portfolioHolding.aggregate.mockResolvedValue({
        _sum: { tokenAmount: 0 },
      });
      mockPrisma.user.findUnique.mockResolvedValue(buyer);

      await expect(
        transactionService.createTransaction(buyer.id, asset.id, 100)
      ).rejects.toThrow(TransactionServiceError);
      await expect(
        transactionService.createTransaction(buyer.id, asset.id, 100)
      ).rejects.toMatchObject({
        code: 'KYC_REQUIRED',
        statusCode: 403,
      });
    });
  });

  describe('createEscrow', () => {
    it('should create escrow for pending transaction', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id');

      mockPrisma.transaction.findUnique.mockResolvedValue({
        ...transaction,
        asset: { name: 'Test Asset' },
      });
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: 'ESCROW_CREATED',
        escrowAddress: expect.any(String),
        asset: {
          id: 'asset-id',
          name: 'Test Asset',
          pricePerToken: 100,
          mintAddress: null,
        },
      });

      const result = await transactionService.createEscrow(transaction.id);

      expect(result.status).toBe('ESCROW_CREATED');
      expect(result.escrowAddress).toBeDefined();
    });

    it('should throw error for non-existent transaction', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      await expect(
        transactionService.createEscrow('non-existent')
      ).rejects.toThrow(TransactionServiceError);
      await expect(
        transactionService.createEscrow('non-existent')
      ).rejects.toMatchObject({
        code: 'TX_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw error for non-pending transaction', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id', {
        status: 'ESCROW_CREATED',
      });

      mockPrisma.transaction.findUnique.mockResolvedValue({
        ...transaction,
        asset: { name: 'Test Asset' },
      });

      await expect(
        transactionService.createEscrow(transaction.id)
      ).rejects.toThrow(TransactionServiceError);
      await expect(
        transactionService.createEscrow(transaction.id)
      ).rejects.toMatchObject({
        code: 'INVALID_STATUS',
        statusCode: 400,
      });
    });
  });

  describe('recordPayment', () => {
    it('should record payment for escrow transaction', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id', {
        status: 'ESCROW_CREATED',
        escrowAddress: generateWalletAddress(),
      });

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: 'PAYMENT_RECEIVED',
        asset: {
          id: 'asset-id',
          name: 'Test Asset',
          pricePerToken: 100,
          mintAddress: null,
        },
      });

      const result = await transactionService.recordPayment(
        transaction.id,
        'tx-signature-123'
      );

      expect(result.status).toBe('PAYMENT_RECEIVED');
    });

    it('should throw error when escrow not created', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id', {
        status: 'PENDING',
      });

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);

      await expect(
        transactionService.recordPayment(transaction.id, 'tx-sig')
      ).rejects.toThrow(TransactionServiceError);
      await expect(
        transactionService.recordPayment(transaction.id, 'tx-sig')
      ).rejects.toMatchObject({
        code: 'INVALID_STATUS',
        statusCode: 400,
      });
    });
  });

  describe('transferTokens', () => {
    it('should transfer tokens after payment received', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id', {
        status: 'PAYMENT_RECEIVED',
        escrowAddress: generateWalletAddress(),
      });

      mockPrisma.transaction.findUnique.mockResolvedValue({
        ...transaction,
        asset: { name: 'Test Asset' },
        buyer: { walletAddress: generateWalletAddress() },
      });
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: 'TOKENS_TRANSFERRED',
        txSignature: expect.any(String),
        asset: {
          id: 'asset-id',
          name: 'Test Asset',
          pricePerToken: 100,
          mintAddress: null,
        },
      });

      const result = await transactionService.transferTokens(transaction.id);

      expect(result.status).toBe('TOKENS_TRANSFERRED');
      expect(result.txSignature).toBeDefined();
    });

    it('should throw error when payment not received', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id', {
        status: 'ESCROW_CREATED',
      });

      mockPrisma.transaction.findUnique.mockResolvedValue({
        ...transaction,
        asset: { name: 'Test Asset' },
        buyer: { walletAddress: generateWalletAddress() },
      });

      await expect(
        transactionService.transferTokens(transaction.id)
      ).rejects.toThrow(TransactionServiceError);
      await expect(
        transactionService.transferTokens(transaction.id)
      ).rejects.toMatchObject({
        code: 'INVALID_STATUS',
        statusCode: 400,
      });
    });
  });

  describe('completeTransaction', () => {
    it('should complete transaction and update portfolio', async () => {
      const buyer = createVerifiedTestUser();
      const profile = createTestInvestorProfile(buyer.id);
      const transaction = createTestTransaction('asset-id', buyer.id, {
        status: 'TOKENS_TRANSFERRED',
        txSignature: 'tx-123',
      });

      mockPrisma.transaction.findUnique.mockResolvedValue({
        ...transaction,
        asset: { name: 'Test Asset' },
        buyer: {
          ...buyer,
          investorProfile: profile,
        },
      });
      mockPrisma.$transaction.mockResolvedValue([
        {
          ...transaction,
          status: 'COMPLETED',
          completedAt: new Date(),
          asset: {
            id: 'asset-id',
            name: 'Test Asset',
            pricePerToken: 100,
            mintAddress: null,
          },
        },
        { id: 'holding-id' },
      ]);

      const result = await transactionService.completeTransaction(transaction.id);

      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).toBeDefined();
    });

    it('should throw error when tokens not transferred', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id', {
        status: 'PAYMENT_RECEIVED',
      });

      mockPrisma.transaction.findUnique.mockResolvedValue({
        ...transaction,
        asset: { name: 'Test Asset' },
        buyer: {
          investorProfile: null,
        },
      });

      await expect(
        transactionService.completeTransaction(transaction.id)
      ).rejects.toThrow(TransactionServiceError);
    });

    it('should throw error when buyer has no profile', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id', {
        status: 'TOKENS_TRANSFERRED',
      });

      mockPrisma.transaction.findUnique.mockResolvedValue({
        ...transaction,
        asset: { name: 'Test Asset' },
        buyer: {
          investorProfile: null,
        },
      });

      await expect(
        transactionService.completeTransaction(transaction.id)
      ).rejects.toThrow(TransactionServiceError);
      await expect(
        transactionService.completeTransaction(transaction.id)
      ).rejects.toMatchObject({
        code: 'NO_PROFILE',
        statusCode: 400,
      });
    });
  });

  describe('cancelTransaction', () => {
    it('should cancel a pending transaction', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id');

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...transaction,
        status: 'CANCELLED',
        failureReason: 'User requested cancellation',
        asset: {
          id: 'asset-id',
          name: 'Test Asset',
          pricePerToken: 100,
          mintAddress: null,
        },
      });

      const result = await transactionService.cancelTransaction(
        transaction.id,
        'User requested cancellation'
      );

      expect(result.status).toBe('CANCELLED');
      expect(result.failureReason).toBe('User requested cancellation');
    });

    it('should throw error for completed transaction', async () => {
      const transaction = createCompletedTestTransaction('asset-id', 'buyer-id');

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);

      await expect(
        transactionService.cancelTransaction(transaction.id, 'Cancel')
      ).rejects.toThrow(TransactionServiceError);
      await expect(
        transactionService.cancelTransaction(transaction.id, 'Cancel')
      ).rejects.toMatchObject({
        code: 'CANNOT_CANCEL',
        statusCode: 400,
      });
    });

    it('should throw error for already cancelled transaction', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id', {
        status: 'CANCELLED',
      });

      mockPrisma.transaction.findUnique.mockResolvedValue(transaction);

      await expect(
        transactionService.cancelTransaction(transaction.id, 'Cancel')
      ).rejects.toThrow(TransactionServiceError);
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction with asset details', async () => {
      const transaction = createTestTransaction('asset-id', 'buyer-id');

      mockPrisma.transaction.findUnique.mockResolvedValue({
        ...transaction,
        asset: {
          id: 'asset-id',
          name: 'Test Asset',
          pricePerToken: 100,
          mintAddress: null,
        },
      });

      const result = await transactionService.getTransactionById(transaction.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(transaction.id);
      expect(result?.asset).toBeDefined();
    });

    it('should return null for non-existent transaction', async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null);

      const result = await transactionService.getTransactionById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('listUserTransactions', () => {
    it('should list transactions with pagination', async () => {
      const transactions = [
        createTestTransaction('asset-1', 'user-id'),
        createTestTransaction('asset-2', 'user-id'),
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(
        transactions.map((t) => ({
          ...t,
          asset: {
            id: t.assetId,
            name: 'Test Asset',
            pricePerToken: 100,
            mintAddress: null,
          },
        }))
      );
      mockPrisma.transaction.count.mockResolvedValue(2);

      const result = await transactionService.listUserTransactions('user-id', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await transactionService.listUserTransactions('user-id', {
        status: 'COMPLETED',
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should filter by asset', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await transactionService.listUserTransactions('user-id', {
        assetId: 'asset-123',
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assetId: 'asset-123',
          }),
        })
      );
    });
  });

  describe('listAssetTransactions', () => {
    it('should list transactions for an asset', async () => {
      const transactions = [
        createTestTransaction('asset-id', 'buyer-1'),
        createTestTransaction('asset-id', 'buyer-2'),
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(
        transactions.map((t) => ({
          ...t,
          asset: {
            id: 'asset-id',
            name: 'Test Asset',
            pricePerToken: 100,
            mintAddress: null,
          },
        }))
      );
      mockPrisma.transaction.count.mockResolvedValue(2);

      const result = await transactionService.listAssetTransactions('asset-id', {});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getUserTransactionStats', () => {
    it('should return transaction statistics', async () => {
      mockPrisma.transaction.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: 5 },
        { status: 'PENDING', _count: 2 },
      ]);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: {
          amount: 50000,
          tokenAmount: 500,
        },
      });

      const result = await transactionService.getUserTransactionStats('user-id');

      expect(result.totalTransactions).toBe(7);
      expect(result.completedTransactions).toBe(5);
      expect(result.totalInvested).toBe(50000);
      expect(result.totalTokens).toBe(500);
    });

    it('should handle user with no transactions', async () => {
      mockPrisma.transaction.groupBy.mockResolvedValue([]);
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: {
          amount: null,
          tokenAmount: null,
        },
      });

      const result = await transactionService.getUserTransactionStats('user-id');

      expect(result.totalTransactions).toBe(0);
      expect(result.completedTransactions).toBe(0);
      expect(result.totalInvested).toBe(0);
      expect(result.totalTokens).toBe(0);
    });
  });
});