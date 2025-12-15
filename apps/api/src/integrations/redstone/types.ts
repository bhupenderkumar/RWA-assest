/**
 * RedStone Oracle Integration - Type Definitions
 * 
 * Types for RedStone price oracle data
 */

/**
 * Price data point
 */
export interface PriceData {
  /** Asset symbol */
  symbol: string;
  /** Price value */
  value: number;
  /** Timestamp of the price */
  timestamp: number;
  /** Data source */
  source: string;
  /** Number of sources aggregated */
  sourceCount?: number;
}

/**
 * Detailed price with metadata
 */
export interface DetailedPrice {
  /** Asset symbol */
  symbol: string;
  /** Current price */
  price: number;
  /** 24h price change percentage */
  change24h?: number;
  /** 24h high */
  high24h?: number;
  /** 24h low */
  low24h?: number;
  /** Last update timestamp */
  updatedAt: Date;
  /** Data service ID */
  dataServiceId: string;
  /** Signature for on-chain verification */
  signature?: string;
}

/**
 * Historical price point
 */
export interface HistoricalPrice {
  /** Timestamp */
  timestamp: number;
  /** Price at timestamp */
  price: number;
  /** Open price (for candle data) */
  open?: number;
  /** High price */
  high?: number;
  /** Low price */
  low?: number;
  /** Close price */
  close?: number;
  /** Volume */
  volume?: number;
}

/**
 * Price feed configuration
 */
export interface PriceFeed {
  /** Feed ID */
  id: string;
  /** Asset symbol */
  symbol: string;
  /** Quote currency */
  quoteCurrency: string;
  /** Decimals for price */
  decimals: number;
  /** Heartbeat (max seconds between updates) */
  heartbeat: number;
  /** Deviation threshold (percentage) */
  deviationThreshold: number;
  /** Is feed active */
  isActive: boolean;
}

/**
 * Signed price package for on-chain use
 */
export interface SignedPricePackage {
  /** Price data */
  prices: Array<{
    symbol: string;
    value: number;
  }>;
  /** Timestamp */
  timestamp: number;
  /** Signer address */
  signer: string;
  /** Signature bytes */
  signature: string;
  /** Lite signature bytes (for gas optimization) */
  liteSignature?: string;
}

/**
 * Asset valuation result
 */
export interface AssetValuation {
  /** Asset identifier */
  assetId: string;
  /** Asset type */
  assetType: string;
  /** Base value (in asset's native denomination) */
  baseValue: number;
  /** USD value */
  usdValue: number;
  /** Valuation method used */
  valuationMethod: ValuationMethod;
  /** Price data used */
  priceData: PriceData[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Timestamp */
  valuedAt: Date;
}

/**
 * Valuation method
 */
export enum ValuationMethod {
  /** Direct market price */
  MARKET_PRICE = 'MARKET_PRICE',
  /** Time-weighted average price */
  TWAP = 'TWAP',
  /** Volume-weighted average price */
  VWAP = 'VWAP',
  /** Net asset value */
  NAV = 'NAV',
  /** Appraised value */
  APPRAISAL = 'APPRAISAL',
  /** Book value */
  BOOK_VALUE = 'BOOK_VALUE',
}

/**
 * Time interval for historical data
 */
export enum TimeInterval {
  MINUTE_1 = '1m',
  MINUTE_5 = '5m',
  MINUTE_15 = '15m',
  HOUR_1 = '1h',
  HOUR_4 = '4h',
  DAY_1 = '1d',
  WEEK_1 = '1w',
  MONTH_1 = '1M',
}

/**
 * Supported data services
 */
export enum DataServiceId {
  /** Main production feed */
  PRIMARY = 'redstone-primary-prod',
  /** Demo/test feed */
  DEMO = 'redstone-primary-demo',
  /** Rapid updates feed */
  RAPID = 'redstone-rapid-demo',
  /** Custom/enterprise feed */
  CUSTOM = 'redstone-custom',
}

/**
 * API error
 */
export class RedStoneError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RedStoneError';
  }
}

/**
 * Supported RWA asset types for valuation
 */
export enum RWAAssetType {
  REAL_ESTATE = 'REAL_ESTATE',
  COMMERCIAL_LOAN = 'COMMERCIAL_LOAN',
  EQUIPMENT = 'EQUIPMENT',
  INVOICE = 'INVOICE',
  TREASURY = 'TREASURY',
  COMMODITY = 'COMMODITY',
}

/**
 * RWA-specific price feed mapping
 */
export interface RWAPriceFeedMapping {
  /** RWA asset type */
  assetType: RWAAssetType;
  /** Primary price feed symbol */
  primaryFeed: string;
  /** Secondary/backup feeds */
  backupFeeds?: string[];
  /** Custom valuation logic */
  valuationMethod: ValuationMethod;
}
