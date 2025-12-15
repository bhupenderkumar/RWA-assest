import { PublicKey, Commitment, clusterApiUrl } from '@solana/web3.js';
import type { Cluster, ProgramIds } from './types';

// =============================================================================
// Program IDs
// =============================================================================

/**
 * Asset Registry Program ID
 * Manages registration and lifecycle of tokenized real-world assets
 */
export const ASSET_REGISTRY_PROGRAM_ID = new PublicKey(
  'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
);

/**
 * Escrow Program ID
 * Manages secure token and payment escrow for asset transactions
 */
export const ESCROW_PROGRAM_ID = new PublicKey(
  'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnT'
);

/**
 * Auction Program ID
 * Enables auction-based sales of tokenized real-world assets
 */
export const AUCTION_PROGRAM_ID = new PublicKey(
  'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnU'
);

/**
 * Compliance Program ID
 * Implements Token-2022 transfer hook for compliance checks
 */
export const COMPLIANCE_PROGRAM_ID = new PublicKey(
  'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnV'
);

/**
 * Get all program IDs
 */
export const PROGRAM_IDS: ProgramIds = {
  assetRegistry: ASSET_REGISTRY_PROGRAM_ID,
  escrow: ESCROW_PROGRAM_ID,
  auction: AUCTION_PROGRAM_ID,
  compliance: COMPLIANCE_PROGRAM_ID,
};

// =============================================================================
// Token Program IDs
// =============================================================================

/**
 * SPL Token 2022 Program ID
 */
export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
);

/**
 * SPL Token Program ID (legacy)
 */
export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

/**
 * Associated Token Account Program ID
 */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);

/**
 * System Program ID
 */
export const SYSTEM_PROGRAM_ID = new PublicKey(
  '11111111111111111111111111111111'
);

/**
 * Rent Sysvar ID
 */
export const RENT_SYSVAR_ID = new PublicKey(
  'SysvarRent111111111111111111111111111111111'
);

// =============================================================================
// Stablecoin Mints
// =============================================================================

/**
 * USDC Mint addresses by network
 */
export const USDC_MINT: Record<Cluster, PublicKey> = {
  'mainnet-beta': new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  testnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
  localnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
};

// =============================================================================
// Network Configuration
// =============================================================================

/**
 * RPC Endpoints for each cluster
 */
export const RPC_ENDPOINTS: Record<Cluster, string> = {
  'mainnet-beta': clusterApiUrl('mainnet-beta'),
  devnet: clusterApiUrl('devnet'),
  testnet: clusterApiUrl('testnet'),
  localnet: 'http://localhost:8899',
};

/**
 * Default commitment level for transactions
 */
export const DEFAULT_COMMITMENT: Commitment = 'confirmed';

/**
 * WebSocket endpoints for each cluster
 */
export const WS_ENDPOINTS: Record<Cluster, string> = {
  'mainnet-beta': 'wss://api.mainnet-beta.solana.com',
  devnet: 'wss://api.devnet.solana.com',
  testnet: 'wss://api.testnet.solana.com',
  localnet: 'ws://localhost:8900',
};

// =============================================================================
// PDA Seeds
// =============================================================================

/**
 * Seeds for deriving PDAs in Asset Registry program
 */
export const ASSET_REGISTRY_SEEDS = {
  CONFIG: Buffer.from('config'),
  ASSET: Buffer.from('asset'),
  MINT_CONFIG: Buffer.from('mint-config'),
  MINT_AUTHORITY: Buffer.from('mint-authority'),
} as const;

/**
 * Seeds for deriving PDAs in Escrow program
 */
export const ESCROW_SEEDS = {
  ESCROW: Buffer.from('escrow'),
} as const;

/**
 * Seeds for deriving PDAs in Auction program
 */
export const AUCTION_SEEDS = {
  AUCTION: Buffer.from('auction'),
  BID: Buffer.from('bid'),
} as const;

/**
 * Seeds for deriving PDAs in Compliance program
 */
export const COMPLIANCE_SEEDS = {
  CONFIG: Buffer.from('compliance-config'),
  WHITELIST: Buffer.from('whitelist'),
  BLACKLIST: Buffer.from('blacklist'),
  JURISDICTION: Buffer.from('jurisdiction'),
} as const;

// =============================================================================
// Account Sizes
// =============================================================================

/**
 * Account sizes for rent calculation
 */
export const ACCOUNT_SIZES = {
  // Asset Registry
  CONFIG: 8 + 32 + 2 + 8 + 1, // discriminator + authority + fee_bps + total_assets + bump
  ASSET: 8 + 32 + 32 + 4 + 64 + 1 + 8 + 8 + 4 + 256 + 1 + 8 + 8 + 1, // ~430 bytes
  MINT_CONFIG: 8 + 32 + 32 + 32 + 33 + 4 + 32 + 4 + 10 + 4 + 200 + 1 + 1 + 8 + 1, // ~400 bytes
  
  // Escrow
  ESCROW: 8 + 32 + 32 + 32 + 32 + 8 + 8 + 1 + 8 + 8 + 1, // ~170 bytes
  
  // Auction
  AUCTION: 8 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 32 + 8 + 8 + 1 + 8 + 8 + 1, // ~210 bytes
  BID: 8 + 32 + 32 + 8 + 8 + 1 + 1, // ~90 bytes
  
  // Compliance
  COMPLIANCE_CONFIG: 8 + 32 + 32 + 8 + 8 + 1 + 8 + 8 + 1, // ~106 bytes
  WHITELIST_ENTRY: 8 + 32 + 1 + 2 + 1 + 8 + 8 + 8 + 1 + 1, // ~70 bytes
  BLACKLIST_ENTRY: 8 + 32 + 4 + 128 + 8 + 32 + 1 + 1, // ~214 bytes
  JURISDICTION_RULE: 8 + 2 + 2 + 1 + 9 + 8 + 1, // ~31 bytes
} as const;

// =============================================================================
// Transaction Limits
// =============================================================================

/**
 * Maximum transaction size in bytes
 */
export const MAX_TRANSACTION_SIZE = 1232;

/**
 * Maximum number of accounts per transaction
 */
export const MAX_ACCOUNTS_PER_TX = 64;

/**
 * Maximum compute units per transaction
 */
export const MAX_COMPUTE_UNITS = 1_400_000;

/**
 * Default compute unit price in micro-lamports
 */
export const DEFAULT_COMPUTE_UNIT_PRICE = 1000;

// =============================================================================
// Time Constants
// =============================================================================

/**
 * Minimum auction duration in seconds (1 hour)
 */
export const MIN_AUCTION_DURATION = 3600;

/**
 * Auction extension threshold in seconds (10 minutes)
 */
export const AUCTION_EXTENSION_THRESHOLD = 600;

/**
 * Default KYC validity period in seconds (1 year)
 */
export const DEFAULT_KYC_VALIDITY = 365 * 24 * 60 * 60;

// =============================================================================
// Validation Constants
// =============================================================================

/**
 * Maximum asset name length
 */
export const MAX_ASSET_NAME_LENGTH = 64;

/**
 * Maximum token symbol length
 */
export const MAX_SYMBOL_LENGTH = 10;

/**
 * Maximum URI length
 */
export const MAX_URI_LENGTH = 256;

/**
 * Maximum blacklist reason length
 */
export const MAX_REASON_LENGTH = 128;

// =============================================================================
// Fee Constants
// =============================================================================

/**
 * Maximum platform fee in basis points (10%)
 */
export const MAX_PLATFORM_FEE_BPS = 1000;

/**
 * Basis points denominator
 */
export const BPS_DENOMINATOR = 10000;