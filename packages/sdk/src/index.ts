/**
 * RWA Platform SDK
 *
 * TypeScript SDK for interacting with the RWA Platform Solana smart contracts.
 * This SDK provides clients for the Asset Registry, Escrow, Auction, and Compliance programs.
 *
 * @packageDocumentation
 */

// =============================================================================
// Clients
// =============================================================================

export { AssetRegistryClient } from './clients/AssetRegistryClient';
export { EscrowClient } from './clients/EscrowClient';
export { AuctionClient } from './clients/AuctionClient';
export { ComplianceClient } from './clients/ComplianceClient';

// =============================================================================
// Types
// =============================================================================

export {
  // Enums
  AssetType,
  AssetStatus,
  EscrowStatus,
  AuctionStatus,
  BidStatus,
  InvestorType,

  // Asset Registry Types
  Config,
  Asset,
  MintConfig,

  // Escrow Types
  Escrow,

  // Auction Types
  Auction,
  Bid,

  // Compliance Types
  ComplianceConfig,
  WhitelistEntry,
  BlacklistEntry,
  JurisdictionRule,

  // Event Types
  AssetRegisteredEvent,
  AssetUpdatedEvent,
  AssetActivatedEvent,
  AssetFrozenEvent,
  AssetBurnedEvent,
  TokenMintCreatedEvent,
  EscrowCreatedEvent,
  PaymentDepositedEvent,
  AssetDepositedEvent,
  EscrowReleasedEvent,
  EscrowRefundedEvent,
  AuctionCreatedEvent,
  BidPlacedEvent,
  BidRefundedEvent,
  AuctionSettledEvent,
  AuctionFailedEvent,
  AddressWhitelistedEvent,
  TransferValidatedEvent,

  // Input Types
  RegisterAssetParams,
  UpdateAssetParams,
  CreateTokenMintParams,
  CreateEscrowParams,
  CreateAuctionParams,
  PlaceBidParams,
  AddToWhitelistParams,
  AddToBlacklistParams,
  AddJurisdictionRuleParams,
  UpdateComplianceConfigParams,

  // Configuration Types
  Cluster,
  SDKConfig,
  ProgramIds,

  // Error Types
  SDKError,
  TransactionError,
  AccountNotFoundError,
  InvalidParameterError,
} from './types';

// =============================================================================
// Constants
// =============================================================================

export {
  // Program IDs
  ASSET_REGISTRY_PROGRAM_ID,
  ESCROW_PROGRAM_ID,
  AUCTION_PROGRAM_ID,
  COMPLIANCE_PROGRAM_ID,
  PROGRAM_IDS,

  // Token Program IDs
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  RENT_SYSVAR_ID,

  // Network Configuration
  RPC_ENDPOINTS,
  WS_ENDPOINTS,
  DEFAULT_COMMITMENT,
  USDC_MINT,

  // PDA Seeds
  ASSET_REGISTRY_SEEDS,
  ESCROW_SEEDS,
  AUCTION_SEEDS,
  COMPLIANCE_SEEDS,

  // Account Sizes
  ACCOUNT_SIZES,

  // Transaction Limits
  MAX_TRANSACTION_SIZE,
  MAX_ACCOUNTS_PER_TX,
  MAX_COMPUTE_UNITS,
  DEFAULT_COMPUTE_UNIT_PRICE,

  // Time Constants
  MIN_AUCTION_DURATION,
  AUCTION_EXTENSION_THRESHOLD,
  DEFAULT_KYC_VALIDITY,

  // Validation Constants
  MAX_ASSET_NAME_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_URI_LENGTH,
  MAX_REASON_LENGTH,

  // Fee Constants
  MAX_PLATFORM_FEE_BPS,
  BPS_DENOMINATOR,
} from './constants';

// =============================================================================
// Utilities
// =============================================================================

// Transaction Utilities
export {
  TransactionBuilder,
  WalletAdapter,
  TransactionBuilderOptions,
  SendTransactionOptions,
  sendAndConfirmTransaction,
  sendWithProvider,
  estimateTransactionFee,
  getOptimalComputeUnits,
  waitForConfirmation,
  batchSendTransactions,
  toBN,
  fromBN,
  formatBN,
} from './utils/transactions';

// Account Utilities
export {
  // PDA Derivation
  deriveAssetRegistryConfig,
  deriveAsset,
  deriveMintConfig,
  deriveMintAuthority,
  deriveEscrow,
  deriveAuction,
  deriveBid,
  deriveComplianceConfig,
  deriveWhitelistEntry,
  deriveBlacklistEntry,
  deriveJurisdictionRule,

  // Deserialization
  deserializeConfig,
  deserializeAsset,
  deserializeMintConfig,
  deserializeEscrow,
  deserializeAuction,
  deserializeBid,
  deserializeComplianceConfig,
  deserializeWhitelistEntry,
  deserializeBlacklistEntry,
  deserializeJurisdictionRule,

  // Account Fetching
  fetchAccount,
  fetchMultipleAccounts,
  getProgramAccounts,
  accountExists,
  getAccountBalance,

  // Filters
  createMemcmpFilter,
  createDataSizeFilter,

  // Jurisdiction Helpers
  jurisdictionToString,
  stringToJurisdiction,
} from './utils/accounts';

// =============================================================================
// Re-exports from dependencies (for convenience)
// =============================================================================

export { PublicKey, Keypair, Connection } from '@solana/web3.js';
export { default as BN } from 'bn.js';