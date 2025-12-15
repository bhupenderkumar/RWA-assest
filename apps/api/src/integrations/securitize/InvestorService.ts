/**
 * Securitize Integration - Investor Service
 * 
 * Service for managing investor profiles and verification
 */

import { securitizeClient } from './SecuritizeClient';
import { logger } from '../../utils/logger';
import {
  SecuritizeInvestor,
  InvestorStatus,
  AccreditationType,
  SecuritizeError,
  PaginationParams,
  PaginatedResponse,
} from './types';

/**
 * Investor registration parameters
 */
export interface RegisterInvestorParams {
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  state?: string;
  walletAddress?: string;
}

/**
 * InvestorService manages investor profiles
 */
export class InvestorService {
  /**
   * Register a new investor
   */
  async registerInvestor(params: RegisterInvestorParams): Promise<SecuritizeInvestor> {
    logger.info('Registering new investor', { email: params.email });

    // Check if investor already exists
    const existing = await securitizeClient.getInvestorByEmail(params.email);
    
    if (existing) {
      logger.info('Investor already exists', { investorId: existing.id });
      
      // If wallet provided and not linked, link it
      if (params.walletAddress && !existing.walletAddresses.includes(params.walletAddress)) {
        await this.linkWallet(existing.id, params.walletAddress);
        return securitizeClient.getInvestor(existing.id);
      }
      
      return existing;
    }

    const investor = await securitizeClient.createInvestor(params);

    logger.info('Investor registered', { investorId: investor.id });
    return investor;
  }

  /**
   * Get investor by ID
   */
  async getInvestor(investorId: string): Promise<SecuritizeInvestor> {
    return securitizeClient.getInvestor(investorId);
  }

  /**
   * Get investor by wallet address
   */
  async getInvestorByWallet(walletAddress: string): Promise<SecuritizeInvestor | null> {
    return securitizeClient.getInvestorByWallet(walletAddress);
  }

  /**
   * Get investor by email
   */
  async getInvestorByEmail(email: string): Promise<SecuritizeInvestor | null> {
    return securitizeClient.getInvestorByEmail(email);
  }

  /**
   * List all investors
   */
  async listInvestors(
    params?: PaginationParams & {
      status?: InvestorStatus;
    }
  ): Promise<PaginatedResponse<SecuritizeInvestor>> {
    return securitizeClient.listInvestors(params);
  }

  /**
   * Link wallet to investor
   */
  async linkWallet(investorId: string, walletAddress: string): Promise<void> {
    logger.info('Linking wallet to investor', { investorId, walletAddress });

    // Check if wallet is already linked to another investor
    const existingInvestor = await securitizeClient.getInvestorByWallet(walletAddress);
    
    if (existingInvestor && existingInvestor.id !== investorId) {
      throw new SecuritizeError(
        'Wallet already linked to another investor',
        'WALLET_ALREADY_LINKED',
        400,
        { existingInvestorId: existingInvestor.id }
      );
    }

    await securitizeClient.linkWallet(investorId, walletAddress);

    logger.info('Wallet linked', { investorId, walletAddress });
  }

  /**
   * Unlink wallet from investor
   */
  async unlinkWallet(investorId: string, walletAddress: string): Promise<void> {
    logger.info('Unlinking wallet from investor', { investorId, walletAddress });

    await securitizeClient.unlinkWallet(investorId, walletAddress);

    logger.info('Wallet unlinked', { investorId, walletAddress });
  }

  /**
   * Check if investor is verified
   */
  async isVerified(investorId: string): Promise<boolean> {
    const investor = await securitizeClient.getInvestor(investorId);
    return investor.status === InvestorStatus.VERIFIED;
  }

  /**
   * Check if investor is accredited
   */
  async isAccredited(investorId: string): Promise<boolean> {
    const investor = await securitizeClient.getInvestor(investorId);
    
    if (investor.status !== InvestorStatus.VERIFIED) {
      return false;
    }

    return investor.accreditationType !== undefined;
  }

  /**
   * Get verification URL for investor
   */
  async getVerificationUrl(investorId: string): Promise<string> {
    // This would typically be provided by Securitize
    return `https://id.securitize.io/verify/${investorId}`;
  }

  /**
   * Update investor profile
   */
  async updateProfile(
    investorId: string,
    data: {
      firstName?: string;
      lastName?: string;
      country?: string;
      state?: string;
    }
  ): Promise<SecuritizeInvestor> {
    logger.info('Updating investor profile', { investorId });

    const investor = await securitizeClient.updateInvestor(investorId, data);

    logger.info('Investor profile updated', { investorId });
    return investor;
  }

  /**
   * Get investor portfolio (all investments)
   */
  async getPortfolio(investorId: string): Promise<{
    totalInvested: number;
    holdings: Array<{
      offeringId: string;
      symbol: string;
      name: string;
      tokenAmount: number;
      currentValue: number;
      purchaseValue: number;
    }>;
  }> {
    const investments = await securitizeClient.listInvestmentsByInvestor(investorId, {
      limit: 1000,
    });

    let totalInvested = 0;
    const holdings: Array<{
      offeringId: string;
      symbol: string;
      name: string;
      tokenAmount: number;
      currentValue: number;
      purchaseValue: number;
    }> = [];

    // Group by offering
    const offeringHoldings = new Map<string, {
      tokenAmount: number;
      investmentAmount: number;
    }>();

    for (const inv of investments.data) {
      if (inv.status === 'SETTLED') {
        const existing = offeringHoldings.get(inv.offeringId) || {
          tokenAmount: 0,
          investmentAmount: 0,
        };
        
        existing.tokenAmount += inv.tokenAmount;
        existing.investmentAmount += inv.investmentAmount;
        totalInvested += inv.investmentAmount;
        
        offeringHoldings.set(inv.offeringId, existing);
      }
    }

    // Get offering details for each holding
    for (const [offeringId, holding] of offeringHoldings) {
      const offering = await securitizeClient.getOffering(offeringId);
      
      holdings.push({
        offeringId,
        symbol: offering.symbol,
        name: offering.name,
        tokenAmount: holding.tokenAmount,
        purchaseValue: holding.investmentAmount,
        currentValue: holding.tokenAmount * offering.pricePerToken, // Simplified
      });
    }

    return {
      totalInvested,
      holdings,
    };
  }

  /**
   * Check investor eligibility for offering
   */
  async checkEligibility(
    investorId: string,
    offeringId: string
  ): Promise<{
    eligible: boolean;
    reasons: string[];
  }> {
    const investor = await securitizeClient.getInvestor(investorId);
    const offering = await securitizeClient.getOffering(offeringId);
    const reasons: string[] = [];

    // Check verification status
    if (investor.status !== InvestorStatus.VERIFIED) {
      reasons.push('Investor verification required');
    }

    // Check verification expiration
    if (investor.verificationExpiresAt && new Date(investor.verificationExpiresAt) < new Date()) {
      reasons.push('Investor verification has expired');
    }

    // Check wallet
    if (!investor.walletAddresses.length) {
      reasons.push('No wallet linked to investor profile');
    }

    // Check offering status
    if (offering.status !== 'OPEN') {
      reasons.push('Offering is not open for investment');
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }
}

// Export singleton instance
export const investorService = new InvestorService();
