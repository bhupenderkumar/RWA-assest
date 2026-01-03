/**
 * Circle USDC Integration - Service
 *
 * Service for USDC operations on Solana
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import { config } from "../../config";
import { logger } from "../../utils/logger";
import {
  USDCBalance,
  USDCTransfer,
  TransferStatus,
  TransferRequest,
  BatchTransferItem,
  BatchTransferResult,
  TokenAccountInfo,
  TransactionFeeEstimate,
  USDC_MINT,
  USDC_DECIMALS,
  USDCError,
  USDCErrorCode,
} from "./types";

/**
 * USDCService handles all USDC operations on Solana
 */
export class USDCService {
  private connection: Connection;
  private usdcMint: PublicKey;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment as "confirmed" | "finalized",
    });

    // Get USDC mint based on network
    const network = config.solana.network as keyof typeof USDC_MINT;
    const mintAddress =
      config.usdc.mint ||
      USDC_MINT[network.toUpperCase() as keyof typeof USDC_MINT] ||
      USDC_MINT.DEVNET;
    this.usdcMint = new PublicKey(mintAddress);
  }

  /**
   * Get USDC mint address
   */
  getMintAddress(): PublicKey {
    return this.usdcMint;
  }

  /**
   * Get USDC balance for a wallet
   */
  async getBalance(walletAddress: string): Promise<USDCBalance> {
    try {
      const wallet = new PublicKey(walletAddress);
      const tokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        wallet,
      );

      try {
        const account = await getAccount(this.connection, tokenAccount);
        const balanceRaw = account.amount.toString();
        const balance = this.formatAmount(BigInt(balanceRaw));

        return {
          wallet: walletAddress,
          balance,
          balanceRaw,
          tokenAccount: tokenAccount.toBase58(),
        };
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          return {
            wallet: walletAddress,
            balance: "0",
            balanceRaw: "0",
            tokenAccount: tokenAccount.toBase58(),
          };
        }
        throw error;
      }
    } catch (error) {
      logger.error("Failed to get USDC balance", { error, walletAddress });
      throw new USDCError(
        "Failed to get USDC balance",
        USDCErrorCode.TRANSACTION_FAILED,
        { walletAddress },
      );
    }
  }

  /**
   * Get token account info
   */
  async getTokenAccountInfo(
    walletAddress: string,
  ): Promise<TokenAccountInfo | null> {
    try {
      const wallet = new PublicKey(walletAddress);
      const tokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        wallet,
      );

      const account = await getAccount(this.connection, tokenAccount);

      return {
        address: tokenAccount.toBase58(),
        owner: account.owner.toBase58(),
        mint: account.mint.toBase58(),
        amount: account.amount.toString(),
        decimals: USDC_DECIMALS,
        isFrozen: account.isFrozen,
        isNative: account.isNative,
      };
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if wallet has a USDC token account
   */
  async hasTokenAccount(walletAddress: string): Promise<boolean> {
    const info = await this.getTokenAccountInfo(walletAddress);
    return info !== null;
  }

  /**
   * Create USDC token account for wallet
   */
  async createTokenAccount(
    walletAddress: string,
    payer: Keypair,
  ): Promise<string> {
    const wallet = new PublicKey(walletAddress);
    const tokenAccount = await getAssociatedTokenAddress(this.usdcMint, wallet);

    // Check if account already exists
    const existingAccount = await this.getTokenAccountInfo(walletAddress);
    if (existingAccount) {
      return existingAccount.address;
    }

    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccount,
        wallet,
        this.usdcMint,
      ),
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer],
    );

    logger.info("Created USDC token account", {
      wallet: walletAddress,
      tokenAccount: tokenAccount.toBase58(),
      signature,
    });

    return tokenAccount.toBase58();
  }

  /**
   * Transfer USDC
   */
  async transfer(
    request: TransferRequest,
    signer: Keypair,
  ): Promise<USDCTransfer> {
    logger.info("Initiating USDC transfer", {
      from: request.from,
      to: request.to,
      amount: request.amount,
    });

    const fromWallet = new PublicKey(request.from);
    const toWallet = new PublicKey(request.to);
    const amountRaw = this.parseAmount(request.amount);

    // Validate sender balance
    const balance = await this.getBalance(request.from);
    if (BigInt(balance.balanceRaw) < amountRaw) {
      throw new USDCError(
        "Insufficient USDC balance",
        USDCErrorCode.INSUFFICIENT_BALANCE,
        { available: balance.balance, required: request.amount.toString() },
      );
    }

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      fromWallet,
    );
    const toTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      toWallet,
    );

    const transaction = new Transaction();

    // Check if recipient needs token account creation
    const recipientHasAccount = await this.hasTokenAccount(request.to);
    if (!recipientHasAccount) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          signer.publicKey,
          toTokenAccount,
          toWallet,
          this.usdcMint,
        ),
      );
    }

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromWallet,
        amountRaw,
      ),
    );

    // Add memo if provided
    if (request.memo) {
      transaction.add(this.createMemoInstruction(request.memo));
    }

    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [signer],
      );

      logger.info("USDC transfer completed", {
        from: request.from,
        to: request.to,
        amount: request.amount,
        signature,
      });

      return {
        id: signature,
        from: request.from,
        to: request.to,
        amount: request.amount.toString(),
        amountRaw: amountRaw.toString(),
        transactionSignature: signature,
        status: TransferStatus.CONFIRMED,
        memo: request.memo,
        createdAt: new Date(),
        confirmedAt: new Date(),
      };
    } catch (error) {
      logger.error("USDC transfer failed", { error, request });
      throw new USDCError("Transfer failed", USDCErrorCode.TRANSACTION_FAILED, {
        originalError: String(error),
      });
    }
  }

  /**
   * Batch transfer USDC to multiple recipients
   */
  async batchTransfer(
    from: string,
    transfers: BatchTransferItem[],
    signer: Keypair,
  ): Promise<BatchTransferResult> {
    logger.info("Initiating batch USDC transfer", {
      from,
      recipientCount: transfers.length,
    });

    const results: BatchTransferResult = {
      total: transfers.length,
      successful: 0,
      failed: 0,
      transfers: [],
    };

    // Process transfers in chunks to avoid transaction size limits
    const CHUNK_SIZE = 5;

    for (let i = 0; i < transfers.length; i += CHUNK_SIZE) {
      const chunk = transfers.slice(i, i + CHUNK_SIZE);

      for (const transfer of chunk) {
        try {
          const result = await this.transfer(
            {
              from,
              to: transfer.to,
              amount: transfer.amount,
              memo: transfer.memo,
            },
            signer,
          );

          results.successful++;
          results.transfers.push({
            to: transfer.to,
            amount: transfer.amount,
            status: "success",
            transactionSignature: result.transactionSignature,
          });
        } catch (error) {
          results.failed++;
          results.transfers.push({
            to: transfer.to,
            amount: transfer.amount,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    logger.info("Batch transfer completed", {
      total: results.total,
      successful: results.successful,
      failed: results.failed,
    });

    return results;
  }

  /**
   * Estimate transfer fee
   */
  async estimateTransferFee(
    recipientHasAccount: boolean,
  ): Promise<TransactionFeeEstimate> {
    const baseFee = 0.000005; // 5000 lamports base fee
    const priorityFee = 0.00001; // Default priority fee

    // Add account creation cost if needed
    const accountCreationFee = recipientHasAccount ? 0 : 0.00203928; // ~2039280 lamports for rent

    return {
      baseFee: baseFee + accountCreationFee,
      priorityFee,
      totalFee: baseFee + accountCreationFee + priorityFee,
      estimatedTime: 2, // ~2 seconds for confirmation
    };
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(
    walletAddress: string,
    limit: number = 50,
  ): Promise<USDCTransfer[]> {
    try {
      const wallet = new PublicKey(walletAddress);
      const tokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        wallet,
      );

      const signatures = await this.connection.getSignaturesForAddress(
        tokenAccount,
        { limit },
      );

      const transfers: USDCTransfer[] = [];

      for (const sig of signatures) {
        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (tx?.meta && !tx.meta.err) {
            // Parse transfer details from transaction
            // This is simplified - real implementation would parse instructions
            transfers.push({
              id: sig.signature,
              from: walletAddress,
              to: "", // Would parse from instruction
              amount: "0", // Would parse from instruction
              amountRaw: "0",
              transactionSignature: sig.signature,
              status: TransferStatus.CONFIRMED,
              createdAt: new Date(sig.blockTime! * 1000),
              confirmedAt: new Date(sig.blockTime! * 1000),
            });
          }
        } catch (error) {
          // Skip failed transaction parsing
        }
      }

      return transfers;
    } catch (error) {
      logger.error("Failed to get transaction history", {
        error,
        walletAddress,
      });
      return [];
    }
  }

  /**
   * Convert USDC amount to raw lamports
   */
  parseAmount(amount: number): bigint {
    return BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));
  }

  /**
   * Convert raw lamports to USDC amount string
   */
  formatAmount(amountRaw: bigint): string {
    const divisor = BigInt(Math.pow(10, USDC_DECIMALS));
    const wholePart = amountRaw / divisor;
    const fractionalPart = amountRaw % divisor;

    const fractionalStr = fractionalPart
      .toString()
      .padStart(USDC_DECIMALS, "0");
    return `${wholePart}.${fractionalStr}`;
  }

  /**
   * Create memo instruction
   */
  private createMemoInstruction(memo: string): TransactionInstruction {
    const MEMO_PROGRAM_ID = new PublicKey(
      "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    );

    return new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, "utf-8"),
    });
  }

  /**
   * Validate wallet address
   */
  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const usdcService = new USDCService();
