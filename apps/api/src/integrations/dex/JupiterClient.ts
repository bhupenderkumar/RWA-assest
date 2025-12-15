/**
 * Jupiter DEX Integration - Client
 * 
 * Client for Jupiter aggregator API
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import {
  SwapQuote,
  SwapRequest,
  SwapTransaction,
  TokenInfo,
  TokenPrice,
  JUPITER_API,
  DEFAULT_SWAP_SETTINGS,
  JupiterError,
  JupiterErrorCode,
} from './types';

/**
 * JupiterClient handles all API communication with Jupiter
 */
export class JupiterClient {
  private quoteClient: AxiosInstance;
  private priceClient: AxiosInstance;
  private tokenClient: AxiosInstance;

  constructor() {
    this.quoteClient = axios.create({
      baseURL: JUPITER_API.V6,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    this.priceClient = axios.create({
      baseURL: JUPITER_API.PRICE,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    this.tokenClient = axios.create({
      baseURL: JUPITER_API.TOKENS,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    // Add response interceptors for error handling
    [this.quoteClient, this.priceClient].forEach((client) => {
      client.interceptors.response.use(
        (response) => response,
        (error) => {
          logger.error('Jupiter API error', {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
          });
          throw error;
        }
      );
    });
  }

  /**
   * Get swap quote
   */
  async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
    swapMode?: 'ExactIn' | 'ExactOut';
    onlyDirectRoutes?: boolean;
    maxAccounts?: number;
  }): Promise<SwapQuote> {
    try {
      const response = await this.quoteClient.get('/quote', {
        params: {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          slippageBps: params.slippageBps || DEFAULT_SWAP_SETTINGS.slippageBps,
          swapMode: params.swapMode || 'ExactIn',
          onlyDirectRoutes: params.onlyDirectRoutes || false,
          maxAccounts: params.maxAccounts,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        const errorMsg = error.response.data.error;
        
        if (errorMsg.includes('insufficient liquidity')) {
          throw new JupiterError(
            'Insufficient liquidity for this swap',
            JupiterErrorCode.INSUFFICIENT_LIQUIDITY,
            { inputMint: params.inputMint, outputMint: params.outputMint }
          );
        }

        if (errorMsg.includes('route not found')) {
          throw new JupiterError(
            'No route found for this swap',
            JupiterErrorCode.ROUTE_NOT_FOUND,
            { inputMint: params.inputMint, outputMint: params.outputMint }
          );
        }
      }

      throw new JupiterError(
        'Failed to get swap quote',
        JupiterErrorCode.QUOTE_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Get swap transaction
   */
  async getSwapTransaction(
    quote: SwapQuote,
    userPublicKey: string,
    options?: {
      wrapUnwrapSOL?: boolean;
      useSharedAccounts?: boolean;
      feeAccount?: string;
      computeUnitPriceMicroLamports?: number;
      prioritizationFeeLamports?: number | 'auto';
      dynamicComputeUnitLimit?: boolean;
    }
  ): Promise<SwapTransaction> {
    try {
      const response = await this.quoteClient.post('/swap', {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: options?.wrapUnwrapSOL ?? DEFAULT_SWAP_SETTINGS.wrapUnwrapSOL,
        useSharedAccounts: options?.useSharedAccounts ?? DEFAULT_SWAP_SETTINGS.useSharedAccounts,
        feeAccount: options?.feeAccount,
        computeUnitPriceMicroLamports: options?.computeUnitPriceMicroLamports,
        prioritizationFeeLamports: options?.prioritizationFeeLamports,
        dynamicComputeUnitLimit: options?.dynamicComputeUnitLimit ?? true,
      });

      return response.data;
    } catch (error: any) {
      throw new JupiterError(
        'Failed to get swap transaction',
        JupiterErrorCode.TRANSACTION_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Get token price
   */
  async getPrice(tokenMint: string): Promise<TokenPrice | null> {
    try {
      const response = await this.priceClient.get('/price', {
        params: { ids: tokenMint },
      });

      const priceData = response.data.data[tokenMint];
      
      if (!priceData) {
        return null;
      }

      return {
        id: tokenMint,
        price: priceData.price,
        volume24h: priceData.volume24h,
        priceChange24h: priceData.priceChange24h,
      };
    } catch (error) {
      logger.warn('Failed to get token price', { tokenMint, error });
      return null;
    }
  }

  /**
   * Get multiple token prices
   */
  async getPrices(tokenMints: string[]): Promise<Map<string, TokenPrice>> {
    try {
      const response = await this.priceClient.get('/price', {
        params: { ids: tokenMints.join(',') },
      });

      const prices = new Map<string, TokenPrice>();

      for (const mint of tokenMints) {
        const priceData = response.data.data[mint];
        if (priceData) {
          prices.set(mint, {
            id: mint,
            price: priceData.price,
            volume24h: priceData.volume24h,
            priceChange24h: priceData.priceChange24h,
          });
        }
      }

      return prices;
    } catch (error) {
      logger.warn('Failed to get token prices', { error });
      return new Map();
    }
  }

  /**
   * Get token list
   */
  async getTokenList(): Promise<TokenInfo[]> {
    try {
      const response = await this.tokenClient.get('/strict');
      return response.data;
    } catch (error) {
      logger.error('Failed to get token list', { error });
      return [];
    }
  }

  /**
   * Get token info by mint
   */
  async getTokenInfo(mint: string): Promise<TokenInfo | null> {
    try {
      const tokens = await this.getTokenList();
      return tokens.find((t) => t.address === mint) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get indexed route map for supported pairs
   */
  async getRouteMap(): Promise<Map<string, string[]>> {
    try {
      const response = await this.quoteClient.get('/indexed-route-map');
      const routeMap = new Map<string, string[]>();

      const { mintKeys, indexedRouteMap } = response.data;

      for (const [inputIndex, outputs] of Object.entries(indexedRouteMap)) {
        const inputMint = mintKeys[parseInt(inputIndex)];
        const outputMints = (outputs as number[]).map((idx) => mintKeys[idx]);
        routeMap.set(inputMint, outputMints);
      }

      return routeMap;
    } catch (error) {
      logger.error('Failed to get route map', { error });
      return new Map();
    }
  }

  /**
   * Check if a swap route exists
   */
  async hasRoute(inputMint: string, outputMint: string): Promise<boolean> {
    try {
      await this.getQuote({
        inputMint,
        outputMint,
        amount: '1000000', // 1 USDC as test amount
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get best quote from multiple amounts
   */
  async getBestQuote(
    inputMint: string,
    outputMint: string,
    amounts: string[]
  ): Promise<{ amount: string; quote: SwapQuote } | null> {
    let bestQuote: { amount: string; quote: SwapQuote } | null = null;
    let bestOutput = BigInt(0);

    for (const amount of amounts) {
      try {
        const quote = await this.getQuote({ inputMint, outputMint, amount });
        const output = BigInt(quote.outAmount);

        if (output > bestOutput) {
          bestOutput = output;
          bestQuote = { amount, quote };
        }
      } catch (error) {
        // Skip failed quotes
      }
    }

    return bestQuote;
  }
}

// Export singleton instance
export const jupiterClient = new JupiterClient();
