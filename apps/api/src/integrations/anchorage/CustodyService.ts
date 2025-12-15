/**
 * Anchorage Digital Integration - Custody Service
 * 
 * High-level service for custody operations
 */

import { PublicKey } from '@solana/web3.js';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { anchorageClient } from './AnchorageClient';
import {
  Vault,
  CustodyWallet,
  AssetBalance,
  VaultType,
  AnchorageError,
} from './types';

/**
 * CustodyService provides high-level custody operations
 */
export class CustodyService {
  private vaultId: string;

  constructor() {
    this.vaultId = config.anchorage.vaultId;
  }

  /**
   * Get the primary custody vault
   */
  async getPrimaryVault(): Promise<Vault> {
    return anchorageClient.getVault(this.vaultId);
  }

  /**
   * Get all custody wallets
   */
  async getWallets(): Promise<CustodyWallet[]> {
    return anchorageClient.listWallets(this.vaultId);
  }

  /**
   * Get Solana wallets only
   */
  async getSolanaWallets(): Promise<CustodyWallet[]> {
    const wallets = await anchorageClient.listWallets(this.vaultId);
    return wallets.filter((w) => w.network === 'SOLANA');
  }

  /**
   * Create a new Solana custody wallet
   */
  async createSolanaWallet(name: string): Promise<CustodyWallet> {
    logger.info('Creating new Solana custody wallet', { name });

    const wallet = await anchorageClient.createWallet(this.vaultId, {
      name,
      network: 'SOLANA',
    });

    logger.info('Solana custody wallet created', {
      walletId: wallet.id,
      address: wallet.address,
    });

    return wallet;
  }

  /**
   * Get deposit address for receiving assets
   */
  async getDepositAddress(walletId: string, asset?: string): Promise<string> {
    const result = await anchorageClient.getDepositAddress(
      this.vaultId,
      walletId,
      asset
    );
    return result.address;
  }

  /**
   * Get total custody balances
   */
  async getTotalBalances(): Promise<AssetBalance[]> {
    return anchorageClient.getVaultBalances(this.vaultId);
  }

  /**
   * Get wallet balances
   */
  async getWalletBalances(walletId: string): Promise<AssetBalance[]> {
    return anchorageClient.getWalletBalances(this.vaultId, walletId);
  }

  /**
   * Get USDC balance across all wallets
   */
  async getUSDCBalance(): Promise<{
    total: string;
    byWallet: Array<{ walletId: string; balance: string }>;
  }> {
    const wallets = await this.getSolanaWallets();
    const byWallet: Array<{ walletId: string; balance: string }> = [];
    let total = BigInt(0);

    for (const wallet of wallets) {
      try {
        const balance = await anchorageClient.getAssetBalance(
          this.vaultId,
          wallet.id,
          'USDC'
        );
        byWallet.push({ walletId: wallet.id, balance: balance.balance });
        total += BigInt(balance.balance);
      } catch (error) {
        // Wallet might not have USDC balance
        byWallet.push({ walletId: wallet.id, balance: '0' });
      }
    }

    return {
      total: total.toString(),
      byWallet,
    };
  }

  /**
   * Get token balance by mint address
   */
  async getTokenBalance(
    walletId: string,
    mintAddress: string
  ): Promise<AssetBalance | null> {
    try {
      const balances = await anchorageClient.getWalletBalances(
        this.vaultId,
        walletId
      );
      return balances.find((b) => b.mintAddress === mintAddress) || null;
    } catch (error) {
      logger.error('Failed to get token balance', { error, walletId, mintAddress });
      return null;
    }
  }

  /**
   * Check if wallet has sufficient balance
   */
  async hasSufficientBalance(
    walletId: string,
    asset: string,
    requiredAmount: string
  ): Promise<boolean> {
    try {
      const balance = await anchorageClient.getAssetBalance(
        this.vaultId,
        walletId,
        asset
      );
      return BigInt(balance.balance) >= BigInt(requiredAmount);
    } catch (error) {
      logger.error('Failed to check balance', { error });
      return false;
    }
  }

  /**
   * Get custody address for asset registration
   */
  async getCustodyAddressForAsset(assetId: string): Promise<{
    walletId: string;
    address: string;
  }> {
    // Get or create a wallet for this asset
    const wallets = await this.getSolanaWallets();

    // For simplicity, use the first available wallet
    // In production, you might want more sophisticated wallet allocation
    let wallet = wallets.find((w) => w.isActive);

    if (!wallet) {
      wallet = await this.createSolanaWallet(`Asset-${assetId}`);
    }

    return {
      walletId: wallet.id,
      address: wallet.address,
    };
  }

  /**
   * Validate custody address
   */
  async validateCustodyAddress(address: string): Promise<boolean> {
    try {
      const wallets = await this.getSolanaWallets();
      return wallets.some((w) => w.address === address);
    } catch (error) {
      logger.error('Failed to validate custody address', { error, address });
      return false;
    }
  }

  /**
   * Get custody statistics
   */
  async getCustodyStats(): Promise<{
    totalValueUSD: number;
    walletCount: number;
    assetCount: number;
    topAssets: Array<{ symbol: string; valueUSD: number }>;
  }> {
    const [vault, wallets, balances] = await Promise.all([
      this.getPrimaryVault(),
      this.getSolanaWallets(),
      this.getTotalBalances(),
    ]);

    const totalValueUSD = balances.reduce((sum, b) => sum + b.usdValue, 0);
    const topAssets = balances
      .sort((a, b) => b.usdValue - a.usdValue)
      .slice(0, 5)
      .map((b) => ({ symbol: b.symbol, valueUSD: b.usdValue }));

    return {
      totalValueUSD,
      walletCount: wallets.length,
      assetCount: balances.length,
      topAssets,
    };
  }

  /**
   * Monitor wallet for incoming deposits
   */
  async setupDepositMonitoring(
    walletId: string,
    callback: (deposit: { asset: string; amount: string; from: string }) => void
  ): Promise<() => void> {
    // In production, this would set up webhook or polling
    // For now, return a no-op cleanup function
    logger.info('Setting up deposit monitoring', { walletId });

    // Poll every 30 seconds as fallback
    const interval = setInterval(async () => {
      try {
        const transactions = await anchorageClient.listTransactions(this.vaultId, {
          walletId,
          status: 'CONFIRMED' as any,
          limit: 10,
        });

        // Process new deposits (would need to track processed txs)
        for (const tx of transactions.data) {
          if (tx.type === 'DEPOSIT' && tx.sourceAddress) {
            callback({
              asset: tx.asset,
              amount: tx.amount,
              from: tx.sourceAddress,
            });
          }
        }
      } catch (error) {
        logger.error('Deposit monitoring error', { error });
      }
    }, 30000);

    return () => clearInterval(interval);
  }
}

// Export singleton instance
export const custodyService = new CustodyService();
