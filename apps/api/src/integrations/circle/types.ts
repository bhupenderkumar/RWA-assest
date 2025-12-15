/**
 * Circle USDC Integration - Type Definitions
 * 
 * Types for Circle USDC operations on Solana
 */

/**
 * USDC transfer status
 */
export enum TransferStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

/**
 * USDC transfer record
 */
export interface USDCTransfer {
  /** Transfer ID */
  id: string;
  /** Source wallet address */
  from: string;
  /** Destination wallet address */
  to: string;
  /** Amount in USDC (6 decimals) */
  amount: string;
  /** Amount in lamports (raw) */
  amountRaw: string;
  /** Transaction signature */
  transactionSignature?: string;
  /** Transfer status */
  status: TransferStatus;
  /** Memo if attached */
  memo?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Confirmed timestamp */
  confirmedAt?: Date;
}

/**
 * USDC balance
 */
export interface USDCBalance {
  /** Wallet address */
  wallet: string;
  /** Balance in USDC */
  balance: string;
  /** Balance in raw units (lamports) */
  balanceRaw: string;
  /** Token account address */
  tokenAccount: string;
}

/**
 * Token account info
 */
export interface TokenAccountInfo {
  /** Account public key */
  address: string;
  /** Owner public key */
  owner: string;
  /** Mint address */
  mint: string;
  /** Balance */
  amount: string;
  /** Decimals */
  decimals: number;
  /** Is account frozen */
  isFrozen: boolean;
  /** Is native SOL wrapped */
  isNative: boolean;
}

/**
 * Transfer request parameters
 */
export interface TransferRequest {
  /** Source wallet address */
  from: string;
  /** Destination wallet address */
  to: string;
  /** Amount in USDC (will be converted to raw) */
  amount: number;
  /** Optional memo */
  memo?: string;
  /** Reference for tracking */
  reference?: string;
}

/**
 * Batch transfer item
 */
export interface BatchTransferItem {
  /** Destination wallet */
  to: string;
  /** Amount in USDC */
  amount: number;
  /** Optional memo */
  memo?: string;
}

/**
 * Batch transfer result
 */
export interface BatchTransferResult {
  /** Total transfers attempted */
  total: number;
  /** Successful transfers */
  successful: number;
  /** Failed transfers */
  failed: number;
  /** Transfer details */
  transfers: Array<{
    to: string;
    amount: number;
    status: 'success' | 'failed';
    transactionSignature?: string;
    error?: string;
  }>;
}

/**
 * USDC mint addresses by network
 */
export const USDC_MINT = {
  MAINNET: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  DEVNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  TESTNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
} as const;

/**
 * USDC decimals
 */
export const USDC_DECIMALS = 6;

/**
 * Transaction fee estimate
 */
export interface TransactionFeeEstimate {
  /** Base fee in SOL */
  baseFee: number;
  /** Priority fee in SOL */
  priorityFee: number;
  /** Total fee in SOL */
  totalFee: number;
  /** Estimated confirmation time in seconds */
  estimatedTime: number;
}

/**
 * Error codes
 */
export enum USDCErrorCode {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  TOKEN_ACCOUNT_NOT_FOUND = 'TOKEN_ACCOUNT_NOT_FOUND',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  ACCOUNT_FROZEN = 'ACCOUNT_FROZEN',
  RATE_LIMITED = 'RATE_LIMITED',
}

/**
 * Custom error for USDC operations
 */
export class USDCError extends Error {
  constructor(
    message: string,
    public readonly code: USDCErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'USDCError';
  }
}
