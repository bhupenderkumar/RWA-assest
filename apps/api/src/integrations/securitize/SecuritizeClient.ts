/**
 * Securitize Integration - API Client
 * 
 * HTTP client for Securitize API communication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import {
  SecuritizeInvestor,
  TokenOffering,
  Investment,
  TransferRequest,
  PaginationParams,
  PaginatedResponse,
  SecuritizeError,
} from './types';

/**
 * SecuritizeClient handles all API communication with Securitize
 */
export class SecuritizeClient {
  private client: AxiosInstance;
  private issuerId: string;

  constructor() {
    this.issuerId = config.securitize.issuerId;

    this.client = axios.create({
      baseURL: config.securitize.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.securitize.apiKey,
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (requestConfig) => {
        logger.debug('Securitize API request', {
          method: requestConfig.method,
          url: requestConfig.url,
        });
        return requestConfig;
      },
      (error) => {
        logger.error('Securitize API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const statusCode = error.response?.status || 500;
        const errorData = error.response?.data as Record<string, unknown>;
        
        logger.error('Securitize API error', {
          status: statusCode,
          data: errorData,
          url: error.config?.url,
        });

        throw new SecuritizeError(
          errorData?.message as string || error.message,
          errorData?.code as string || 'API_ERROR',
          statusCode,
          errorData
        );
      }
    );
  }

  // ============================================
  // Investor Management
  // ============================================

  /**
   * Create a new investor
   */
  async createInvestor(data: {
    email: string;
    firstName: string;
    lastName: string;
    country: string;
    state?: string;
    walletAddress?: string;
  }): Promise<SecuritizeInvestor> {
    const response = await this.client.post<SecuritizeInvestor>(
      `/issuers/${this.issuerId}/investors`,
      data
    );
    return response.data;
  }

  /**
   * Get investor by ID
   */
  async getInvestor(investorId: string): Promise<SecuritizeInvestor> {
    const response = await this.client.get<SecuritizeInvestor>(
      `/issuers/${this.issuerId}/investors/${investorId}`
    );
    return response.data;
  }

  /**
   * Get investor by email
   */
  async getInvestorByEmail(email: string): Promise<SecuritizeInvestor | null> {
    try {
      const response = await this.client.get<SecuritizeInvestor>(
        `/issuers/${this.issuerId}/investors`,
        { params: { email } }
      );
      return response.data;
    } catch (error) {
      if ((error as SecuritizeError).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get investor by wallet address
   */
  async getInvestorByWallet(walletAddress: string): Promise<SecuritizeInvestor | null> {
    try {
      const response = await this.client.get<SecuritizeInvestor>(
        `/issuers/${this.issuerId}/investors`,
        { params: { walletAddress } }
      );
      return response.data;
    } catch (error) {
      if ((error as SecuritizeError).statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all investors
   */
  async listInvestors(
    params?: PaginationParams
  ): Promise<PaginatedResponse<SecuritizeInvestor>> {
    const response = await this.client.get<PaginatedResponse<SecuritizeInvestor>>(
      `/issuers/${this.issuerId}/investors`,
      { params }
    );
    return response.data;
  }

  /**
   * Update investor profile
   */
  async updateInvestor(
    investorId: string,
    data: Partial<SecuritizeInvestor>
  ): Promise<SecuritizeInvestor> {
    const response = await this.client.patch<SecuritizeInvestor>(
      `/issuers/${this.issuerId}/investors/${investorId}`,
      data
    );
    return response.data;
  }

  /**
   * Link wallet address to investor
   */
  async linkWallet(investorId: string, walletAddress: string): Promise<void> {
    await this.client.post(
      `/issuers/${this.issuerId}/investors/${investorId}/wallets`,
      { walletAddress, blockchain: 'SOLANA' }
    );
  }

  /**
   * Unlink wallet address from investor
   */
  async unlinkWallet(investorId: string, walletAddress: string): Promise<void> {
    await this.client.delete(
      `/issuers/${this.issuerId}/investors/${investorId}/wallets/${walletAddress}`
    );
  }

  // ============================================
  // Token Offerings
  // ============================================

  /**
   * Create a new token offering
   */
  async createOffering(data: Omit<TokenOffering, 'id' | 'issuerId'>): Promise<TokenOffering> {
    const response = await this.client.post<TokenOffering>(
      `/issuers/${this.issuerId}/offerings`,
      data
    );
    return response.data;
  }

  /**
   * Get offering by ID
   */
  async getOffering(offeringId: string): Promise<TokenOffering> {
    const response = await this.client.get<TokenOffering>(
      `/issuers/${this.issuerId}/offerings/${offeringId}`
    );
    return response.data;
  }

  /**
   * List all offerings
   */
  async listOfferings(
    params?: PaginationParams & { status?: string }
  ): Promise<PaginatedResponse<TokenOffering>> {
    const response = await this.client.get<PaginatedResponse<TokenOffering>>(
      `/issuers/${this.issuerId}/offerings`,
      { params }
    );
    return response.data;
  }

  /**
   * Update offering
   */
  async updateOffering(
    offeringId: string,
    data: Partial<TokenOffering>
  ): Promise<TokenOffering> {
    const response = await this.client.patch<TokenOffering>(
      `/issuers/${this.issuerId}/offerings/${offeringId}`,
      data
    );
    return response.data;
  }

  /**
   * Set offering contract address after deployment
   */
  async setOfferingContract(
    offeringId: string,
    contractAddress: string
  ): Promise<TokenOffering> {
    const response = await this.client.patch<TokenOffering>(
      `/issuers/${this.issuerId}/offerings/${offeringId}`,
      { contractAddress }
    );
    return response.data;
  }

  // ============================================
  // Investments
  // ============================================

  /**
   * Create investment subscription
   */
  async createInvestment(data: {
    investorId: string;
    offeringId: string;
    tokenAmount: number;
    paymentMethod: string;
  }): Promise<Investment> {
    const response = await this.client.post<Investment>(
      `/issuers/${this.issuerId}/investments`,
      data
    );
    return response.data;
  }

  /**
   * Get investment by ID
   */
  async getInvestment(investmentId: string): Promise<Investment> {
    const response = await this.client.get<Investment>(
      `/issuers/${this.issuerId}/investments/${investmentId}`
    );
    return response.data;
  }

  /**
   * List investments for an offering
   */
  async listInvestmentsByOffering(
    offeringId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Investment>> {
    const response = await this.client.get<PaginatedResponse<Investment>>(
      `/issuers/${this.issuerId}/offerings/${offeringId}/investments`,
      { params }
    );
    return response.data;
  }

  /**
   * List investments for an investor
   */
  async listInvestmentsByInvestor(
    investorId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Investment>> {
    const response = await this.client.get<PaginatedResponse<Investment>>(
      `/issuers/${this.issuerId}/investors/${investorId}/investments`,
      { params }
    );
    return response.data;
  }

  /**
   * Confirm payment received for investment
   */
  async confirmPayment(investmentId: string, transactionHash?: string): Promise<Investment> {
    const response = await this.client.post<Investment>(
      `/issuers/${this.issuerId}/investments/${investmentId}/confirm-payment`,
      { transactionHash }
    );
    return response.data;
  }

  /**
   * Settle investment (issue tokens)
   */
  async settleInvestment(
    investmentId: string,
    transactionHash: string
  ): Promise<Investment> {
    const response = await this.client.post<Investment>(
      `/issuers/${this.issuerId}/investments/${investmentId}/settle`,
      { transactionHash }
    );
    return response.data;
  }

  /**
   * Cancel investment
   */
  async cancelInvestment(investmentId: string, reason: string): Promise<Investment> {
    const response = await this.client.post<Investment>(
      `/issuers/${this.issuerId}/investments/${investmentId}/cancel`,
      { reason }
    );
    return response.data;
  }

  // ============================================
  // Transfers (Secondary Trading)
  // ============================================

  /**
   * Request transfer approval
   */
  async requestTransfer(data: {
    offeringId: string;
    fromInvestorId: string;
    toInvestorId: string;
    amount: number;
  }): Promise<TransferRequest> {
    const response = await this.client.post<TransferRequest>(
      `/issuers/${this.issuerId}/transfers`,
      data
    );
    return response.data;
  }

  /**
   * Get transfer request by ID
   */
  async getTransfer(transferId: string): Promise<TransferRequest> {
    const response = await this.client.get<TransferRequest>(
      `/issuers/${this.issuerId}/transfers/${transferId}`
    );
    return response.data;
  }

  /**
   * Complete transfer after on-chain execution
   */
  async completeTransfer(
    transferId: string,
    transactionHash: string
  ): Promise<TransferRequest> {
    const response = await this.client.post<TransferRequest>(
      `/issuers/${this.issuerId}/transfers/${transferId}/complete`,
      { transactionHash }
    );
    return response.data;
  }

  // ============================================
  // Compliance
  // ============================================

  /**
   * Check if transfer is compliant
   */
  async checkTransferCompliance(data: {
    offeringId: string;
    fromWallet: string;
    toWallet: string;
    amount: number;
  }): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const response = await this.client.post<{ allowed: boolean; reason?: string }>(
      `/issuers/${this.issuerId}/compliance/check-transfer`,
      data
    );
    return response.data;
  }

  /**
   * Get cap table for an offering
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
    const response = await this.client.get(
      `/issuers/${this.issuerId}/offerings/${offeringId}/cap-table`
    );
    return response.data;
  }
}

// Export singleton instance
export const securitizeClient = new SecuritizeClient();
