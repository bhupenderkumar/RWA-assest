/**
 * Securitize Integration - Tokenization Service
 * 
 * High-level service for tokenization operations
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { securitizeClient } from './SecuritizeClient';
import {
  TokenOffering,
  SecurityType,
  OfferingStatus,
  Investment,
  InvestmentStatus,
  SecuritizeError,
  PaymentMethod,
} from './types';

/**
 * Token creation parameters
 */
export interface CreateTokenParams {
  /** Token symbol (e.g., "PROP-001") */
  symbol: string;
  /** Token name (e.g., "123 Main St Property Token") */
  name: string;
  /** Description */
  description: string;
  /** Security type */
  securityType: SecurityType;
  /** Total supply of tokens */
  totalSupply: number;
  /** Price per token in cents */
  pricePerToken: number;
  /** Currency */
  currency?: string;
  /** Minimum investment */
  minimumInvestment: number;
  /** Maximum investment per investor */
  maximumInvestment?: number;
  /** Offering start date */
  startDate?: Date;
  /** Offering end date */
  endDate?: Date;
  /** Underlying asset metadata */
  underlyingAsset?: {
    type: string;
    value: number;
    location?: string;
    details?: Record<string, unknown>;
  };
  /** Documentation URL */
  documentationUrl?: string;
}

/**
 * Minted token result
 */
export interface MintedToken {
  /** Securitize offering ID */
  offeringId: string;
  /** Solana token mint address */
  mintAddress: string;
  /** Solana transaction signature */
  transactionSignature: string;
  /** Token metadata URI */
  metadataUri?: string;
}

/**
 * TokenizationService orchestrates token creation and issuance
 */
export class TokenizationService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment as 'confirmed' | 'finalized',
    });
  }

  /**
   * Create a new tokenized security offering
   */
  async createOffering(params: CreateTokenParams): Promise<TokenOffering> {
    logger.info('Creating new token offering', { symbol: params.symbol });

    const offering = await securitizeClient.createOffering({
      symbol: params.symbol,
      name: params.name,
      securityType: params.securityType,
      status: OfferingStatus.DRAFT,
      totalSupply: params.totalSupply,
      pricePerToken: params.pricePerToken,
      currency: params.currency || 'USD',
      minimumInvestment: params.minimumInvestment,
      maximumInvestment: params.maximumInvestment,
      startDate: params.startDate || new Date(),
      endDate: params.endDate,
      blockchain: 'SOLANA',
      metadata: {
        description: params.description,
        documentationUrl: params.documentationUrl,
        underlyingAsset: params.underlyingAsset,
      },
    });

    logger.info('Token offering created', { offeringId: offering.id });
    return offering;
  }

  /**
   * Deploy token to Solana blockchain
   * This would integrate with the asset-registry program
   */
  async deployToken(
    offeringId: string,
    authorityKeypair: Keypair
  ): Promise<MintedToken> {
    logger.info('Deploying token to Solana', { offeringId });

    // Get offering details
    const offering = await securitizeClient.getOffering(offeringId);

    if (offering.contractAddress) {
      throw new SecuritizeError(
        'Token already deployed',
        'TOKEN_ALREADY_DEPLOYED',
        400
      );
    }

    // TODO: Integrate with asset-registry Anchor program
    // This would:
    // 1. Create Token-2022 mint with extensions
    // 2. Add transfer hook for compliance
    // 3. Set up metadata
    // 4. Initialize asset in registry

    // Placeholder for actual deployment
    const mintAddress = Keypair.generate().publicKey;
    const transactionSignature = 'simulated_tx_signature';

    // Update Securitize with contract address
    await securitizeClient.setOfferingContract(
      offeringId,
      mintAddress.toBase58()
    );

    logger.info('Token deployed successfully', {
      offeringId,
      mintAddress: mintAddress.toBase58(),
    });

    return {
      offeringId,
      mintAddress: mintAddress.toBase58(),
      transactionSignature,
    };
  }

  /**
   * Open offering for investment
   */
  async openOffering(offeringId: string): Promise<TokenOffering> {
    logger.info('Opening offering for investment', { offeringId });

    const offering = await securitizeClient.getOffering(offeringId);

    if (!offering.contractAddress) {
      throw new SecuritizeError(
        'Token must be deployed before opening offering',
        'TOKEN_NOT_DEPLOYED',
        400
      );
    }

    const updated = await securitizeClient.updateOffering(offeringId, {
      status: OfferingStatus.OPEN,
    });

    logger.info('Offering opened', { offeringId });
    return updated;
  }

  /**
   * Close offering
   */
  async closeOffering(offeringId: string): Promise<TokenOffering> {
    logger.info('Closing offering', { offeringId });

    const updated = await securitizeClient.updateOffering(offeringId, {
      status: OfferingStatus.CLOSED,
    });

    logger.info('Offering closed', { offeringId });
    return updated;
  }

  /**
   * Process investment and issue tokens
   */
  async processInvestment(
    investmentId: string,
    authorityKeypair: Keypair
  ): Promise<{ investment: Investment; transactionSignature: string }> {
    logger.info('Processing investment', { investmentId });

    const investment = await securitizeClient.getInvestment(investmentId);

    if (investment.status !== InvestmentStatus.PAID) {
      throw new SecuritizeError(
        'Investment must be paid before processing',
        'PAYMENT_NOT_CONFIRMED',
        400
      );
    }

    const offering = await securitizeClient.getOffering(investment.offeringId);

    if (!offering.contractAddress) {
      throw new SecuritizeError(
        'Token not deployed',
        'TOKEN_NOT_DEPLOYED',
        400
      );
    }

    // Get investor wallet
    const investor = await securitizeClient.getInvestor(investment.investorId);
    const recipientWallet = investor.walletAddresses[0];

    if (!recipientWallet) {
      throw new SecuritizeError(
        'Investor has no linked wallet',
        'NO_WALLET_LINKED',
        400
      );
    }

    // TODO: Integrate with asset-registry program to mint tokens
    // This would:
    // 1. Mint tokens to investor wallet
    // 2. Handle compliance checks via transfer hook

    const transactionSignature = 'simulated_mint_tx_signature';

    // Update investment as settled
    const settled = await securitizeClient.settleInvestment(
      investmentId,
      transactionSignature
    );

    logger.info('Investment processed', {
      investmentId,
      tokenAmount: investment.tokenAmount,
      recipientWallet,
    });

    return {
      investment: settled,
      transactionSignature,
    };
  }

  /**
   * Calculate available tokens for offering
   */
  async getAvailableTokens(offeringId: string): Promise<{
    total: number;
    sold: number;
    available: number;
    reserved: number;
  }> {
    const offering = await securitizeClient.getOffering(offeringId);
    const investments = await securitizeClient.listInvestmentsByOffering(offeringId, {
      limit: 1000,
    });

    let sold = 0;
    let reserved = 0;

    for (const inv of investments.data) {
      if (inv.status === InvestmentStatus.SETTLED) {
        sold += inv.tokenAmount;
      } else if (
        inv.status === InvestmentStatus.PENDING ||
        inv.status === InvestmentStatus.PAYMENT_PENDING ||
        inv.status === InvestmentStatus.PAID
      ) {
        reserved += inv.tokenAmount;
      }
    }

    return {
      total: offering.totalSupply,
      sold,
      available: offering.totalSupply - sold - reserved,
      reserved,
    };
  }

  /**
   * Get cap table for offering
   */
  async getCapTable(offeringId: string): Promise<{
    totalSupply: number;
    holders: Array<{
      investorId: string;
      walletAddress: string;
      balance: number;
      percentage: number;
    }>;
  }> {
    return securitizeClient.getCapTable(offeringId);
  }

  /**
   * Validate investment parameters
   */
  async validateInvestment(
    offeringId: string,
    investorId: string,
    tokenAmount: number
  ): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    const offering = await securitizeClient.getOffering(offeringId);
    const investor = await securitizeClient.getInvestor(investorId);
    const availability = await this.getAvailableTokens(offeringId);

    // Check offering is open
    if (offering.status !== OfferingStatus.OPEN) {
      errors.push('Offering is not open for investment');
    }

    // Check investor verification
    if (investor.status !== 'VERIFIED') {
      errors.push('Investor is not verified');
    }

    // Check wallet linked
    if (!investor.walletAddresses.length) {
      errors.push('Investor has no linked wallet');
    }

    // Check token availability
    if (tokenAmount > availability.available) {
      errors.push(`Only ${availability.available} tokens available`);
    }

    // Check minimum investment
    const investmentAmount = tokenAmount * offering.pricePerToken;
    if (investmentAmount < offering.minimumInvestment) {
      errors.push(`Minimum investment is ${offering.minimumInvestment / 100} ${offering.currency}`);
    }

    // Check maximum investment
    if (offering.maximumInvestment && investmentAmount > offering.maximumInvestment) {
      errors.push(`Maximum investment is ${offering.maximumInvestment / 100} ${offering.currency}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const tokenizationService = new TokenizationService();
