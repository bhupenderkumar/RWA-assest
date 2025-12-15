/**
 * UserService Unit Tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  mockPrisma,
  mockCivicService,
} from '../setup';
import {
  createTestUser,
  createVerifiedTestUser,
  createTestInvestorProfile,
  generateWalletAddress,
} from '../utils/testHelpers';

// Import after mocks are set up
import { UserService, UserServiceError } from '../../services/UserService';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user with investor profile', async () => {
      const testUser = createVerifiedTestUser();
      const investorProfile = createTestInvestorProfile(testUser.id);
      const userWithProfile = { ...testUser, investorProfile };

      mockPrisma.user.findUnique.mockResolvedValue(userWithProfile);

      const result = await userService.getUserById(testUser.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testUser.id);
      expect(result?.investorProfile).toBeDefined();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUser.id },
        include: { investorProfile: true },
      });
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.getUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getUserByWallet', () => {
    it('should return user by wallet address', async () => {
      const testUser = createVerifiedTestUser();
      mockPrisma.user.findUnique.mockResolvedValue(testUser);

      const result = await userService.getUserByWallet(testUser.walletAddress!);

      expect(result).toBeDefined();
      expect(result?.walletAddress).toBe(testUser.walletAddress);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { walletAddress: testUser.walletAddress },
        include: { investorProfile: true },
      });
    });

    it('should return null for non-existent wallet', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.getUserByWallet(generateWalletAddress());

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update user email', async () => {
      const testUser = createTestUser();
      const newEmail = 'newemail@example.com';

      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user with email
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        email: newEmail,
      });

      const result = await userService.updateProfile(testUser.id, {
        email: newEmail,
      });

      expect(result.email).toBe(newEmail);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: { email: newEmail },
        include: { investorProfile: true },
      });
    });

    it('should throw error when email is already taken', async () => {
      const testUser = createTestUser();
      const existingUser = createTestUser({ email: 'taken@example.com' });

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(
        userService.updateProfile(testUser.id, { email: 'taken@example.com' })
      ).rejects.toThrow(UserServiceError);
      await expect(
        userService.updateProfile(testUser.id, { email: 'taken@example.com' })
      ).rejects.toMatchObject({
        code: 'EMAIL_TAKEN',
        statusCode: 409,
      });
    });

    it('should allow same email for same user', async () => {
      const testUser = createTestUser({ email: 'same@example.com' });

      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue(testUser);

      const result = await userService.updateProfile(testUser.id, {
        email: 'same@example.com',
      });

      expect(result.email).toBe('same@example.com');
    });
  });

  describe('upsertInvestorProfile', () => {
    it('should create investor profile', async () => {
      const testUser = createTestUser();
      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        country: 'US',
        investorType: 'INDIVIDUAL' as const,
        riskTolerance: 'MEDIUM' as const,
      };

      const createdProfile = createTestInvestorProfile(testUser.id, profileData);
      mockPrisma.investorProfile.upsert.mockResolvedValue(createdProfile);

      const result = await userService.upsertInvestorProfile(testUser.id, profileData);

      expect(result).toBeDefined();
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.country).toBe('US');
      expect(mockPrisma.investorProfile.upsert).toHaveBeenCalled();
    });

    it('should update existing investor profile', async () => {
      const testUser = createTestUser();
      const updatedData = {
        firstName: 'Jane',
        lastName: 'Smith',
        country: 'UK',
      };

      const updatedProfile = createTestInvestorProfile(testUser.id, updatedData);
      mockPrisma.investorProfile.upsert.mockResolvedValue(updatedProfile);

      const result = await userService.upsertInvestorProfile(testUser.id, updatedData);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.country).toBe('UK');
    });
  });

  describe('getInvestorProfile', () => {
    it('should return investor profile', async () => {
      const testUser = createTestUser();
      const profile = createTestInvestorProfile(testUser.id);

      mockPrisma.investorProfile.findUnique.mockResolvedValue(profile);

      const result = await userService.getInvestorProfile(testUser.id);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(testUser.id);
    });

    it('should return null if no profile exists', async () => {
      mockPrisma.investorProfile.findUnique.mockResolvedValue(null);

      const result = await userService.getInvestorProfile('no-profile-user');

      expect(result).toBeNull();
    });
  });

  describe('getKycStatus', () => {
    it('should return KYC status for user', async () => {
      const testUser = createVerifiedTestUser();

      mockPrisma.user.findUnique.mockResolvedValue({
        kycStatus: testUser.kycStatus,
        kycVerifiedAt: testUser.kycVerifiedAt,
        civicPassToken: testUser.civicPassToken,
        walletAddress: testUser.walletAddress,
      });
      mockCivicService.verifyWallet.mockResolvedValue({
        isVerified: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await userService.getKycStatus(testUser.id);

      expect(result.status).toBe('VERIFIED');
      expect(result.isVerified).toBe(true);
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getKycStatus('non-existent')).rejects.toThrow(
        UserServiceError
      );
      await expect(userService.getKycStatus('non-existent')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should return pending status for unverified user', async () => {
      const testUser = createTestUser({ kycStatus: 'PENDING' });

      mockPrisma.user.findUnique.mockResolvedValue({
        kycStatus: testUser.kycStatus,
        kycVerifiedAt: null,
        civicPassToken: null,
        walletAddress: testUser.walletAddress,
      });
      mockCivicService.verifyWallet.mockResolvedValue({
        isVerified: false,
      });

      const result = await userService.getKycStatus(testUser.id);

      expect(result.status).toBe('PENDING');
      expect(result.isVerified).toBe(false);
    });
  });

  describe('initiateKyc', () => {
    it('should initiate KYC verification', async () => {
      const testUser = createTestUser({ kycStatus: 'PENDING' });
      const verificationData = {
        verificationUrl: 'https://civic.com/verify/123',
        requestId: 'req-123',
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        walletAddress: testUser.walletAddress,
        kycStatus: 'PENDING',
      });
      mockCivicService.requestVerification.mockResolvedValue(verificationData);
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        kycStatus: 'IN_PROGRESS',
      });

      const result = await userService.initiateKyc(testUser.id);

      expect(result.verificationUrl).toBe(verificationData.verificationUrl);
      expect(result.requestId).toBe(verificationData.requestId);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: { kycStatus: 'IN_PROGRESS' },
      });
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.initiateKyc('non-existent')).rejects.toThrow(
        UserServiceError
      );
      await expect(userService.initiateKyc('non-existent')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('should throw error when wallet not connected', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        walletAddress: null,
        kycStatus: 'PENDING',
      });

      await expect(userService.initiateKyc('user-id')).rejects.toThrow(
        UserServiceError
      );
      await expect(userService.initiateKyc('user-id')).rejects.toMatchObject({
        code: 'WALLET_REQUIRED',
        statusCode: 400,
      });
    });

    it('should throw error when already verified', async () => {
      const testUser = createVerifiedTestUser();

      mockPrisma.user.findUnique.mockResolvedValue({
        walletAddress: testUser.walletAddress,
        kycStatus: 'VERIFIED',
      });

      await expect(userService.initiateKyc(testUser.id)).rejects.toThrow(
        UserServiceError
      );
      await expect(userService.initiateKyc(testUser.id)).rejects.toMatchObject({
        code: 'ALREADY_VERIFIED',
        statusCode: 400,
      });
    });
  });

  describe('updateKycStatus', () => {
    it('should update KYC status to verified', async () => {
      const testUser = createTestUser();

      mockPrisma.user.findUnique.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        kycStatus: 'VERIFIED',
        kycVerifiedAt: new Date(),
      });

      await userService.updateKycStatus(
        testUser.walletAddress!,
        'VERIFIED',
        'civic-pass-token'
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: {
          kycStatus: 'VERIFIED',
          civicPassToken: 'civic-pass-token',
          kycVerifiedAt: expect.any(Date),
        },
      });
    });

    it('should throw error for non-existent wallet', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        userService.updateKycStatus(generateWalletAddress(), 'VERIFIED')
      ).rejects.toThrow(UserServiceError);
      await expect(
        userService.updateKycStatus(generateWalletAddress(), 'VERIFIED')
      ).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('listUsers', () => {
    it('should list users with pagination', async () => {
      const users = [
        createTestUser(),
        createTestUser(),
        createVerifiedTestUser(),
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(3);

      const result = await userService.listUsers({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by role', async () => {
      const adminUsers = [createTestUser({ role: 'PLATFORM_ADMIN' })];

      mockPrisma.user.findMany.mockResolvedValue(adminUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await userService.listUsers({ role: 'PLATFORM_ADMIN' });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'PLATFORM_ADMIN' }),
        })
      );
    });

    it('should filter by KYC status', async () => {
      const verifiedUsers = [createVerifiedTestUser()];

      mockPrisma.user.findMany.mockResolvedValue(verifiedUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await userService.listUsers({ kycStatus: 'VERIFIED' });

      expect(result.data).toHaveLength(1);
    });

    it('should search users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await userService.listUsers({ search: 'john' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('disableUser', () => {
    it('should disable user account', async () => {
      const testUser = createTestUser();

      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        isActive: false,
      });

      await userService.disableUser(testUser.id);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: { isActive: false },
      });
    });
  });

  describe('enableUser', () => {
    it('should enable user account', async () => {
      const testUser = createTestUser({ isActive: false });

      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        isActive: true,
      });

      await userService.enableUser(testUser.id);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUser.id },
        data: { isActive: true },
      });
    });
  });

  describe('getPortfolioHoldings', () => {
    it('should return portfolio holdings', async () => {
      const testUser = createTestUser();
      const profile = createTestInvestorProfile(testUser.id);
      const holdings = [
        {
          assetId: 'asset-1',
          tokenAmount: 100n,
          costBasis: 10000,
          asset: { name: 'Test Asset', pricePerToken: 110 },
        },
      ];

      mockPrisma.investorProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.portfolioHolding.findMany.mockResolvedValue(holdings);

      const result = await userService.getPortfolioHoldings(testUser.id);

      expect(result.holdings).toHaveLength(1);
      expect(result.totalValue).toBeGreaterThan(0);
    });

    it('should return empty portfolio for user without profile', async () => {
      mockPrisma.investorProfile.findUnique.mockResolvedValue(null);

      const result = await userService.getPortfolioHoldings('no-profile-user');

      expect(result.holdings).toHaveLength(0);
      expect(result.totalValue).toBe(0);
      expect(result.totalCostBasis).toBe(0);
      expect(result.totalPnl).toBe(0);
    });
  });
});