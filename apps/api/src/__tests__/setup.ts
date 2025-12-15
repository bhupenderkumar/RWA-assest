/**
 * Jest Test Setup
 *
 * Provides mocks for Prisma, Redis, and external services
 */

import { jest, beforeEach, afterAll } from '@jest/globals';

// Type for mock functions
type MockFn = jest.Mock<(...args: unknown[]) => unknown>;

// Mock Prisma Client
export const mockPrismaUser = {
  findUnique: jest.fn() as MockFn,
  findFirst: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
  count: jest.fn() as MockFn,
};

export const mockPrismaInvestorProfile = {
  findUnique: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  upsert: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
};

export const mockPrismaAsset = {
  findUnique: jest.fn() as MockFn,
  findFirst: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
  count: jest.fn() as MockFn,
};

export const mockPrismaDocument = {
  findUnique: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
  deleteMany: jest.fn() as MockFn,
};

export const mockPrismaTransaction = {
  findUnique: jest.fn() as MockFn,
  findFirst: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
  count: jest.fn() as MockFn,
  groupBy: jest.fn() as MockFn,
  aggregate: jest.fn() as MockFn,
};

export const mockPrismaPortfolioHolding = {
  findUnique: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  upsert: jest.fn() as MockFn,
  aggregate: jest.fn() as MockFn,
};

export const mockPrismaAuction = {
  findUnique: jest.fn() as MockFn,
  findFirst: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  updateMany: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
  count: jest.fn() as MockFn,
};

export const mockPrismaBid = {
  findUnique: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
  updateMany: jest.fn() as MockFn,
  delete: jest.fn() as MockFn,
  count: jest.fn() as MockFn,
};

export const mockPrismaBank = {
  findUnique: jest.fn() as MockFn,
  findMany: jest.fn() as MockFn,
  create: jest.fn() as MockFn,
  update: jest.fn() as MockFn,
};

export const mockPrisma = {
  user: mockPrismaUser,
  investorProfile: mockPrismaInvestorProfile,
  asset: mockPrismaAsset,
  document: mockPrismaDocument,
  transaction: mockPrismaTransaction,
  portfolioHolding: mockPrismaPortfolioHolding,
  auction: mockPrismaAuction,
  bid: mockPrismaBid,
  bank: mockPrismaBank,
  $transaction: jest.fn((operations: unknown[]) => Promise.all(operations)) as MockFn,
  $connect: jest.fn() as MockFn,
  $disconnect: jest.fn() as MockFn,
};

// Mock Redis functions
export const mockRedis = {
  get: jest.fn() as MockFn,
  set: jest.fn() as MockFn,
  setex: jest.fn() as MockFn,
  del: jest.fn() as MockFn,
  keys: jest.fn() as MockFn,
  expire: jest.fn() as MockFn,
};

export const mockStoreNonce = jest.fn() as MockFn;
export const mockConsumeNonce = jest.fn() as MockFn;
export const mockStoreSession = jest.fn() as MockFn;
export const mockGetSession = jest.fn() as MockFn;
export const mockDeleteSession = jest.fn() as MockFn;
export const mockDeleteUserSessions = jest.fn() as MockFn;
export const mockStoreRefreshToken = jest.fn() as MockFn;
export const mockGetRefreshToken = jest.fn() as MockFn;
export const mockDeleteRefreshToken = jest.fn() as MockFn;

// Mock Civic Service
export const mockCivicService = {
  verifyWallet: jest.fn() as MockFn,
  requestVerification: jest.fn() as MockFn,
  getGatekeeperNetwork: jest.fn() as MockFn,
};

// Mock Tokenization Service
export const mockTokenizationService = {
  createOffering: jest.fn() as MockFn,
  deployToken: jest.fn() as MockFn,
  getOffering: jest.fn() as MockFn,
};

// Mock Logger
export const mockLogger = {
  info: jest.fn() as MockFn,
  warn: jest.fn() as MockFn,
  error: jest.fn() as MockFn,
  debug: jest.fn() as MockFn,
};

// Mock Config
export const mockConfig = {
  nodeEnv: 'test',
  port: 3000,
  apiUrl: 'http://localhost:3000',
  databaseUrl: 'postgresql://test:test@localhost:5432/test',
  redisUrl: 'redis://localhost:6379',
  jwt: {
    secret: 'test-jwt-secret-key-for-testing-purposes',
    expiresIn: '1h',
    refreshExpiresIn: '7d',
  },
  solana: {
    rpcUrl: 'https://api.devnet.solana.com',
    commitment: 'confirmed',
    network: 'devnet',
  },
  civic: {
    gatekeeperNetworkAddress: 'test-gatekeeper-network',
  },
  securitize: {
    apiKey: 'test-securitize-api-key',
    baseUrl: 'https://api.securitize.io',
  },
};

// Setup module mocks
jest.mock('../lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

jest.mock('../lib/redis', () => ({
  redis: mockRedis,
  storeNonce: mockStoreNonce,
  consumeNonce: mockConsumeNonce,
  storeSession: mockStoreSession,
  getSession: mockGetSession,
  deleteSession: mockDeleteSession,
  deleteUserSessions: mockDeleteUserSessions,
  storeRefreshToken: mockStoreRefreshToken,
  getRefreshToken: mockGetRefreshToken,
  deleteRefreshToken: mockDeleteRefreshToken,
  default: mockRedis,
}));

jest.mock('../integrations/civic/CivicService', () => ({
  civicService: mockCivicService,
  CivicService: jest.fn().mockImplementation(() => mockCivicService),
}));

jest.mock('../integrations/securitize/TokenizationService', () => ({
  tokenizationService: mockTokenizationService,
  TokenizationService: jest.fn().mockImplementation(() => mockTokenizationService),
}));

jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../config', () => ({
  config: mockConfig,
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});

// Export types for testing
export type MockPrismaClient = typeof mockPrisma;
export type MockRedisClient = typeof mockRedis;