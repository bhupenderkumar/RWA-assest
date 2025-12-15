/**
 * User Service
 * 
 * Handles user profile management and investor operations
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { civicService } from '../integrations/civic/CivicService';

// Define types locally until Prisma client is generated
type UserRole = 'PLATFORM_ADMIN' | 'BANK_ADMIN' | 'BANK_VIEWER' | 'INVESTOR' | 'AUDITOR';
type KycStatus = 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
type AccreditationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
type InvestorType = 'INDIVIDUAL' | 'INSTITUTIONAL' | 'QUALIFIED_PURCHASER';
type RiskTolerance = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * User with optional relations
 */
export interface UserWithProfile {
  id: string;
  email: string | null;
  role: UserRole;
  walletAddress: string | null;
  civicPassToken: string | null;
  kycStatus: KycStatus;
  kycVerifiedAt: Date | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  investorProfile?: InvestorProfile | null;
}

export interface InvestorProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  country: string;
  accreditationStatus: AccreditationStatus;
  accreditedAt: Date | null;
  investorType: InvestorType;
  riskTolerance: RiskTolerance | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service errors
 */
export class UserServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

/**
 * UserService handles all user-related operations
 */
export class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserWithProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        investorProfile: true,
      },
    });

    return user as UserWithProfile | null;
  }

  /**
   * Get user by wallet address
   */
  async getUserByWallet(walletAddress: string): Promise<UserWithProfile | null> {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        investorProfile: true,
      },
    });

    return user as UserWithProfile | null;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: {
      email?: string;
    }
  ): Promise<UserWithProfile> {
    // Check if email is already taken
    if (data.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existing && existing.id !== userId) {
        throw new UserServiceError(
          'Email already in use',
          'EMAIL_TAKEN',
          409
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      include: {
        investorProfile: true,
      },
    });

    logger.info('User profile updated', { userId, email: data.email });

    return user as UserWithProfile;
  }

  /**
   * Create or update investor profile
   */
  async upsertInvestorProfile(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      country: string;
      investorType?: InvestorType;
      riskTolerance?: RiskTolerance;
    }
  ): Promise<InvestorProfile> {
    const profile = await prisma.investorProfile.upsert({
      where: { userId },
      create: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country,
        investorType: data.investorType || 'INDIVIDUAL',
        riskTolerance: data.riskTolerance,
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country,
        investorType: data.investorType,
        riskTolerance: data.riskTolerance,
      },
    });

    logger.info('Investor profile updated', { userId, profileId: profile.id });

    return profile as InvestorProfile;
  }

  /**
   * Get investor profile
   */
  async getInvestorProfile(userId: string): Promise<InvestorProfile | null> {
    const profile = await prisma.investorProfile.findUnique({
      where: { userId },
    });

    return profile as InvestorProfile | null;
  }

  /**
   * Get KYC status for user
   */
  async getKycStatus(userId: string): Promise<{
    status: KycStatus;
    isVerified: boolean;
    verifiedAt: Date | null;
    civicPassToken: string | null;
    expiresAt?: Date;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        kycStatus: true,
        kycVerifiedAt: true,
        civicPassToken: true,
        walletAddress: true,
      },
    });

    if (!user) {
      throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
    }

    let expiresAt: Date | undefined;

    // Check Civic Pass status if wallet connected
    if (user.walletAddress) {
      try {
        const civicStatus = await civicService.verifyWallet(user.walletAddress);
        
        if (civicStatus.isVerified && civicStatus.expiresAt) {
          expiresAt = civicStatus.expiresAt;
        }
      } catch (error) {
        logger.warn('Failed to check Civic Pass status', { 
          userId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return {
      status: user.kycStatus as KycStatus,
      isVerified: user.kycStatus === 'VERIFIED',
      verifiedAt: user.kycVerifiedAt,
      civicPassToken: user.civicPassToken,
      expiresAt,
    };
  }

  /**
   * Initiate KYC verification
   */
  async initiateKyc(
    userId: string,
    redirectUrl?: string
  ): Promise<{
    verificationUrl: string;
    requestId: string;
    expiresAt: Date;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletAddress: true,
        kycStatus: true,
      },
    });

    if (!user) {
      throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
    }

    if (!user.walletAddress) {
      throw new UserServiceError(
        'Wallet must be connected before KYC',
        'WALLET_REQUIRED',
        400
      );
    }

    if (user.kycStatus === 'VERIFIED') {
      throw new UserServiceError(
        'KYC already verified',
        'ALREADY_VERIFIED',
        400
      );
    }

    // Request Civic Pass verification
    const verification = await civicService.requestVerification(
      user.walletAddress,
      redirectUrl
    );

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'IN_PROGRESS',
      },
    });

    logger.info('KYC initiated', { userId, requestId: verification.requestId });

    return {
      verificationUrl: verification.verificationUrl,
      requestId: verification.requestId,
      expiresAt: verification.expiresAt,
    };
  }

  /**
   * Update KYC status from Civic Pass callback
   */
  async updateKycStatus(
    walletAddress: string,
    status: KycStatus,
    civicPassToken?: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: status,
        civicPassToken,
        kycVerifiedAt: status === 'VERIFIED' ? new Date() : null,
      },
    });

    logger.info('KYC status updated', { userId: user.id, status });
  }

  /**
   * List all users (admin only)
   */
  async listUsers(params: {
    role?: UserRole;
    kycStatus?: KycStatus;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    data: UserWithProfile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.role) {
      where.role = params.role;
    }
    if (params.kycStatus) {
      where.kycStatus = params.kycStatus;
    }
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { walletAddress: { contains: params.search } },
        {
          investorProfile: {
            OR: [
              { firstName: { contains: params.search, mode: 'insensitive' } },
              { lastName: { contains: params.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          investorProfile: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users as UserWithProfile[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Disable user account
   */
  async disableUser(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    logger.info('User disabled', { userId });
  }

  /**
   * Enable user account
   */
  async enableUser(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    logger.info('User enabled', { userId });
  }

  /**
   * Get user portfolio holdings
   */
  async getPortfolioHoldings(userId: string): Promise<{
    holdings: Array<{
      assetId: string;
      assetName: string;
      tokenAmount: number;
      costBasis: number;
      currentValue: number;
      pnl: number;
      pnlPercentage: number;
    }>;
    totalValue: number;
    totalCostBasis: number;
    totalPnl: number;
  }> {
    const profile = await prisma.investorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        holdings: [],
        totalValue: 0,
        totalCostBasis: 0,
        totalPnl: 0,
      };
    }

    const holdings = await prisma.portfolioHolding.findMany({
      where: { investorId: profile.id },
      include: {
        asset: true,
      },
    });

    let totalValue = 0;
    let totalCostBasis = 0;

    const mappedHoldings = holdings.map((holding: {
      assetId: string;
      tokenAmount: unknown;
      costBasis: unknown;
      asset: { name: string; pricePerToken: unknown };
    }) => {
      const currentValue = holding.asset.pricePerToken
        ? Number(holding.tokenAmount) * Number(holding.asset.pricePerToken)
        : Number(holding.costBasis);
      
      const costBasis = Number(holding.costBasis);
      const pnl = currentValue - costBasis;
      const pnlPercentage = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      totalValue += currentValue;
      totalCostBasis += costBasis;

      return {
        assetId: holding.assetId,
        assetName: holding.asset.name,
        tokenAmount: Number(holding.tokenAmount),
        costBasis,
        currentValue,
        pnl,
        pnlPercentage,
      };
    });

    return {
      holdings: mappedHoldings,
      totalValue,
      totalCostBasis,
      totalPnl: totalValue - totalCostBasis,
    };
  }
}

// Export singleton instance
export const userService = new UserService();