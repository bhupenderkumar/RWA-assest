import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// =============================================================================
// Asset Registry Types
// =============================================================================

/**
 * Type of real-world asset
 */
export enum AssetType {
  RealEstate = 0,
  Equipment = 1,
  Receivables = 2,
  Securities = 3,
  Commodities = 4,
  IntellectualProperty = 5,
  Other = 6,
}

/**
 * Current status of an asset
 */
export enum AssetStatus {
  Pending = 0,
  Active = 1,
  Frozen = 2,
  Burned = 3,
}

/**
 * Asset Registry configuration account
 */
export interface Config {
  /** Program authority */
  authority: PublicKey;
  /** Platform fee in basis points (1 bps = 0.01%) */
  platformFeeBps: number;
  /** Total number of registered assets */
  totalAssets: BN;
  /** PDA bump */
  bump: number;
}

/**
 * Registered asset account
 */
export interface Asset {
  /** Asset authority (bank) */
  authority: PublicKey;
  /** Token mint address */
  mint: PublicKey;
  /** Asset name */
  name: string;
  /** Type of asset */
  assetType: AssetType;
  /** Total value in cents (USD) */
  totalValue: BN;
  /** Total token supply */
  totalSupply: BN;
  /** Metadata URI (IPFS/Arweave) */
  metadataUri: string;
  /** Current status */
  status: AssetStatus;
  /** Creation timestamp */
  createdAt: BN;
  /** Last update timestamp */
  updatedAt: BN;
  /** PDA bump */
  bump: number;
}

/**
 * Token mint configuration account
 */
export interface MintConfig {
  /** Token mint address */
  mint: PublicKey;
  /** Mint authority */
  authority: PublicKey;
  /** Permanent delegate for freeze/seize */
  permanentDelegate: PublicKey;
  /** Transfer hook program ID (optional) */
  transferHookProgram: PublicKey | null;
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Metadata URI */
  uri: string;
  /** Token decimals */
  decimals: number;
  /** Whether the mint is frozen */
  isFrozen: boolean;
  /** Creation timestamp */
  createdAt: BN;
  /** PDA bump */
  bump: number;
}

// =============================================================================
// Escrow Types
// =============================================================================

/**
 * Current status of an escrow
 */
export enum EscrowStatus {
  Created = 0,
  PaymentDeposited = 1,
  FullyFunded = 2,
  Released = 3,
  Refunded = 4,
  Disputed = 5,
}

/**
 * Escrow account for token purchases
 */
export interface Escrow {
  /** Buyer's address */
  buyer: PublicKey;
  /** Seller's address */
  seller: PublicKey;
  /** Asset token mint */
  assetMint: PublicKey;
  /** Payment token mint (USDC) */
  paymentMint: PublicKey;
  /** Amount of asset tokens */
  assetAmount: BN;
  /** Amount of payment tokens */
  paymentAmount: BN;
  /** Current status */
  status: EscrowStatus;
  /** Creation timestamp */
  createdAt: BN;
  /** Expiration timestamp */
  expiresAt: BN;
  /** PDA bump */
  bump: number;
}

// =============================================================================
// Auction Types
// =============================================================================

/**
 * Current status of an auction
 */
export enum AuctionStatus {
  Created = 0,
  Active = 1,
  Settled = 2,
  Cancelled = 3,
  Failed = 4,
}

/**
 * Bid status
 */
export enum BidStatus {
  Active = 0,
  Outbid = 1,
  Won = 2,
  Refunded = 3,
  Cancelled = 4,
}

/**
 * Auction account
 */
export interface Auction {
  /** Seller who created the auction */
  seller: PublicKey;
  /** Asset token mint */
  assetMint: PublicKey;
  /** Payment token mint (e.g., USDC) */
  paymentMint: PublicKey;
  /** Amount of asset tokens being auctioned */
  assetAmount: BN;
  /** Starting price */
  startingPrice: BN;
  /** Reserve price (minimum to sell) */
  reservePrice: BN;
  /** Minimum bid increment */
  minBidIncrement: BN;
  /** Current highest bid */
  currentBid: BN;
  /** Current highest bidder */
  currentBidder: PublicKey;
  /** Auction start time */
  startTime: BN;
  /** Auction end time */
  endTime: BN;
  /** Auction status */
  status: AuctionStatus;
  /** Total number of bids */
  totalBids: BN;
  /** Creation timestamp */
  createdAt: BN;
  /** PDA bump */
  bump: number;
}

/**
 * Bid account
 */
export interface Bid {
  /** Auction this bid is for */
  auction: PublicKey;
  /** Bidder */
  bidder: PublicKey;
  /** Bid amount */
  amount: BN;
  /** Bid timestamp */
  timestamp: BN;
  /** Bid status */
  status: BidStatus;
  /** PDA bump */
  bump: number;
}

// =============================================================================
// Compliance Types
// =============================================================================

/**
 * Type of investor for compliance purposes
 */
export enum InvestorType {
  Retail = 0,
  Accredited = 1,
  Institutional = 2,
  QualifiedPurchaser = 3,
}

/**
 * Compliance configuration account
 */
export interface ComplianceConfig {
  /** Admin authority */
  authority: PublicKey;
  /** Civic gatekeeper network for KYC */
  civicGatekeeperNetwork: PublicKey;
  /** Maximum transfer amount per transaction */
  maxTransferAmount: BN;
  /** Cooldown between transfers (in seconds) */
  transferCooldown: BN;
  /** Whether transfers are paused */
  isPaused: boolean;
  /** Total whitelisted addresses */
  totalWhitelisted: BN;
  /** Total blacklisted addresses */
  totalBlacklisted: BN;
  /** PDA bump */
  bump: number;
}

/**
 * Whitelist entry for an investor
 */
export interface WhitelistEntry {
  /** Investor address */
  investor: PublicKey;
  /** Type of investor */
  investorType: InvestorType;
  /** ISO 3166-1 alpha-2 country code (2 bytes) */
  jurisdiction: Uint8Array;
  /** Whether KYC is verified */
  kycVerified: boolean;
  /** KYC expiration timestamp */
  kycExpiry: BN;
  /** When the address was added */
  addedAt: BN;
  /** Last transfer timestamp */
  lastTransfer: BN;
  /** Whether the entry is active */
  isActive: boolean;
  /** PDA bump */
  bump: number;
}

/**
 * Blacklist entry for an address
 */
export interface BlacklistEntry {
  /** Blacklisted address */
  address: PublicKey;
  /** Reason for blacklisting */
  reason: string;
  /** When the address was added */
  addedAt: BN;
  /** Who added the address */
  addedBy: PublicKey;
  /** Whether the entry is active */
  isActive: boolean;
  /** PDA bump */
  bump: number;
}

/**
 * Jurisdiction rule for cross-border transfers
 */
export interface JurisdictionRule {
  /** Source jurisdiction (ISO 3166-1 alpha-2) */
  fromJurisdiction: Uint8Array;
  /** Destination jurisdiction (ISO 3166-1 alpha-2) */
  toJurisdiction: Uint8Array;
  /** Whether transfers are allowed */
  isAllowed: boolean;
  /** Maximum transfer amount (if any) */
  maxAmount: BN | null;
  /** When the rule was created */
  createdAt: BN;
  /** PDA bump */
  bump: number;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Asset registered event
 */
export interface AssetRegisteredEvent {
  asset: PublicKey;
  mint: PublicKey;
  authority: PublicKey;
  name: string;
  totalValue: BN;
  totalSupply: BN;
}

/**
 * Asset updated event
 */
export interface AssetUpdatedEvent {
  asset: PublicKey;
  updatedAt: BN;
}

/**
 * Asset activated event
 */
export interface AssetActivatedEvent {
  asset: PublicKey;
  activatedAt: BN;
}

/**
 * Asset frozen event
 */
export interface AssetFrozenEvent {
  asset: PublicKey;
  frozenAt: BN;
}

/**
 * Asset burned event
 */
export interface AssetBurnedEvent {
  asset: PublicKey;
  burnedAt: BN;
}

/**
 * Token mint created event
 */
export interface TokenMintCreatedEvent {
  mint: PublicKey;
  authority: PublicKey;
  name: string;
  symbol: string;
  decimals: number;
  transferHookProgram: PublicKey | null;
}

/**
 * Escrow created event
 */
export interface EscrowCreatedEvent {
  escrow: PublicKey;
  buyer: PublicKey;
  seller: PublicKey;
  assetAmount: BN;
  paymentAmount: BN;
  expiresAt: BN;
}

/**
 * Payment deposited event
 */
export interface PaymentDepositedEvent {
  escrow: PublicKey;
  amount: BN;
}

/**
 * Asset deposited event
 */
export interface AssetDepositedEvent {
  escrow: PublicKey;
  amount: BN;
}

/**
 * Escrow released event
 */
export interface EscrowReleasedEvent {
  escrow: PublicKey;
  releasedAt: BN;
}

/**
 * Escrow refunded event
 */
export interface EscrowRefundedEvent {
  escrow: PublicKey;
  refundedAt: BN;
}

/**
 * Auction created event
 */
export interface AuctionCreatedEvent {
  auction: PublicKey;
  seller: PublicKey;
  assetMint: PublicKey;
  assetAmount: BN;
  startingPrice: BN;
  reservePrice: BN;
  startTime: BN;
  endTime: BN;
}

/**
 * Bid placed event
 */
export interface BidPlacedEvent {
  auction: PublicKey;
  bidder: PublicKey;
  amount: BN;
  timestamp: BN;
}

/**
 * Bid refunded event
 */
export interface BidRefundedEvent {
  auction: PublicKey;
  bidder: PublicKey;
  amount: BN;
}

/**
 * Auction settled event
 */
export interface AuctionSettledEvent {
  auction: PublicKey;
  winner: PublicKey;
  winningBid: BN;
  seller: PublicKey;
}

/**
 * Auction failed event
 */
export interface AuctionFailedEvent {
  auction: PublicKey;
  highestBid: BN;
  reservePrice: BN;
}

/**
 * Address whitelisted event
 */
export interface AddressWhitelistedEvent {
  investor: PublicKey;
  investorType: InvestorType;
  jurisdiction: Uint8Array;
  kycExpiry: BN;
}

/**
 * Transfer validated event
 */
export interface TransferValidatedEvent {
  sender: PublicKey;
  receiver: PublicKey;
  amount: BN;
  timestamp: BN;
}

// =============================================================================
// Input Types (for method parameters)
// =============================================================================

/**
 * Parameters for registering a new asset
 */
export interface RegisterAssetParams {
  name: string;
  assetType: AssetType;
  totalValue: BN;
  totalSupply: BN;
  metadataUri: string;
}

/**
 * Parameters for updating an asset
 */
export interface UpdateAssetParams {
  metadataUri?: string;
  totalValue?: BN;
}

/**
 * Parameters for creating a token mint
 */
export interface CreateTokenMintParams {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  transferHookProgram?: PublicKey;
}

/**
 * Parameters for creating an escrow
 */
export interface CreateEscrowParams {
  seller: PublicKey;
  assetMint: PublicKey;
  paymentMint: PublicKey;
  assetAmount: BN;
  paymentAmount: BN;
  expiresAt: BN;
}

/**
 * Parameters for creating an auction
 */
export interface CreateAuctionParams {
  assetMint: PublicKey;
  paymentMint: PublicKey;
  assetAmount: BN;
  startingPrice: BN;
  reservePrice: BN;
  minBidIncrement: BN;
  startTime: BN;
  endTime: BN;
}

/**
 * Parameters for placing a bid
 */
export interface PlaceBidParams {
  auction: PublicKey;
  bidAmount: BN;
}

/**
 * Parameters for adding to whitelist
 */
export interface AddToWhitelistParams {
  investor: PublicKey;
  investorType: InvestorType;
  jurisdiction: string; // 2-letter country code
  kycExpiry: BN;
}

/**
 * Parameters for adding to blacklist
 */
export interface AddToBlacklistParams {
  address: PublicKey;
  reason: string;
}

/**
 * Parameters for adding jurisdiction rule
 */
export interface AddJurisdictionRuleParams {
  fromJurisdiction: string; // 2-letter country code
  toJurisdiction: string; // 2-letter country code
  isAllowed: boolean;
  maxAmount?: BN;
}

/**
 * Parameters for updating compliance config
 */
export interface UpdateComplianceConfigParams {
  maxTransferAmount?: BN;
  transferCooldown?: BN;
  isPaused?: boolean;
}

// =============================================================================
// Network Configuration Types
// =============================================================================

/**
 * Solana network cluster
 */
export type Cluster = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

/**
 * SDK configuration options
 */
export interface SDKConfig {
  /** Solana cluster to connect to */
  cluster: Cluster;
  /** Custom RPC endpoint (optional) */
  rpcEndpoint?: string;
  /** Commitment level */
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Program IDs for the RWA platform
 */
export interface ProgramIds {
  assetRegistry: PublicKey;
  escrow: PublicKey;
  auction: PublicKey;
  compliance: PublicKey;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Base SDK error
 */
export class SDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'SDKError';
  }
}

/**
 * Transaction error
 */
export class TransactionError extends SDKError {
  constructor(
    message: string,
    public signature?: string,
    cause?: unknown
  ) {
    super(message, 'TRANSACTION_ERROR', cause);
    this.name = 'TransactionError';
  }
}

/**
 * Account not found error
 */
export class AccountNotFoundError extends SDKError {
  constructor(
    public accountType: string,
    public address: PublicKey
  ) {
    super(
      `${accountType} account not found at ${address.toBase58()}`,
      'ACCOUNT_NOT_FOUND'
    );
    this.name = 'AccountNotFoundError';
  }
}

/**
 * Invalid parameter error
 */
export class InvalidParameterError extends SDKError {
  constructor(
    public parameter: string,
    message: string
  ) {
    super(message, 'INVALID_PARAMETER');
    this.name = 'InvalidParameterError';
  }
}