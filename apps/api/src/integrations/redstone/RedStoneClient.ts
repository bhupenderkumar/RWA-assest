/**
 * RedStone Oracle Integration - Client
 * 
 * Client for fetching price data from RedStone oracles
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import {
  PriceData,
  DetailedPrice,
  HistoricalPrice,
  SignedPricePackage,
  TimeInterval,
  DataServiceId,
  RedStoneError,
} from './types';

/**
 * RedStone API endpoints
 */
const REDSTONE_API = {
  GATEWAY: 'https://api.redstone.finance',
  CACHE: 'https://cache-service.redstone.finance',
};

/**
 * RedStoneClient handles all price data fetching
 */
export class RedStoneClient {
  private client: AxiosInstance;
  private dataServiceId: string;

  constructor() {
    this.dataServiceId = config.redstone.dataServiceId || DataServiceId.DEMO;

    this.client = axios.create({
      baseURL: REDSTONE_API.GATEWAY,
      headers: {
        'Content-Type': 'application/json',
        ...(config.redstone.apiKey && { 'X-API-Key': config.redstone.apiKey }),
      },
      timeout: 10000,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('RedStone API error', {
          status: error.response?.status,
          data: error.response?.data,
        });
        throw new RedStoneError(
          error.message,
          'API_ERROR',
          { originalError: error.response?.data }
        );
      }
    );
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<PriceData> {
    const response = await this.client.get('/prices', {
      params: {
        symbol,
        provider: this.dataServiceId,
      },
    });

    const data = response.data[symbol];
    
    if (!data) {
      throw new RedStoneError(
        `Price not found for symbol: ${symbol}`,
        'PRICE_NOT_FOUND',
        { symbol }
      );
    }

    return {
      symbol,
      value: data.value,
      timestamp: data.timestamp,
      source: data.source || this.dataServiceId,
      sourceCount: data.sourceCount,
    };
  }

  /**
   * Get prices for multiple symbols
   */
  async getPrices(symbols: string[]): Promise<Map<string, PriceData>> {
    const response = await this.client.get('/prices', {
      params: {
        symbols: symbols.join(','),
        provider: this.dataServiceId,
      },
    });

    const prices = new Map<string, PriceData>();

    for (const symbol of symbols) {
      const data = response.data[symbol];
      if (data) {
        prices.set(symbol, {
          symbol,
          value: data.value,
          timestamp: data.timestamp,
          source: data.source || this.dataServiceId,
          sourceCount: data.sourceCount,
        });
      }
    }

    return prices;
  }

  /**
   * Get detailed price with 24h stats
   */
  async getDetailedPrice(symbol: string): Promise<DetailedPrice> {
    const [currentPrice, historicalPrices] = await Promise.all([
      this.getPrice(symbol),
      this.getHistoricalPrices(symbol, TimeInterval.HOUR_1, 24),
    ]);

    const prices = historicalPrices.map((p) => p.price);
    const oldestPrice = prices[0];
    const change24h = oldestPrice
      ? ((currentPrice.value - oldestPrice) / oldestPrice) * 100
      : undefined;

    return {
      symbol,
      price: currentPrice.value,
      change24h,
      high24h: Math.max(...prices),
      low24h: Math.min(...prices),
      updatedAt: new Date(currentPrice.timestamp),
      dataServiceId: this.dataServiceId,
    };
  }

  /**
   * Get historical prices
   */
  async getHistoricalPrices(
    symbol: string,
    interval: TimeInterval,
    limit: number = 100
  ): Promise<HistoricalPrice[]> {
    const response = await this.client.get('/historical-prices', {
      params: {
        symbol,
        interval,
        limit,
        provider: this.dataServiceId,
      },
    });

    return response.data.map((point: any) => ({
      timestamp: point.timestamp,
      price: point.value,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    }));
  }

  /**
   * Get signed price package for on-chain verification
   */
  async getSignedPricePackage(
    symbols: string[]
  ): Promise<SignedPricePackage> {
    const response = await this.client.get('/signed-prices', {
      params: {
        symbols: symbols.join(','),
        provider: this.dataServiceId,
      },
    });

    return {
      prices: response.data.prices,
      timestamp: response.data.timestamp,
      signer: response.data.signer,
      signature: response.data.signature,
      liteSignature: response.data.liteSignature,
    };
  }

  /**
   * Get available price feeds
   */
  async getAvailableFeeds(): Promise<string[]> {
    const response = await this.client.get('/available-tokens', {
      params: { provider: this.dataServiceId },
    });
    return response.data;
  }

  /**
   * Check if a symbol is supported
   */
  async isSymbolSupported(symbol: string): Promise<boolean> {
    try {
      const feeds = await this.getAvailableFeeds();
      return feeds.includes(symbol);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get TWAP (Time-Weighted Average Price)
   */
  async getTWAP(
    symbol: string,
    periodMinutes: number
  ): Promise<{ twap: number; period: number; dataPoints: number }> {
    const intervals = Math.ceil(periodMinutes / 5); // 5-minute intervals
    const historicalPrices = await this.getHistoricalPrices(
      symbol,
      TimeInterval.MINUTE_5,
      intervals
    );

    if (historicalPrices.length === 0) {
      throw new RedStoneError(
        'No historical data available for TWAP calculation',
        'INSUFFICIENT_DATA',
        { symbol, periodMinutes }
      );
    }

    const sum = historicalPrices.reduce((acc, p) => acc + p.price, 0);
    const twap = sum / historicalPrices.length;

    return {
      twap,
      period: periodMinutes,
      dataPoints: historicalPrices.length,
    };
  }

  /**
   * Get price at specific timestamp
   */
  async getPriceAt(symbol: string, timestamp: number): Promise<PriceData> {
    const response = await this.client.get('/prices', {
      params: {
        symbol,
        timestamp,
        provider: this.dataServiceId,
      },
    });

    const data = response.data[symbol];
    
    if (!data) {
      throw new RedStoneError(
        `Historical price not found`,
        'PRICE_NOT_FOUND',
        { symbol, timestamp }
      );
    }

    return {
      symbol,
      value: data.value,
      timestamp: data.timestamp,
      source: this.dataServiceId,
    };
  }

  /**
   * Subscribe to price updates (polling-based)
   */
  subscribeToPriceUpdates(
    symbols: string[],
    callback: (prices: Map<string, PriceData>) => void,
    intervalMs: number = 10000
  ): () => void {
    let isRunning = true;

    const poll = async () => {
      while (isRunning) {
        try {
          const prices = await this.getPrices(symbols);
          callback(prices);
        } catch (error) {
          logger.error('Price polling error', { error, symbols });
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    };

    poll();

    return () => {
      isRunning = false;
    };
  }
}

// Export singleton instance
export const redStoneClient = new RedStoneClient();
