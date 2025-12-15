/**
 * Anchorage Digital Integration - API Client
 * 
 * HTTP client for Anchorage Digital API communication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import {
  Vault,
  CustodyWallet,
  AssetBalance,
  CustodyTransaction,
  TransactionStatus,
  PolicyRule,
  StakingPosition,
  PaginationParams,
  PaginatedResponse,
  AnchorageError,
} from './types';

/**
 * AnchorageClient handles all API communication with Anchorage Digital
 */
export class AnchorageClient {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = config.anchorage.apiKey;
    this.apiSecret = config.anchorage.apiSecret;

    this.client = axios.create({
      baseURL: config.anchorage.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (requestConfig) => {
        const timestamp = Date.now().toString();
        const signature = this.generateSignature(
          requestConfig.method?.toUpperCase() || 'GET',
          requestConfig.url || '',
          timestamp,
          requestConfig.data ? JSON.stringify(requestConfig.data) : ''
        );

        requestConfig.headers['X-API-Key'] = this.apiKey;
        requestConfig.headers['X-Timestamp'] = timestamp;
        requestConfig.headers['X-Signature'] = signature;

        logger.debug('Anchorage API request', {
          method: requestConfig.method,
          url: requestConfig.url,
        });

        return requestConfig;
      },
      (error) => {
        logger.error('Anchorage API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const statusCode = error.response?.status || 500;
        const errorData = error.response?.data as Record<string, unknown>;

        logger.error('Anchorage API error', {
          status: statusCode,
          data: errorData,
          url: error.config?.url,
        });

        throw new AnchorageError(
          errorData?.message as string || error.message,
          errorData?.code as string || 'API_ERROR',
          statusCode,
          errorData
        );
      }
    );
  }

  /**
   * Generate HMAC signature for request authentication
   */
  private generateSignature(
    method: string,
    path: string,
    timestamp: string,
    body: string
  ): string {
    const message = `${method}\n${path}\n${timestamp}\n${body}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  // ============================================
  // Vault Management
  // ============================================

  /**
   * List all vaults
   */
  async listVaults(): Promise<Vault[]> {
    const response = await this.client.get<{ vaults: Vault[] }>('/vaults');
    return response.data.vaults;
  }

  /**
   * Get vault by ID
   */
  async getVault(vaultId: string): Promise<Vault> {
    const response = await this.client.get<Vault>(`/vaults/${vaultId}`);
    return response.data;
  }

  /**
   * Get configured vault ID
   */
  getConfiguredVaultId(): string {
    return config.anchorage.vaultId;
  }

  // ============================================
  // Wallet Management
  // ============================================

  /**
   * List wallets in a vault
   */
  async listWallets(vaultId: string): Promise<CustodyWallet[]> {
    const response = await this.client.get<{ wallets: CustodyWallet[] }>(
      `/vaults/${vaultId}/wallets`
    );
    return response.data.wallets;
  }

  /**
   * Get wallet by ID
   */
  async getWallet(vaultId: string, walletId: string): Promise<CustodyWallet> {
    const response = await this.client.get<CustodyWallet>(
      `/vaults/${vaultId}/wallets/${walletId}`
    );
    return response.data;
  }

  /**
   * Create a new wallet in vault
   */
  async createWallet(
    vaultId: string,
    data: {
      name: string;
      network: 'SOLANA' | 'ETHEREUM' | 'BITCOIN';
    }
  ): Promise<CustodyWallet> {
    const response = await this.client.post<CustodyWallet>(
      `/vaults/${vaultId}/wallets`,
      data
    );
    return response.data;
  }

  /**
   * Get deposit address for wallet
   */
  async getDepositAddress(
    vaultId: string,
    walletId: string,
    asset?: string
  ): Promise<{ address: string; memo?: string }> {
    const response = await this.client.get(
      `/vaults/${vaultId}/wallets/${walletId}/deposit-address`,
      { params: { asset } }
    );
    return response.data;
  }

  // ============================================
  // Balance Operations
  // ============================================

  /**
   * Get balances for a wallet
   */
  async getWalletBalances(
    vaultId: string,
    walletId: string
  ): Promise<AssetBalance[]> {
    const response = await this.client.get<{ balances: AssetBalance[] }>(
      `/vaults/${vaultId}/wallets/${walletId}/balances`
    );
    return response.data.balances;
  }

  /**
   * Get total balances for vault
   */
  async getVaultBalances(vaultId: string): Promise<AssetBalance[]> {
    const response = await this.client.get<{ balances: AssetBalance[] }>(
      `/vaults/${vaultId}/balances`
    );
    return response.data.balances;
  }

  /**
   * Get balance for specific asset
   */
  async getAssetBalance(
    vaultId: string,
    walletId: string,
    asset: string
  ): Promise<AssetBalance> {
    const response = await this.client.get<AssetBalance>(
      `/vaults/${vaultId}/wallets/${walletId}/balances/${asset}`
    );
    return response.data;
  }

  // ============================================
  // Transaction Operations
  // ============================================

  /**
   * Create withdrawal request
   */
  async createWithdrawal(data: {
    vaultId: string;
    walletId: string;
    asset: string;
    amount: string;
    destinationAddress: string;
    memo?: string;
  }): Promise<CustodyTransaction> {
    const response = await this.client.post<CustodyTransaction>(
      `/vaults/${data.vaultId}/transactions`,
      {
        type: 'WITHDRAWAL',
        walletId: data.walletId,
        asset: data.asset,
        amount: data.amount,
        destinationAddress: data.destinationAddress,
        memo: data.memo,
      }
    );
    return response.data;
  }

  /**
   * Create internal transfer
   */
  async createInternalTransfer(data: {
    vaultId: string;
    sourceWalletId: string;
    destinationWalletId: string;
    asset: string;
    amount: string;
    memo?: string;
  }): Promise<CustodyTransaction> {
    const response = await this.client.post<CustodyTransaction>(
      `/vaults/${data.vaultId}/transactions`,
      {
        type: 'INTERNAL_TRANSFER',
        walletId: data.sourceWalletId,
        destinationWalletId: data.destinationWalletId,
        asset: data.asset,
        amount: data.amount,
        memo: data.memo,
      }
    );
    return response.data;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(
    vaultId: string,
    transactionId: string
  ): Promise<CustodyTransaction> {
    const response = await this.client.get<CustodyTransaction>(
      `/vaults/${vaultId}/transactions/${transactionId}`
    );
    return response.data;
  }

  /**
   * List transactions
   */
  async listTransactions(
    vaultId: string,
    params?: PaginationParams & {
      walletId?: string;
      status?: TransactionStatus;
      asset?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginatedResponse<CustodyTransaction>> {
    const response = await this.client.get<PaginatedResponse<CustodyTransaction>>(
      `/vaults/${vaultId}/transactions`,
      { params }
    );
    return response.data;
  }

  /**
   * Cancel pending transaction
   */
  async cancelTransaction(
    vaultId: string,
    transactionId: string,
    reason?: string
  ): Promise<CustodyTransaction> {
    const response = await this.client.post<CustodyTransaction>(
      `/vaults/${vaultId}/transactions/${transactionId}/cancel`,
      { reason }
    );
    return response.data;
  }

  // ============================================
  // Policy Management
  // ============================================

  /**
   * List policy rules
   */
  async listPolicyRules(vaultId: string): Promise<PolicyRule[]> {
    const response = await this.client.get<{ rules: PolicyRule[] }>(
      `/vaults/${vaultId}/policies`
    );
    return response.data.rules;
  }

  /**
   * Add address to whitelist
   */
  async addWhitelistAddress(
    vaultId: string,
    address: string,
    label: string
  ): Promise<void> {
    await this.client.post(`/vaults/${vaultId}/whitelist`, {
      address,
      label,
    });
  }

  /**
   * Remove address from whitelist
   */
  async removeWhitelistAddress(vaultId: string, address: string): Promise<void> {
    await this.client.delete(`/vaults/${vaultId}/whitelist/${address}`);
  }

  // ============================================
  // Staking Operations
  // ============================================

  /**
   * Get staking positions
   */
  async getStakingPositions(
    vaultId: string,
    walletId: string
  ): Promise<StakingPosition[]> {
    const response = await this.client.get<{ positions: StakingPosition[] }>(
      `/vaults/${vaultId}/wallets/${walletId}/staking`
    );
    return response.data.positions;
  }

  /**
   * Create stake
   */
  async createStake(data: {
    vaultId: string;
    walletId: string;
    validatorAddress: string;
    amount: string;
  }): Promise<CustodyTransaction> {
    const response = await this.client.post<CustodyTransaction>(
      `/vaults/${data.vaultId}/wallets/${data.walletId}/staking`,
      {
        validatorAddress: data.validatorAddress,
        amount: data.amount,
      }
    );
    return response.data;
  }

  /**
   * Unstake
   */
  async unstake(
    vaultId: string,
    walletId: string,
    positionId: string
  ): Promise<CustodyTransaction> {
    const response = await this.client.post<CustodyTransaction>(
      `/vaults/${vaultId}/wallets/${walletId}/staking/${positionId}/unstake`,
      {}
    );
    return response.data;
  }
}

// Export singleton instance
export const anchorageClient = new AnchorageClient();
