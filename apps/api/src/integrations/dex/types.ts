/**
 * Jupiter DEX Integration - Type Definitions
 * 
 * Types for Jupiter aggregator swap operations on Solana
 */

/**
 * Token information
 */
export interface TokenInfo {
  /** Token mint address */
  address: string;
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Decimal places */
  decimals: number;
  /** Logo URI */
  logoURI?: string;
  /** Tags (e.g., 'stablecoin', 'verified') */
  tags?: string[];
}

/**
 * Quote response from Jupiter
 */
export interface SwapQuote {
  /** Input token mint */
  inputMint: string;
  /** Output token mint */
  outputMint: string;
  /** Input amount (raw) */
  inAmount: string;
  /** Output amount (raw) */
  outAmount: string;
  /** Other output amount considering fees */
  otherAmountThreshold: string;
  /** Swap mode (ExactIn or ExactOut) */
  swapMode: 'ExactIn' | 'ExactOut';
  /** Slippage in basis points */
  slippageBps: number;
  /** Price impact percentage */
  priceImpactPct: string;
  /** Route plan */
  routePlan: RoutePlan[];
  /** Context slot */
  contextSlot?: number;
  /** Time taken for quote */
  timeTaken?: number;
}

/**
 * Route plan step
 */
export interface RoutePlan {
  /** Swap info for this step */
  swapInfo: SwapInfo;
  /** Percentage of input for this route */
  percent: number;
}

/**
 * Swap info for a single hop
 */
export interface SwapInfo {
  /** AMM key/identifier */
  ammKey: string;
  /** AMM label (e.g., 'Raydium', 'Orca') */
  label: string;
  /** Input mint */
  inputMint: string;
  /** Output mint */
  outputMint: string;
  /** Input amount */
  inAmount: string;
  /** Output amount */
  outAmount: string;
  /** Fee amount */
  feeAmount: string;
  /** Fee mint */
  feeMint: string;
}

/**
 * Swap request parameters
 */
export interface SwapRequest {
  /** Input token mint address */
  inputMint: string;
  /** Output token mint address */
  outputMint: string;
  /** Amount (in raw units) */
  amount: string;
  /** Slippage tolerance in basis points (100 = 1%) */
  slippageBps?: number;
  /** Swap mode */
  swapMode?: 'ExactIn' | 'ExactOut';
  /** User's wallet address */
  userPublicKey: string;
  /** Wrap/unwrap SOL automatically */
  wrapUnwrapSOL?: boolean;
  /** Use shared accounts for better pricing */
  useSharedAccounts?: boolean;
  /** Fee account for referral fees */
  feeAccount?: string;
  /** Compute unit price for priority */
  computeUnitPriceMicroLamports?: number;
  /** Platform fee in basis points */
  platformFeeBps?: number;
}

/**
 * Swap transaction response
 */
export interface SwapTransaction {
  /** Serialized transaction (base64) */
  swapTransaction: string;
  /** Last valid block height */
  lastValidBlockHeight: number;
  /** Priority fee to use */
  prioritizationFeeLamports?: number;
  /** Compute unit limit */
  computeUnitLimit?: number;
  /** Error if swap not possible */
  error?: string;
}

/**
 * Swap execution result
 */
export interface SwapResult {
  /** Transaction signature */
  signature: string;
  /** Input amount (formatted) */
  inputAmount: string;
  /** Output amount (formatted) */
  outputAmount: string;
  /** Input token */
  inputToken: TokenInfo;
  /** Output token */
  outputToken: TokenInfo;
  /** Actual price impact */
  priceImpact: number;
  /** Fees paid */
  fees: SwapFees;
  /** Confirmation status */
  confirmed: boolean;
  /** Block slot */
  slot?: number;
}

/**
 * Swap fees breakdown
 */
export interface SwapFees {
  /** Total fee in USD */
  totalFeeUSD: number;
  /** Platform fee */
  platformFee: number;
  /** Network fee (SOL) */
  networkFee: number;
  /** LP fees */
  lpFees: number;
}

/**
 * Price information
 */
export interface TokenPrice {
  /** Token mint address */
  id: string;
  /** Price in USD */
  price: number;
  /** 24h volume */
  volume24h?: number;
  /** 24h price change */
  priceChange24h?: number;
}

/**
 * Swap statistics
 */
export interface SwapStats {
  /** Total swaps executed */
  totalSwaps: number;
  /** Total volume in USD */
  totalVolumeUSD: number;
  /** Average slippage */
  averageSlippage: number;
  /** Most traded pairs */
  topPairs: Array<{
    inputMint: string;
    outputMint: string;
    volume: number;
  }>;
}

/**
 * Jupiter API endpoints
 */
export const JUPITER_API = {
  V6: 'https://quote-api.jup.ag/v6',
  PRICE: 'https://price.jup.ag/v4',
  TOKENS: 'https://token.jup.ag',
} as const;

/**
 * Default swap settings
 */
export const DEFAULT_SWAP_SETTINGS = {
  slippageBps: 50, // 0.5%
  computeUnitPriceMicroLamports: 1000,
  wrapUnwrapSOL: true,
  useSharedAccounts: true,
} as const;

/**
 * Common token addresses on Solana
 */
export const COMMON_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  SRM: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
} as const;

/**
 * Error codes
 */
export enum JupiterErrorCode {
  QUOTE_FAILED = 'QUOTE_FAILED',
  INSUFFICIENT_LIQUIDITY = 'INSUFFICIENT_LIQUIDITY',
  SLIPPAGE_EXCEEDED = 'SLIPPAGE_EXCEEDED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
}

/**
 * Custom error for Jupiter operations
 */
export class JupiterError extends Error {
  constructor(
    message: string,
    public readonly code: JupiterErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'JupiterError';
  }
}
