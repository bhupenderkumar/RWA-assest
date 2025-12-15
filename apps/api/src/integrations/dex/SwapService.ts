/**
 * Jupiter DEX Integration - Swap Service
 * 
 * High-level service for executing swaps on Jupiter
 */

import {
  Connection,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
} from '@solana/web3.js';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { jupiterClient } from './JupiterClient';
import {
  SwapQuote,
  SwapRequest,
  SwapResult,
  SwapFees,
  TokenInfo,
  TokenPrice,
  COMMON_TOKENS,
  DEFAULT_SWAP_SETTINGS,
  JupiterError,
  JupiterErrorCode,
} from './types';

/**
 * Swap execution options
 */
export interface SwapOptions {
  /** Slippage tolerance in basis points */
  slippageBps?: number;
  /** Compute unit price for priority */
  computeUnitPriceMicroLamports?: number;
  /** Auto-prioritize transaction */
  autoPrioritize?: boolean;
  /** Wrap/unwrap SOL automatically */
  wrapUnwrapSOL?: boolean;
  /** Skip confirmation wait */
  skipConfirmation?: boolean;
}

/**
 * SwapService provides high-level swap operations
 */
export class SwapService {
  private connection: Connection;
  private tokenCache: Map<string, TokenInfo> = new Map();

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment as 'confirmed' | 'finalized',
    });
  }

  /**
   * Get a swap quote
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    inputDecimals: number = 6
  ): Promise<SwapQuote & { priceImpactWarning?: string }> {
    const amountRaw = Math.floor(amount * Math.pow(10, inputDecimals)).toString();

    const quote = await jupiterClient.getQuote({
      inputMint,
      outputMint,
      amount: amountRaw,
      slippageBps: DEFAULT_SWAP_SETTINGS.slippageBps,
    });

    // Add price impact warning if significant
    const priceImpact = parseFloat(quote.priceImpactPct);
    let priceImpactWarning: string | undefined;

    if (priceImpact > 5) {
      priceImpactWarning = 'High price impact! Consider reducing trade size.';
    } else if (priceImpact > 1) {
      priceImpactWarning = 'Moderate price impact.';
    }

    return {
      ...quote,
      priceImpactWarning,
    };
  }

  /**
   * Execute a swap
   */
  async executeSwap(
    request: SwapRequest,
    signer: Keypair,
    options: SwapOptions = {}
  ): Promise<SwapResult> {
    logger.info('Executing swap', {
      inputMint: request.inputMint,
      outputMint: request.outputMint,
      amount: request.amount,
    });

    // Get quote
    const quote = await jupiterClient.getQuote({
      inputMint: request.inputMint,
      outputMint: request.outputMint,
      amount: request.amount,
      slippageBps: options.slippageBps || request.slippageBps,
      swapMode: request.swapMode,
    });

    // Check price impact
    const priceImpact = parseFloat(quote.priceImpactPct);
    if (priceImpact > 10) {
      throw new JupiterError(
        `Price impact too high: ${priceImpact.toFixed(2)}%`,
        JupiterErrorCode.SLIPPAGE_EXCEEDED,
        { priceImpact }
      );
    }

    // Get swap transaction
    const swapTx = await jupiterClient.getSwapTransaction(
      quote,
      request.userPublicKey,
      {
        wrapUnwrapSOL: options.wrapUnwrapSOL ?? request.wrapUnwrapSOL,
        useSharedAccounts: request.useSharedAccounts,
        computeUnitPriceMicroLamports: options.computeUnitPriceMicroLamports,
        prioritizationFeeLamports: options.autoPrioritize ? 'auto' : undefined,
      }
    );

    if (swapTx.error) {
      throw new JupiterError(
        swapTx.error,
        JupiterErrorCode.TRANSACTION_FAILED
      );
    }

    // Deserialize and sign transaction
    const transactionBuf = Buffer.from(swapTx.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuf);
    transaction.sign([signer]);

    // Send transaction
    const signature = await this.connection.sendTransaction(transaction, {
      maxRetries: 3,
      skipPreflight: false,
    });

    logger.info('Swap transaction sent', { signature });

    // Wait for confirmation if not skipped
    let confirmed = false;
    let slot: number | undefined;

    if (!options.skipConfirmation) {
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash: transaction.message.recentBlockhash,
          lastValidBlockHeight: swapTx.lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new JupiterError(
          'Transaction failed on-chain',
          JupiterErrorCode.TRANSACTION_FAILED,
          { signature, error: confirmation.value.err }
        );
      }

      confirmed = true;
      slot = confirmation.context.slot;
    }

    // Get token info for result
    const [inputToken, outputToken] = await Promise.all([
      this.getTokenInfo(request.inputMint),
      this.getTokenInfo(request.outputMint),
    ]);

    // Format amounts
    const inputAmount = this.formatAmount(
      BigInt(quote.inAmount),
      inputToken?.decimals || 6
    );
    const outputAmount = this.formatAmount(
      BigInt(quote.outAmount),
      outputToken?.decimals || 6
    );

    // Calculate fees
    const fees = await this.calculateFees(quote);

    logger.info('Swap completed', {
      signature,
      inputAmount,
      outputAmount,
      priceImpact,
    });

    return {
      signature,
      inputAmount,
      outputAmount,
      inputToken: inputToken || { address: request.inputMint, symbol: 'UNKNOWN', name: 'Unknown', decimals: 6 },
      outputToken: outputToken || { address: request.outputMint, symbol: 'UNKNOWN', name: 'Unknown', decimals: 6 },
      priceImpact,
      fees,
      confirmed,
      slot,
    };
  }

  /**
   * Swap SOL to USDC
   */
  async swapSOLToUSDC(
    solAmount: number,
    userPublicKey: string,
    signer: Keypair,
    options?: SwapOptions
  ): Promise<SwapResult> {
    const amountLamports = Math.floor(solAmount * 1e9).toString();

    return this.executeSwap(
      {
        inputMint: COMMON_TOKENS.SOL,
        outputMint: COMMON_TOKENS.USDC,
        amount: amountLamports,
        userPublicKey,
        wrapUnwrapSOL: true,
      },
      signer,
      options
    );
  }

  /**
   * Swap USDC to SOL
   */
  async swapUSDCToSOL(
    usdcAmount: number,
    userPublicKey: string,
    signer: Keypair,
    options?: SwapOptions
  ): Promise<SwapResult> {
    const amountRaw = Math.floor(usdcAmount * 1e6).toString();

    return this.executeSwap(
      {
        inputMint: COMMON_TOKENS.USDC,
        outputMint: COMMON_TOKENS.SOL,
        amount: amountRaw,
        userPublicKey,
        wrapUnwrapSOL: true,
      },
      signer,
      options
    );
  }

  /**
   * Get best swap path between tokens
   */
  async findBestPath(
    inputMint: string,
    outputMint: string,
    amount: string
  ): Promise<{
    quote: SwapQuote;
    route: string[];
    estimatedOutput: string;
    priceImpact: number;
  }> {
    const quote = await jupiterClient.getQuote({
      inputMint,
      outputMint,
      amount,
    });

    // Extract route path from route plan
    const route: string[] = [inputMint];
    for (const step of quote.routePlan) {
      if (!route.includes(step.swapInfo.outputMint)) {
        route.push(step.swapInfo.outputMint);
      }
    }

    const outputToken = await this.getTokenInfo(outputMint);
    const estimatedOutput = this.formatAmount(
      BigInt(quote.outAmount),
      outputToken?.decimals || 6
    );

    return {
      quote,
      route,
      estimatedOutput,
      priceImpact: parseFloat(quote.priceImpactPct),
    };
  }

  /**
   * Get token price in USD
   */
  async getTokenPriceUSD(mint: string): Promise<number> {
    const price = await jupiterClient.getPrice(mint);
    return price?.price || 0;
  }

  /**
   * Get multiple token prices
   */
  async getTokenPricesUSD(mints: string[]): Promise<Map<string, number>> {
    const prices = await jupiterClient.getPrices(mints);
    const result = new Map<string, number>();
    
    for (const [mint, price] of prices) {
      result.set(mint, price.price);
    }
    
    return result;
  }

  /**
   * Calculate USD value of token amount
   */
  async calculateUSDValue(
    mint: string,
    amount: number
  ): Promise<number> {
    const price = await this.getTokenPriceUSD(mint);
    return amount * price;
  }

  /**
   * Get token info with caching
   */
  async getTokenInfo(mint: string): Promise<TokenInfo | null> {
    // Check cache
    if (this.tokenCache.has(mint)) {
      return this.tokenCache.get(mint)!;
    }

    const info = await jupiterClient.getTokenInfo(mint);
    
    if (info) {
      this.tokenCache.set(mint, info);
    }
    
    return info;
  }

  /**
   * Calculate swap fees
   */
  private async calculateFees(quote: SwapQuote): Promise<SwapFees> {
    let lpFees = 0;

    // Sum up LP fees from route
    for (const step of quote.routePlan) {
      lpFees += parseFloat(step.swapInfo.feeAmount) / Math.pow(10, 6); // Approximate
    }

    // Estimate network fee (priority + base)
    const networkFee = 0.000005 + (DEFAULT_SWAP_SETTINGS.computeUnitPriceMicroLamports * 200000) / 1e9;

    // Calculate total in USD
    const solPrice = await this.getTokenPriceUSD(COMMON_TOKENS.SOL);
    const totalFeeUSD = networkFee * solPrice + lpFees;

    return {
      totalFeeUSD,
      platformFee: 0, // No platform fee by default
      networkFee,
      lpFees,
    };
  }

  /**
   * Format raw amount to human readable
   */
  private formatAmount(amountRaw: bigint, decimals: number): string {
    const divisor = BigInt(Math.pow(10, decimals));
    const wholePart = amountRaw / divisor;
    const fractionalPart = amountRaw % divisor;
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    // Trim trailing zeros
    const trimmed = fractionalStr.replace(/0+$/, '') || '0';
    
    if (trimmed === '0') {
      return wholePart.toString();
    }
    
    return `${wholePart}.${trimmed}`;
  }

  /**
   * Validate swap is possible
   */
  async validateSwap(
    inputMint: string,
    outputMint: string,
    amount: string
  ): Promise<{
    valid: boolean;
    reason?: string;
    quote?: SwapQuote;
  }> {
    try {
      const quote = await jupiterClient.getQuote({
        inputMint,
        outputMint,
        amount,
      });

      const priceImpact = parseFloat(quote.priceImpactPct);

      if (priceImpact > 10) {
        return {
          valid: false,
          reason: `Price impact too high: ${priceImpact.toFixed(2)}%`,
          quote,
        };
      }

      return { valid: true, quote };
    } catch (error) {
      if (error instanceof JupiterError) {
        return { valid: false, reason: error.message };
      }
      return { valid: false, reason: 'Swap validation failed' };
    }
  }

  /**
   * Clear token info cache
   */
  clearCache(): void {
    this.tokenCache.clear();
  }
}

// Export singleton instance
export const swapService = new SwapService();
