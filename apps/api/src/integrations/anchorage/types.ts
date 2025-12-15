/**
 * Anchorage Digital Integration - Type Definitions
 * 
 * Types for Anchorage institutional custody platform
 */

/**
 * Vault types
 */
export enum VaultType {
  HOT = 'HOT',
  WARM = 'WARM',
  COLD = 'COLD',
  TRADING = 'TRADING',
}

/**
 * Vault information
 */
export interface Vault {
  /** Vault ID */
  id: string;
  /** Vault name */
  name: string;
  /** Vault type */
  type: VaultType;
  /** Organization ID */
  organizationId: string;
  /** Whether vault is active */
  isActive: boolean;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Wallet within a vault
 */
export interface CustodyWallet {
  /** Wallet ID */
  id: string;
  /** Vault ID */
  vaultId: string;
  /** Blockchain network */
  network: 'SOLANA' | 'ETHEREUM' | 'BITCOIN';
  /** Wallet address */
  address: string;
  /** Wallet name/label */
  name: string;
  /** Whether wallet is active */
  isActive: boolean;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Asset balance
 */
export interface AssetBalance {
  /** Asset symbol */
  symbol: string;
  /** Asset name */
  name: string;
  /** Token mint address (for Solana) */
  mintAddress?: string;
  /** Balance amount */
  balance: string;
  /** Balance in USD */
  usdValue: number;
  /** Decimal places */
  decimals: number;
}

/**
 * Transaction status
 */
export enum TransactionStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  SIGNED = 'SIGNED',
  BROADCASTING = 'BROADCASTING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

/**
 * Transaction type
 */
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  TOKEN_MINT = 'TOKEN_MINT',
  TOKEN_BURN = 'TOKEN_BURN',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
}

/**
 * Custody transaction
 */
export interface CustodyTransaction {
  /** Transaction ID */
  id: string;
  /** Vault ID */
  vaultId: string;
  /** Wallet ID */
  walletId: string;
  /** Transaction type */
  type: TransactionType;
  /** Transaction status */
  status: TransactionStatus;
  /** Asset symbol */
  asset: string;
  /** Amount */
  amount: string;
  /** Destination address (for withdrawals) */
  destinationAddress?: string;
  /** Source address (for deposits) */
  sourceAddress?: string;
  /** On-chain transaction hash */
  transactionHash?: string;
  /** Fee amount */
  fee?: string;
  /** Memo/note */
  memo?: string;
  /** Approvals received */
  approvals: TransactionApproval[];
  /** Required approvals */
  requiredApprovals: number;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Completed timestamp */
  completedAt?: Date;
}

/**
 * Transaction approval record
 */
export interface TransactionApproval {
  /** Approver ID */
  approverId: string;
  /** Approver email */
  approverEmail: string;
  /** Approval status */
  status: 'APPROVED' | 'REJECTED';
  /** Approval timestamp */
  timestamp: Date;
  /** Comment */
  comment?: string;
}

/**
 * Withdrawal request parameters
 */
export interface WithdrawalRequest {
  /** Vault ID */
  vaultId: string;
  /** Wallet ID (source) */
  walletId: string;
  /** Asset symbol */
  asset: string;
  /** Amount to withdraw */
  amount: string;
  /** Destination address */
  destinationAddress: string;
  /** Memo/note */
  memo?: string;
}

/**
 * Policy rule for transaction approval
 */
export interface PolicyRule {
  /** Rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Transaction types this rule applies to */
  transactionTypes: TransactionType[];
  /** Minimum amount threshold */
  minimumAmount?: string;
  /** Required approvals */
  requiredApprovals: number;
  /** Approved addresses (whitelist) */
  whitelistedAddresses?: string[];
  /** Is rule active */
  isActive: boolean;
}

/**
 * Staking position
 */
export interface StakingPosition {
  /** Position ID */
  id: string;
  /** Validator address */
  validatorAddress: string;
  /** Validator name */
  validatorName: string;
  /** Staked amount */
  stakedAmount: string;
  /** Rewards earned */
  rewardsEarned: string;
  /** Status */
  status: 'ACTIVE' | 'DEACTIVATING' | 'INACTIVE';
  /** Activation epoch */
  activationEpoch?: number;
  /** Deactivation epoch */
  deactivationEpoch?: number;
}

/**
 * Webhook event types
 */
export enum AnchorageWebhookEvent {
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_APPROVED = 'transaction.approved',
  TRANSACTION_REJECTED = 'transaction.rejected',
  TRANSACTION_SIGNED = 'transaction.signed',
  TRANSACTION_CONFIRMED = 'transaction.confirmed',
  TRANSACTION_FAILED = 'transaction.failed',
  DEPOSIT_RECEIVED = 'deposit.received',
  BALANCE_UPDATED = 'balance.updated',
}

/**
 * Webhook payload
 */
export interface AnchorageWebhookPayload {
  event: AnchorageWebhookEvent;
  timestamp: Date;
  data: Record<string, unknown>;
}

/**
 * API error
 */
export class AnchorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AnchorageError';
  }
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    cursor?: string;
    total?: number;
  };
}
