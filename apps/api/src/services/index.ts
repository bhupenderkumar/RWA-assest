/**
 * Services Index
 *
 * Export all services for easy importing
 */

// Auth Service
export { authService, AuthService, AuthError } from './AuthService';
export type { TokenPayload, AuthResult } from './AuthService';

// User Service
export { userService, UserService, UserServiceError } from './UserService';
export type { UserWithProfile, InvestorProfile } from './UserService';

// Asset Service
export { assetService, AssetService, AssetServiceError } from './AssetService';
export type { AssetWithDetails, DocumentInfo } from './AssetService';

// Transaction Service
export { transactionService, TransactionService, TransactionServiceError } from './TransactionService';
export type { TransactionWithDetails } from './TransactionService';

// Auction Service
export { auctionService, AuctionService, AuctionServiceError } from './AuctionService';
export type { AuctionWithDetails, BidInfo } from './AuctionService';