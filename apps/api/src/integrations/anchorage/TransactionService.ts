/**
 * Anchorage Digital Integration - Transaction Service
 * 
 * Service for managing custody transactions
 */

import { config } from '../../config';
import { logger } from '../../utils/logger';
import { anchorageClient } from './AnchorageClient';
import {
  CustodyTransaction,
  TransactionStatus,
  TransactionType,
  WithdrawalRequest,
  AnchorageError,
  PaginationParams,
  PaginatedResponse,
} from './types';

/**
 * Transaction creation result
 */
export interface TransactionResult {
  transaction: CustodyTransaction;
  requiresApproval: boolean;
  estimatedCompletionTime?: Date;
}

/**
 * TransactionService manages custody transactions
 */
export class TransactionService {
  private vaultId: string;

  constructor() {
    this.vaultId = config.anchorage.vaultId;
  }

  /**
   * Create a withdrawal transaction
   */
  async createWithdrawal(request: WithdrawalRequest): Promise<TransactionResult> {
    logger.info('Creating withdrawal', {
      asset: request.asset,
      amount: request.amount,
      destination: request.destinationAddress,
    });

    // Validate destination address format
    if (!this.isValidAddress(request.destinationAddress)) {
      throw new AnchorageError(
        'Invalid destination address',
        'INVALID_ADDRESS',
        400
      );
    }

    const transaction = await anchorageClient.createWithdrawal({
      vaultId: request.vaultId || this.vaultId,
      walletId: request.walletId,
      asset: request.asset,
      amount: request.amount,
      destinationAddress: request.destinationAddress,
      memo: request.memo,
    });

    const requiresApproval = transaction.status === TransactionStatus.PENDING_APPROVAL;

    logger.info('Withdrawal created', {
      transactionId: transaction.id,
      status: transaction.status,
      requiresApproval,
    });

    return {
      transaction,
      requiresApproval,
      estimatedCompletionTime: this.estimateCompletionTime(transaction),
    };
  }

  /**
   * Create internal transfer between wallets
   */
  async createInternalTransfer(data: {
    sourceWalletId: string;
    destinationWalletId: string;
    asset: string;
    amount: string;
    memo?: string;
  }): Promise<TransactionResult> {
    logger.info('Creating internal transfer', {
      source: data.sourceWalletId,
      destination: data.destinationWalletId,
      asset: data.asset,
      amount: data.amount,
    });

    const transaction = await anchorageClient.createInternalTransfer({
      vaultId: this.vaultId,
      ...data,
    });

    const requiresApproval = transaction.status === TransactionStatus.PENDING_APPROVAL;

    logger.info('Internal transfer created', {
      transactionId: transaction.id,
      status: transaction.status,
    });

    return {
      transaction,
      requiresApproval,
      estimatedCompletionTime: this.estimateCompletionTime(transaction),
    };
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<CustodyTransaction> {
    return anchorageClient.getTransaction(this.vaultId, transactionId);
  }

  /**
   * List transactions with filters
   */
  async listTransactions(
    params?: PaginationParams & {
      walletId?: string;
      status?: TransactionStatus;
      type?: TransactionType;
      asset?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<PaginatedResponse<CustodyTransaction>> {
    return anchorageClient.listTransactions(this.vaultId, params);
  }

  /**
   * Get pending transactions requiring approval
   */
  async getPendingApprovals(): Promise<CustodyTransaction[]> {
    const result = await anchorageClient.listTransactions(this.vaultId, {
      status: TransactionStatus.PENDING_APPROVAL,
      limit: 100,
    });
    return result.data;
  }

  /**
   * Cancel a pending transaction
   */
  async cancelTransaction(
    transactionId: string,
    reason: string
  ): Promise<CustodyTransaction> {
    logger.info('Cancelling transaction', { transactionId, reason });

    const transaction = await anchorageClient.cancelTransaction(
      this.vaultId,
      transactionId,
      reason
    );

    logger.info('Transaction cancelled', { transactionId });
    return transaction;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(
    transactionId: string,
    timeoutMs: number = 300000 // 5 minutes default
  ): Promise<CustodyTransaction> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < timeoutMs) {
      const transaction = await this.getTransaction(transactionId);

      if (transaction.status === TransactionStatus.CONFIRMED) {
        return transaction;
      }

      if (transaction.status === TransactionStatus.FAILED) {
        throw new AnchorageError(
          'Transaction failed',
          'TRANSACTION_FAILED',
          400,
          { transactionId }
        );
      }

      if (transaction.status === TransactionStatus.REJECTED) {
        throw new AnchorageError(
          'Transaction rejected',
          'TRANSACTION_REJECTED',
          400,
          { transactionId }
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new AnchorageError(
      'Transaction confirmation timeout',
      'TIMEOUT',
      408,
      { transactionId }
    );
  }

  /**
   * Get transaction history for an asset
   */
  async getAssetTransactionHistory(
    asset: string,
    limit: number = 50
  ): Promise<CustodyTransaction[]> {
    const result = await anchorageClient.listTransactions(this.vaultId, {
      asset,
      limit,
    });
    return result.data;
  }

  /**
   * Get transaction summary/statistics
   */
  async getTransactionStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTransactions: number;
    byType: Record<TransactionType, number>;
    byStatus: Record<TransactionStatus, number>;
    totalVolumeUSD: number;
  }> {
    const result = await anchorageClient.listTransactions(this.vaultId, {
      startDate,
      endDate,
      limit: 1000,
    });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalVolumeUSD = 0;

    for (const tx of result.data) {
      byType[tx.type] = (byType[tx.type] || 0) + 1;
      byStatus[tx.status] = (byStatus[tx.status] || 0) + 1;
      // Would need to fetch USD value for each transaction
    }

    return {
      totalTransactions: result.data.length,
      byType: byType as Record<TransactionType, number>,
      byStatus: byStatus as Record<TransactionStatus, number>,
      totalVolumeUSD,
    };
  }

  /**
   * Estimate transaction completion time
   */
  private estimateCompletionTime(transaction: CustodyTransaction): Date {
    const now = new Date();

    // Estimate based on status
    switch (transaction.status) {
      case TransactionStatus.PENDING_APPROVAL:
        // Assume 1 hour for approval
        return new Date(now.getTime() + 60 * 60 * 1000);
      case TransactionStatus.APPROVED:
      case TransactionStatus.PENDING_SIGNATURE:
        // Assume 15 minutes for signing
        return new Date(now.getTime() + 15 * 60 * 1000);
      case TransactionStatus.SIGNED:
      case TransactionStatus.BROADCASTING:
        // Assume 2 minutes for blockchain confirmation
        return new Date(now.getTime() + 2 * 60 * 1000);
      default:
        return now;
    }
  }

  /**
   * Validate Solana address format
   */
  private isValidAddress(address: string): boolean {
    // Basic Solana address validation (base58, 32-44 characters)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  }

  /**
   * Retry failed transaction
   */
  async retryTransaction(transactionId: string): Promise<CustodyTransaction> {
    const original = await this.getTransaction(transactionId);

    if (original.status !== TransactionStatus.FAILED) {
      throw new AnchorageError(
        'Can only retry failed transactions',
        'INVALID_STATUS',
        400
      );
    }

    logger.info('Retrying failed transaction', { transactionId });

    // Create new transaction with same parameters
    if (original.type === TransactionType.WITHDRAWAL && original.destinationAddress) {
      const result = await this.createWithdrawal({
        vaultId: original.vaultId,
        walletId: original.walletId,
        asset: original.asset,
        amount: original.amount,
        destinationAddress: original.destinationAddress,
        memo: `Retry of ${transactionId}`,
      });
      return result.transaction;
    }

    throw new AnchorageError(
      'Cannot retry this transaction type',
      'UNSUPPORTED_RETRY',
      400
    );
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
