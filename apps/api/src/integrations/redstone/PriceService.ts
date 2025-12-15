/**
 * RedStone Oracle Integration - Price Service
 * 
 * High-level service for price operations and RWA valuations
 */

import { logger } from '../../utils/logger';
import { redStoneClient } from './RedStoneClient';
import {
  PriceData,
  DetailedPrice,
  AssetValuation,
  ValuationMethod,
  RWAAssetType,
  RWAPriceFeedMapping,
  TimeInterval,
  RedStoneError,
} from './types';

/**
 * Common crypto symbols
 */
export const CRYPTO_SYMBOLS = {
  SOL: 'SOL',
  USDC: 'USDC',
  USDT: 'USDT',
  BTC: 'BTC',
  ETH: 'ETH',
} as const;

/**
 * Stablecoin symbols for USD valuation
 */
const STABLECOINS = ['USDC', 'USDT', 'DAI', 'BUSD'];

/**
 * RWA asset type to price feed mappings
 */
const RWA_FEED_MAPPINGS: Record<RWAAssetType, RWAPriceFeedMapping> = {
  [RWAAssetType.REAL_ESTATE]: {
    assetType: RWAAssetType.REAL_ESTATE,
    primaryFeed: 'USDC', // Real estate valued in USD
    valuationMethod: ValuationMethod.APPRAISAL,
  },
  [RWAAssetType.COMMERCIAL_LOAN]: {
    assetType: RWAAssetType.COMMERCIAL_LOAN,
    primaryFeed: 'USDC',
    valuationMethod: ValuationMethod.BOOK_VALUE,
  },
  [RWAAssetType.EQUIPMENT]: {
    assetType: RWAAssetType.EQUIPMENT,
    primaryFeed: 'USDC',
    valuationMethod: ValuationMethod.BOOK_VALUE,
  },
  [RWAAssetType.INVOICE]: {
    assetType: RWAAssetType.INVOICE,
    primaryFeed: 'USDC',
    valuationMethod: ValuationMethod.BOOK_VALUE,
  },
  [RWAAssetType.TREASURY]: {
    assetType: RWAAssetType.TREASURY,
    primaryFeed: 'USDC',
    valuationMethod: ValuationMethod.NAV,
  },
  [RWAAssetType.COMMODITY]: {
    assetType: RWAAssetType.COMMODITY,
    primaryFeed: 'XAU', // Gold as example
    backupFeeds: ['USDC'],
    valuationMethod: ValuationMethod.MARKET_PRICE,
  },
};

/**
 * Price cache entry
 */
interface CacheEntry {
  data: PriceData;
  expiresAt: number;
}

/**
 * PriceService provides high-level price operations
 */
export class PriceService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  /**
   * Get current SOL price
   */
  async getSOLPrice(): Promise<number> {
    const price = await this.getCachedPrice(CRYPTO_SYMBOLS.SOL);
    return price.value;
  }

  /**
   * Get price with caching
   */
  async getCachedPrice(symbol: string): Promise<PriceData> {
    const cached = this.cache.get(symbol);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const price = await redStoneClient.getPrice(symbol);
    
    this.cache.set(symbol, {
      data: price,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return price;
  }

  /**
   * Get prices for multiple symbols
   */
  async getMultiplePrices(symbols: string[]): Promise<Map<string, PriceData>> {
    // Check cache first
    const cached = new Map<string, PriceData>();
    const uncached: string[] = [];

    for (const symbol of symbols) {
      const entry = this.cache.get(symbol);
      if (entry && entry.expiresAt > Date.now()) {
        cached.set(symbol, entry.data);
      } else {
        uncached.push(symbol);
      }
    }

    // Fetch uncached prices
    if (uncached.length > 0) {
      const freshPrices = await redStoneClient.getPrices(uncached);
      
      for (const [symbol, price] of freshPrices) {
        this.cache.set(symbol, {
          data: price,
          expiresAt: Date.now() + this.CACHE_TTL_MS,
        });
        cached.set(symbol, price);
      }
    }

    return cached;
  }

  /**
   * Convert amount from one asset to USD
   */
  async convertToUSD(amount: number, symbol: string): Promise<number> {
    // Stablecoins are 1:1 with USD
    if (STABLECOINS.includes(symbol)) {
      return amount;
    }

    const price = await this.getCachedPrice(symbol);
    return amount * price.value;
  }

  /**
   * Convert amount from USD to another asset
   */
  async convertFromUSD(usdAmount: number, targetSymbol: string): Promise<number> {
    if (STABLECOINS.includes(targetSymbol)) {
      return usdAmount;
    }

    const price = await this.getCachedPrice(targetSymbol);
    return usdAmount / price.value;
  }

  /**
   * Get detailed price information
   */
  async getDetailedPrice(symbol: string): Promise<DetailedPrice> {
    return redStoneClient.getDetailedPrice(symbol);
  }

  /**
   * Calculate RWA asset valuation
   */
  async calculateRWAValuation(
    assetId: string,
    assetType: RWAAssetType,
    baseValue: number,
    currency: string = 'USD'
  ): Promise<AssetValuation> {
    logger.info('Calculating RWA valuation', { assetId, assetType, baseValue });

    const mapping = RWA_FEED_MAPPINGS[assetType];
    const priceData: PriceData[] = [];

    // Get relevant price data
    try {
      const primaryPrice = await this.getCachedPrice(mapping.primaryFeed);
      priceData.push(primaryPrice);

      if (mapping.backupFeeds) {
        for (const feed of mapping.backupFeeds) {
          try {
            const backupPrice = await this.getCachedPrice(feed);
            priceData.push(backupPrice);
          } catch (error) {
            // Backup feed failure is not critical
            logger.warn('Backup price feed failed', { feed, error });
          }
        }
      }
    } catch (error) {
      logger.error('Primary price feed failed', { 
        feed: mapping.primaryFeed, 
        error 
      });
    }

    // Calculate USD value based on valuation method
    let usdValue = baseValue;
    let confidence = 1.0;

    if (currency !== 'USD') {
      // Convert from other currency to USD
      const currencyPrice = await this.getCachedPrice(currency);
      usdValue = baseValue * currencyPrice.value;
      confidence = 0.95; // Slightly lower confidence for converted values
    }

    // Apply valuation method adjustments
    switch (mapping.valuationMethod) {
      case ValuationMethod.MARKET_PRICE:
        // Use latest market price
        confidence = priceData.length > 0 ? 0.98 : 0.5;
        break;
      case ValuationMethod.TWAP:
        // Time-weighted average would be calculated separately
        confidence = 0.95;
        break;
      case ValuationMethod.APPRAISAL:
        // Appraisal-based values have lower confidence
        confidence = 0.85;
        break;
      case ValuationMethod.BOOK_VALUE:
        confidence = 0.90;
        break;
      case ValuationMethod.NAV:
        confidence = 0.92;
        break;
    }

    return {
      assetId,
      assetType,
      baseValue,
      usdValue,
      valuationMethod: mapping.valuationMethod,
      priceData,
      confidence,
      valuedAt: new Date(),
    };
  }

  /**
   * Get portfolio valuation
   */
  async calculatePortfolioValue(
    holdings: Array<{ symbol: string; amount: number }>
  ): Promise<{
    totalValueUSD: number;
    holdings: Array<{
      symbol: string;
      amount: number;
      priceUSD: number;
      valueUSD: number;
    }>;
  }> {
    const symbols = holdings.map((h) => h.symbol);
    const prices = await this.getMultiplePrices(symbols);

    let totalValueUSD = 0;
    const valuedHoldings: Array<{
      symbol: string;
      amount: number;
      priceUSD: number;
      valueUSD: number;
    }> = [];

    for (const holding of holdings) {
      const price = prices.get(holding.symbol);
      const priceUSD = price?.value || 0;
      const valueUSD = holding.amount * priceUSD;

      totalValueUSD += valueUSD;
      valuedHoldings.push({
        symbol: holding.symbol,
        amount: holding.amount,
        priceUSD,
        valueUSD,
      });
    }

    return {
      totalValueUSD,
      holdings: valuedHoldings,
    };
  }

  /**
   * Get TWAP for an asset
   */
  async getTWAP(symbol: string, periodMinutes: number): Promise<number> {
    const result = await redStoneClient.getTWAP(symbol, periodMinutes);
    return result.twap;
  }

  /**
   * Check if price is stale
   */
  isPriceStale(price: PriceData, maxAgeSeconds: number = 60): boolean {
    const ageMs = Date.now() - price.timestamp;
    return ageMs > maxAgeSeconds * 1000;
  }

  /**
   * Get price feed status
   */
  async getPriceFeedStatus(symbol: string): Promise<{
    symbol: string;
    isAvailable: boolean;
    lastUpdate?: Date;
    isStale: boolean;
  }> {
    try {
      const price = await redStoneClient.getPrice(symbol);
      return {
        symbol,
        isAvailable: true,
        lastUpdate: new Date(price.timestamp),
        isStale: this.isPriceStale(price),
      };
    } catch (error) {
      return {
        symbol,
        isAvailable: false,
        isStale: true,
      };
    }
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get signed price for on-chain verification
   */
  async getSignedPrice(symbols: string[]): Promise<{
    prices: Array<{ symbol: string; value: number }>;
    timestamp: number;
    signature: string;
  }> {
    const signedPackage = await redStoneClient.getSignedPricePackage(symbols);
    return {
      prices: signedPackage.prices,
      timestamp: signedPackage.timestamp,
      signature: signedPackage.signature,
    };
  }
}

// Export singleton instance
export const priceService = new PriceService();
