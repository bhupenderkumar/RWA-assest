/**
 * Test Helpers and Utilities
 *
 * Provides factory functions and utilities for creating test data
 */

import { v4 as uuidv4 } from 'uuid';

// Types for test data
type UserRole = 'PLATFORM_ADMIN' | 'BANK_ADMIN' | 'BANK_VIEWER' | 'INVESTOR' | 'AUDITOR';
type KycStatus = 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
type AccreditationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
type InvestorType = 'INDIVIDUAL' | 'INSTITUTIONAL' | 'QUALIFIED_PURCHASER';
type RiskTolerance = 'LOW' | 'MEDIUM' | 'HIGH';
type AssetType = 'REAL_ESTATE' | 'EQUIPMENT' | 'RECEIVABLES' | 'SECURITIES' | 'COMMODITIES' | 'INTELLECTUAL_PROPERTY' | 'OTHER';
type TokenizationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PENDING_TOKENIZATION' | 'TOKENIZED' | 'FAILED';
type ListingStatus = 'UNLISTED' | 'PENDING' | 'LISTED' | 'SOLD_OUT' | 'DELISTED';
type TransactionType = 'PRIMARY_SALE' | 'SECONDARY_SALE' | 'AUCTION_SETTLEMENT' | 'REDEMPTION';
type TransactionStatus = 'PENDING' | 'ESCROW_CREATED' | 'PAYMENT_RECEIVED' | 'TOKENS_TRANSFERRED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
type AuctionStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED';

// Test User Interface
export interface TestUser {
  id: string;
  email: string | null;
  passwordHash: string | null;
  role: UserRole;
  walletAddress: string | null;
  civicPassToken: string | null;
  kycStatus: KycStatus;
  kycVerifiedAt: Date | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  investorProfile?: TestInvestorProfile | null;
}

// Test Investor Profile Interface
export interface TestInvestorProfile {
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

// Test Asset Interface
export interface TestAsset {
  id: string;
  bankId: string;
  name: string;
  description: string | null;
  assetType: AssetType;
  totalValue: number;
  totalSupply: bigint;
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
}

// Test Transaction Interface
export interface TestTransaction {
  id: string;
  assetId: string;
  buyerId: string;
  sellerId: string | null;
  type: TransactionType;
  amount: number;
  tokenAmount: number;
  txSignature: string | null;
  escrowAddress: string | null;
  status: TransactionStatus;
  failureReason: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Test Auction Interface
export interface TestAuction {
  id: string;
  assetId: string;
  reservePrice: number;
  currentBid: number | null;
  currentBidder: string | null;
  tokenAmount: number;
  startTime: Date;
  endTime: Date;
  status: AuctionStatus;
  onChainAddress: string | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Test Bid Interface
export interface TestBid {
  id: string;
  auctionId: string;
  bidder: string;
  amount: number;
  txSignature: string | null;
  isWinning: boolean;
  createdAt: Date;
}

// Test Bank Interface
export interface TestBank {
  id: string;
  name: string;
  code: string;
  walletAddress: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a random Solana wallet address
 */
export function generateWalletAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let address = '';
  for (let i = 0; i < 44; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

/**
 * Generate a random transaction signature
 */
export function generateTxSignature(): string {
  return `tx_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

/**
 * Create a test user
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const now = new Date();
  return {
    id: uuidv4(),
    email: `test-${Date.now()}@example.com`,
    passwordHash: null,
    role: 'INVESTOR',
    walletAddress: generateWalletAddress(),
    civicPassToken: null,
    kycStatus: 'PENDING',
    kycVerifiedAt: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a verified test user
 */
export function createVerifiedTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    kycStatus: 'VERIFIED',
    kycVerifiedAt: new Date(),
    ...overrides,
  });
}

/**
 * Create a test admin user
 */
export function createTestAdminUser(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    role: 'PLATFORM_ADMIN',
    email: `admin-${Date.now()}@example.com`,
    passwordHash: '$2a$10$dummy.hash.for.testing.purposes',
    kycStatus: 'VERIFIED',
    kycVerifiedAt: new Date(),
    ...overrides,
  });
}

/**
 * Create a test investor profile
 */
export function createTestInvestorProfile(
  userId: string,
  overrides: Partial<TestInvestorProfile> = {}
): TestInvestorProfile {
  const now = new Date();
  return {
    id: uuidv4(),
    userId,
    firstName: 'Test',
    lastName: 'Investor',
    country: 'US',
    accreditationStatus: 'NONE',
    accreditedAt: null,
    investorType: 'INDIVIDUAL',
    riskTolerance: 'MEDIUM',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test bank
 */
export function createTestBank(overrides: Partial<TestBank> = {}): TestBank {
  const now = new Date();
  return {
    id: uuidv4(),
    name: `Test Bank ${Date.now()}`,
    code: `TB${Date.now().toString().slice(-4)}`,
    walletAddress: generateWalletAddress(),
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test asset
 */
export function createTestAsset(
  bankId: string,
  overrides: Partial<TestAsset> = {}
): TestAsset {
  const now = new Date();
  const totalValue = 1000000;
  const totalSupply = 10000n;
  return {
    id: uuidv4(),
    bankId,
    name: `Test Asset ${Date.now()}`,
    description: 'A test asset for unit testing',
    assetType: 'REAL_ESTATE',
    totalValue,
    totalSupply,
    pricePerToken: totalValue / Number(totalSupply),
    mintAddress: null,
    metadataUri: null,
    securitizeTokenId: null,
    tokenizationStatus: 'DRAFT',
    listingStatus: 'UNLISTED',
    tokenizedAt: null,
    listedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a tokenized test asset
 */
export function createTokenizedTestAsset(
  bankId: string,
  overrides: Partial<TestAsset> = {}
): TestAsset {
  return createTestAsset(bankId, {
    tokenizationStatus: 'TOKENIZED',
    listingStatus: 'LISTED',
    mintAddress: generateWalletAddress(),
    securitizeTokenId: `sec_${uuidv4().slice(0, 8)}`,
    tokenizedAt: new Date(),
    listedAt: new Date(),
    ...overrides,
  });
}

/**
 * Create a test transaction
 */
export function createTestTransaction(
  assetId: string,
  buyerId: string,
  overrides: Partial<TestTransaction> = {}
): TestTransaction {
  const now = new Date();
  return {
    id: uuidv4(),
    assetId,
    buyerId,
    sellerId: null,
    type: 'PRIMARY_SALE',
    amount: 10000,
    tokenAmount: 100,
    txSignature: null,
    escrowAddress: null,
    status: 'PENDING',
    failureReason: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a completed test transaction
 */
export function createCompletedTestTransaction(
  assetId: string,
  buyerId: string,
  overrides: Partial<TestTransaction> = {}
): TestTransaction {
  return createTestTransaction(assetId, buyerId, {
    status: 'COMPLETED',
    txSignature: generateTxSignature(),
    escrowAddress: generateWalletAddress(),
    completedAt: new Date(),
    ...overrides,
  });
}

/**
 * Create a test auction
 */
export function createTestAuction(
  assetId: string,
  overrides: Partial<TestAuction> = {}
): TestAuction {
  const now = new Date();
  const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours after start
  
  return {
    id: uuidv4(),
    assetId,
    reservePrice: 50000,
    currentBid: null,
    currentBidder: null,
    tokenAmount: 100,
    startTime,
    endTime,
    status: 'SCHEDULED',
    onChainAddress: generateWalletAddress(),
    settledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create an active test auction
 */
export function createActiveTestAuction(
  assetId: string,
  overrides: Partial<TestAuction> = {}
): TestAuction {
  const now = new Date();
  const startTime = new Date(now.getTime() - 60 * 60 * 1000); // Started 1 hour ago
  const endTime = new Date(now.getTime() + 23 * 60 * 60 * 1000); // Ends in 23 hours
  
  return createTestAuction(assetId, {
    startTime,
    endTime,
    status: 'ACTIVE',
    ...overrides,
  });
}

/**
 * Create a test bid
 */
export function createTestBid(
  auctionId: string,
  bidder: string,
  amount: number,
  overrides: Partial<TestBid> = {}
): TestBid {
  return {
    id: uuidv4(),
    auctionId,
    bidder,
    amount,
    txSignature: generateTxSignature(),
    isWinning: false,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Generate a JWT token payload
 */
export function createTokenPayload(user: TestUser) {
  return {
    userId: user.id,
    walletAddress: user.walletAddress || '',
    role: user.role,
    kycStatus: user.kycStatus,
  };
}

/**
 * Generate a mock nonce for wallet authentication
 */
export function generateNonce(walletAddress: string): string {
  return `Sign this message to authenticate with RWA Platform.\n\nNonce: ${uuidv4()}\nTimestamp: ${Date.now()}\nWallet: ${walletAddress}`;
}

/**
 * Sleep utility for async tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create pagination response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page = 1,
  limit = 20
) {
  return {
    data,
    total: data.length,
    page,
    limit,
    totalPages: Math.ceil(data.length / limit),
  };
}