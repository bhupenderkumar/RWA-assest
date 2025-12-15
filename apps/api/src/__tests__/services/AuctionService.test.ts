/**
 * AuctionService Unit Tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../setup';
import {
  createTestAuction,
  createActiveTestAuction,
  createTestBid,
  createTokenizedTestAsset,
  createTestBank,
  createVerifiedTestUser,
  createTestUser,
  generateWalletAddress,
} from '../utils/testHelpers';

// Import after mocks are set up
import { AuctionService, AuctionServiceError } from '../../services/AuctionService';

describe('AuctionService', () => {
  let auctionService: AuctionService;

  beforeEach(() => {
    auctionService = new AuctionService();
    jest.clearAllMocks();
  });

  describe('createAuction', () => {
    it('should create a new auction', async () => {
      const bank = createTestBank();
      const asset = createTokenizedTestAsset(bank.id);
      const now = new Date();
      const startTime = new Date(now.getTime() + 3600000);
      const endTime = new Date(startTime.getTime() + 86400000);

      const auctionData = {
        reservePrice: 50000,
        tokenAmount: 100,
        startTime,
        endTime,
      };

      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.auction.findFirst.mockResolvedValue(null);

      const auction = createTestAuction(asset.id, {
        ...auctionData,
        status: 'SCHEDULED',
      });
      mockPrisma.auction.create.mockResolvedValue({
        ...auction,
        asset: {
          id: asset.id,
          name: asset.name,
          pricePerToken: asset.pricePerToken,
          mintAddress: asset.mintAddress,
        },
        _count: { bids: 0 },
      });

      const result = await auctionService.createAuction(asset.id, auctionData);

      expect(result).toBeDefined();
      expect(result.status).toBe('SCHEDULED');
      expect(result.reservePrice).toBe(50000);
      expect(mockPrisma.auction.create).toHaveBeenCalled();
    });

    it('should throw error for non-existent asset', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      const now = new Date();
      await expect(
        auctionService.createAuction('non-existent', {
          reservePrice: 50000,
          tokenAmount: 100,
          startTime: new Date(now.getTime() + 3600000),
          endTime: new Date(now.getTime() + 90000000),
        })
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.createAuction('non-existent', {
          reservePrice: 50000,
          tokenAmount: 100,
          startTime: new Date(now.getTime() + 3600000),
          endTime: new Date(now.getTime() + 90000000),
        })
      ).rejects.toMatchObject({
        code: 'ASSET_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw error for non-tokenized asset', async () => {
      const bank = createTestBank();
      const asset = createTokenizedTestAsset(bank.id, {
        tokenizationStatus: 'DRAFT',
      });

      mockPrisma.asset.findUnique.mockResolvedValue(asset);

      const now = new Date();
      await expect(
        auctionService.createAuction(asset.id, {
          reservePrice: 50000,
          tokenAmount: 100,
          startTime: new Date(now.getTime() + 3600000),
          endTime: new Date(now.getTime() + 90000000),
        })
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.createAuction(asset.id, {
          reservePrice: 50000,
          tokenAmount: 100,
          startTime: new Date(now.getTime() + 3600000),
          endTime: new Date(now.getTime() + 90000000),
        })
      ).rejects.toMatchObject({
        code: 'NOT_TOKENIZED',
        statusCode: 400,
      });
    });

    it('should throw error when start time is in the past', async () => {
      const bank = createTestBank();
      const asset = createTokenizedTestAsset(bank.id);

      mockPrisma.asset.findUnique.mockResolvedValue(asset);

      const pastTime = new Date(Date.now() - 3600000);
      await expect(
        auctionService.createAuction(asset.id, {
          reservePrice: 50000,
          tokenAmount: 100,
          startTime: pastTime,
          endTime: new Date(Date.now() + 90000000),
        })
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.createAuction(asset.id, {
          reservePrice: 50000,
          tokenAmount: 100,
          startTime: pastTime,
          endTime: new Date(Date.now() + 90000000),
        })
      ).rejects.toMatchObject({
        code: 'INVALID_START_TIME',
        statusCode: 400,
      });
    });

    it('should throw error when overlapping auction exists', async () => {
      const bank = createTestBank();
      const asset = createTokenizedTestAsset(bank.id);
      const existingAuction = createActiveTestAuction(asset.id);

      mockPrisma.asset.findUnique.mockResolvedValue(asset);
      mockPrisma.auction.findFirst.mockResolvedValue(existingAuction);

      const now = new Date();
      await expect(
        auctionService.createAuction(asset.id, {
          reservePrice: 50000,
          tokenAmount: 100,
          startTime: new Date(now.getTime() + 3600000),
          endTime: new Date(now.getTime() + 90000000),
        })
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.createAuction(asset.id, {
          reservePrice: 50000,
          tokenAmount: 100,
          startTime: new Date(now.getTime() + 3600000),
          endTime: new Date(now.getTime() + 90000000),
        })
      ).rejects.toMatchObject({
        code: 'OVERLAPPING_AUCTION',
        statusCode: 400,
      });
    });
  });

  describe('getAuctionById', () => {
    it('should return auction with details', async () => {
      const auction = createActiveTestAuction('asset-id');

      mockPrisma.auction.findUnique.mockResolvedValue({
        ...auction,
        asset: {
          id: 'asset-id',
          name: 'Test Asset',
          pricePerToken: 100,
          mintAddress: generateWalletAddress(),
        },
        bids: [],
        _count: { bids: 0 },
      });

      const result = await auctionService.getAuctionById(auction.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(auction.id);
      expect(result?.asset).toBeDefined();
    });

    it('should return null for non-existent auction', async () => {
      mockPrisma.auction.findUnique.mockResolvedValue(null);

      const result = await auctionService.getAuctionById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('listAuctions', () => {
    it('should list auctions with pagination', async () => {
      const auctions = [
        createTestAuction('asset-1'),
        createActiveTestAuction('asset-2'),
      ];

      mockPrisma.auction.findMany.mockResolvedValue(
        auctions.map((a) => ({
          ...a,
          asset: {
            id: a.assetId,
            name: 'Test Asset',
            pricePerToken: 100,
            mintAddress: null,
          },
          _count: { bids: 0 },
        }))
      );
      mockPrisma.auction.count.mockResolvedValue(2);

      const result = await auctionService.listAuctions({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockPrisma.auction.findMany.mockResolvedValue([]);
      mockPrisma.auction.count.mockResolvedValue(0);

      await auctionService.listAuctions({ status: 'ACTIVE' });

      expect(mockPrisma.auction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter by reserve price range', async () => {
      mockPrisma.auction.findMany.mockResolvedValue([]);
      mockPrisma.auction.count.mockResolvedValue(0);

      await auctionService.listAuctions({
        minReservePrice: 10000,
        maxReservePrice: 100000,
      });

      expect(mockPrisma.auction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reservePrice: { gte: 10000, lte: 100000 },
          }),
        })
      );
    });
  });

  describe('listActiveAuctions', () => {
    it('should list only active auctions', async () => {
      const activeAuctions = [createActiveTestAuction('asset-1')];

      mockPrisma.auction.findMany.mockResolvedValue(
        activeAuctions.map((a) => ({
          ...a,
          asset: {
            id: a.assetId,
            name: 'Test Asset',
            pricePerToken: 100,
            mintAddress: null,
          },
          _count: { bids: 0 },
        }))
      );
      mockPrisma.auction.count.mockResolvedValue(1);

      const result = await auctionService.listActiveAuctions({});

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.auction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('placeBid', () => {
    it('should place a bid on an active auction', async () => {
      const auction = createActiveTestAuction('asset-id');
      const bidder = createVerifiedTestUser();
      const bidAmount = 60000;

      mockPrisma.auction.findUnique.mockResolvedValue(auction);
      mockPrisma.user.findFirst.mockResolvedValue(bidder);

      const bid = createTestBid(auction.id, bidder.walletAddress!, bidAmount, {
        isWinning: true,
      });
      mockPrisma.$transaction.mockResolvedValue([
        bid,
        { count: 0 },
        { ...auction, currentBid: bidAmount, currentBidder: bidder.walletAddress },
      ]);

      const result = await auctionService.placeBid(
        auction.id,
        bidder.walletAddress!,
        bidAmount
      );

      expect(result).toBeDefined();
      expect(result.amount).toBe(bidAmount);
      expect(result.isWinning).toBe(true);
    });

    it('should throw error for non-existent auction', async () => {
      mockPrisma.auction.findUnique.mockResolvedValue(null);

      await expect(
        auctionService.placeBid('non-existent', generateWalletAddress(), 50000)
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.placeBid('non-existent', generateWalletAddress(), 50000)
      ).rejects.toMatchObject({
        code: 'AUCTION_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw error for inactive auction', async () => {
      const auction = createTestAuction('asset-id', { status: 'ENDED' });

      mockPrisma.auction.findUnique.mockResolvedValue(auction);

      await expect(
        auctionService.placeBid(auction.id, generateWalletAddress(), 50000)
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.placeBid(auction.id, generateWalletAddress(), 50000)
      ).rejects.toMatchObject({
        code: 'AUCTION_NOT_ACTIVE',
        statusCode: 400,
      });
    });

    it('should throw error when bid is below minimum', async () => {
      const auction = createActiveTestAuction('asset-id');

      mockPrisma.auction.findUnique.mockResolvedValue(auction);

      await expect(
        auctionService.placeBid(auction.id, generateWalletAddress(), 10000) // Below reserve price
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.placeBid(auction.id, generateWalletAddress(), 10000)
      ).rejects.toMatchObject({
        code: 'BID_TOO_LOW',
        statusCode: 400,
      });
    });

    it('should throw error when bidder KYC not verified', async () => {
      const auction = createActiveTestAuction('asset-id');
      const unverifiedUser = createTestUser({ kycStatus: 'PENDING' });

      mockPrisma.auction.findUnique.mockResolvedValue(auction);
      mockPrisma.user.findFirst.mockResolvedValue(unverifiedUser);

      await expect(
        auctionService.placeBid(auction.id, unverifiedUser.walletAddress!, 60000)
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.placeBid(auction.id, unverifiedUser.walletAddress!, 60000)
      ).rejects.toMatchObject({
        code: 'KYC_REQUIRED',
        statusCode: 403,
      });
    });
  });

  describe('cancelBid', () => {
    it('should cancel a non-winning bid', async () => {
      const bidder = generateWalletAddress();
      const bid = createTestBid('auction-id', bidder, 50000, { isWinning: false });

      mockPrisma.bid.findUnique.mockResolvedValue({
        ...bid,
        auction: { status: 'ACTIVE' },
      });
      mockPrisma.bid.delete.mockResolvedValue(bid);

      await auctionService.cancelBid(bid.id, bidder);

      expect(mockPrisma.bid.delete).toHaveBeenCalledWith({
        where: { id: bid.id },
      });
    });

    it('should throw error for non-existent bid', async () => {
      mockPrisma.bid.findUnique.mockResolvedValue(null);

      await expect(
        auctionService.cancelBid('non-existent', generateWalletAddress())
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.cancelBid('non-existent', generateWalletAddress())
      ).rejects.toMatchObject({
        code: 'BID_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw error when cancelling someone else\'s bid', async () => {
      const bidder = generateWalletAddress();
      const otherBidder = generateWalletAddress();
      const bid = createTestBid('auction-id', bidder, 50000);

      mockPrisma.bid.findUnique.mockResolvedValue({
        ...bid,
        auction: { status: 'ACTIVE' },
      });

      await expect(
        auctionService.cancelBid(bid.id, otherBidder)
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.cancelBid(bid.id, otherBidder)
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should throw error when cancelling winning bid', async () => {
      const bidder = generateWalletAddress();
      const bid = createTestBid('auction-id', bidder, 50000, { isWinning: true });

      mockPrisma.bid.findUnique.mockResolvedValue({
        ...bid,
        auction: { status: 'ACTIVE' },
      });

      await expect(
        auctionService.cancelBid(bid.id, bidder)
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.cancelBid(bid.id, bidder)
      ).rejects.toMatchObject({
        code: 'CANNOT_CANCEL_WINNING',
        statusCode: 400,
      });
    });
  });

  describe('settleAuction', () => {
    it('should settle an ended auction with winning bid', async () => {
      const winner = createVerifiedTestUser();
      const winningBid = createTestBid('auction-id', winner.walletAddress!, 60000, {
        isWinning: true,
      });
      const auction = createTestAuction('asset-id', {
        status: 'ENDED',
        endTime: new Date(Date.now() - 3600000),
        currentBid: 60000,
        currentBidder: winner.walletAddress,
      });

      mockPrisma.auction.findUnique.mockResolvedValue({
        ...auction,
        bids: [winningBid],
      });
      mockPrisma.user.findFirst.mockResolvedValue(winner);
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx-id',
        type: 'AUCTION_SETTLEMENT',
        status: 'COMPLETED',
      });
      mockPrisma.auction.update.mockResolvedValue({
        ...auction,
        status: 'SETTLED',
        settledAt: new Date(),
        asset: {
          id: 'asset-id',
          name: 'Test Asset',
          pricePerToken: 100,
          mintAddress: null,
        },
        _count: { bids: 1 },
      });

      const result = await auctionService.settleAuction(auction.id);

      expect(result.status).toBe('SETTLED');
      expect(mockPrisma.transaction.create).toHaveBeenCalled();
    });

    it('should cancel auction with no bids', async () => {
      const auction = createTestAuction('asset-id', {
        status: 'ENDED',
        endTime: new Date(Date.now() - 3600000),
      });

      mockPrisma.auction.findUnique.mockResolvedValue({
        ...auction,
        bids: [],
      });
      mockPrisma.auction.update.mockResolvedValue({
        ...auction,
        status: 'CANCELLED',
        asset: {
          id: 'asset-id',
          name: 'Test Asset',
          pricePerToken: 100,
          mintAddress: null,
        },
        _count: { bids: 0 },
      });

      const result = await auctionService.settleAuction(auction.id);

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error for auction not ended', async () => {
      const auction = createActiveTestAuction('asset-id');

      mockPrisma.auction.findUnique.mockResolvedValue({
        ...auction,
        bids: [],
      });

      await expect(
        auctionService.settleAuction(auction.id)
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.settleAuction(auction.id)
      ).rejects.toMatchObject({
        code: 'AUCTION_NOT_ENDED',
        statusCode: 400,
      });
    });
  });

  describe('cancelAuction', () => {
    it('should cancel a scheduled auction', async () => {
      const auction = createTestAuction('asset-id', { status: 'SCHEDULED' });

      mockPrisma.auction.findUnique.mockResolvedValue(auction);
      mockPrisma.auction.update.mockResolvedValue({
        ...auction,
        status: 'CANCELLED',
        asset: {
          id: 'asset-id',
          name: 'Test Asset',
          pricePerToken: 100,
          mintAddress: null,
        },
        _count: { bids: 0 },
      });

      const result = await auctionService.cancelAuction(auction.id);

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw error for already settled auction', async () => {
      const auction = createTestAuction('asset-id', { status: 'SETTLED' });

      mockPrisma.auction.findUnique.mockResolvedValue(auction);

      await expect(
        auctionService.cancelAuction(auction.id)
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.cancelAuction(auction.id)
      ).rejects.toMatchObject({
        code: 'INVALID_STATUS',
        statusCode: 400,
      });
    });
  });

  describe('extendAuction', () => {
    it('should extend auction end time', async () => {
      const auction = createActiveTestAuction('asset-id');
      const newEndTime = new Date(auction.endTime.getTime() + 3600000);

      mockPrisma.auction.findUnique.mockResolvedValue(auction);
      mockPrisma.auction.update.mockResolvedValue({
        ...auction,
        endTime: newEndTime,
        asset: {
          id: 'asset-id',
          name: 'Test Asset',
          pricePerToken: 100,
          mintAddress: null,
        },
        _count: { bids: 0 },
      });

      const result = await auctionService.extendAuction(auction.id, newEndTime);

      expect(result.endTime).toEqual(newEndTime);
    });

    it('should throw error when new end time is not after current', async () => {
      const auction = createActiveTestAuction('asset-id');
      const earlierEndTime = new Date(auction.endTime.getTime() - 3600000);

      mockPrisma.auction.findUnique.mockResolvedValue(auction);

      await expect(
        auctionService.extendAuction(auction.id, earlierEndTime)
      ).rejects.toThrow(AuctionServiceError);
      await expect(
        auctionService.extendAuction(auction.id, earlierEndTime)
      ).rejects.toMatchObject({
        code: 'INVALID_END_TIME',
        statusCode: 400,
      });
    });
  });

  describe('getBidHistory', () => {
    it('should return bid history with pagination', async () => {
      const bids = [
        createTestBid('auction-id', generateWalletAddress(), 60000),
        createTestBid('auction-id', generateWalletAddress(), 55000),
      ];

      mockPrisma.bid.findMany.mockResolvedValue(bids);
      mockPrisma.bid.count.mockResolvedValue(2);

      const result = await auctionService.getBidHistory('auction-id', {
        page: 1,
        limit: 50,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('updateAuctionStatuses', () => {
    it('should activate scheduled auctions', async () => {
      mockPrisma.auction.updateMany.mockResolvedValue({ count: 1 });

      await auctionService.updateAuctionStatuses();

      expect(mockPrisma.auction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SCHEDULED',
          }),
          data: { status: 'ACTIVE' },
        })
      );
    });

    it('should end active auctions past end time', async () => {
      mockPrisma.auction.updateMany.mockResolvedValue({ count: 1 });

      await auctionService.updateAuctionStatuses();

      expect(mockPrisma.auction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
          data: { status: 'ENDED' },
        })
      );
    });
  });
});