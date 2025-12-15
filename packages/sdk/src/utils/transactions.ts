import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
  Signer,
  Commitment,
  SendOptions,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import BN from 'bn.js';
import {
  DEFAULT_COMMITMENT,
  MAX_COMPUTE_UNITS,
  DEFAULT_COMPUTE_UNIT_PRICE,
} from '../constants';
import { TransactionError } from '../types';

/**
 * Options for building transactions
 */
export interface TransactionBuilderOptions {
  /** Compute unit limit for the transaction */
  computeUnitLimit?: number;
  /** Compute unit price in micro-lamports */
  computeUnitPrice?: number;
  /** Priority fee in lamports (alternative to computeUnitPrice) */
  priorityFee?: number;
  /** Recent blockhash (will be fetched if not provided) */
  recentBlockhash?: string;
  /** Last valid block height */
  lastValidBlockHeight?: number;
}

/**
 * Options for sending transactions
 */
export interface SendTransactionOptions extends SendOptions {
  /** Number of confirmations to wait for */
  confirmations?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Wallet interface for signing transactions
 */
export interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions?<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

/**
 * Transaction builder for constructing complex transactions
 */
export class TransactionBuilder {
  private instructions: TransactionInstruction[] = [];
  private signers: Signer[] = [];

  constructor(
    private connection: Connection,
    private payer: PublicKey,
    private options: TransactionBuilderOptions = {}
  ) {}

  /**
   * Add an instruction to the transaction
   */
  addInstruction(instruction: TransactionInstruction): this {
    this.instructions.push(instruction);
    return this;
  }

  /**
   * Add multiple instructions to the transaction
   */
  addInstructions(instructions: TransactionInstruction[]): this {
    this.instructions.push(...instructions);
    return this;
  }

  /**
   * Add a signer to the transaction
   */
  addSigner(signer: Signer): this {
    this.signers.push(signer);
    return this;
  }

  /**
   * Add multiple signers to the transaction
   */
  addSigners(signers: Signer[]): this {
    this.signers.push(...signers);
    return this;
  }

  /**
   * Build the transaction (legacy format)
   */
  async build(): Promise<Transaction> {
    const transaction = new Transaction();

    // Add compute budget instructions if specified
    if (this.options.computeUnitLimit !== undefined) {
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: this.options.computeUnitLimit,
        })
      );
    }

    if (this.options.computeUnitPrice !== undefined) {
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.options.computeUnitPrice,
        })
      );
    } else if (this.options.priorityFee !== undefined) {
      // Calculate micro-lamports from priority fee
      const microLamports = Math.ceil(
        (this.options.priorityFee * 1_000_000) /
          (this.options.computeUnitLimit ?? MAX_COMPUTE_UNITS)
      );
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
      );
    }

    // Add user instructions
    transaction.add(...this.instructions);

    // Set recent blockhash
    if (this.options.recentBlockhash) {
      transaction.recentBlockhash = this.options.recentBlockhash;
      if (this.options.lastValidBlockHeight !== undefined) {
        transaction.lastValidBlockHeight = this.options.lastValidBlockHeight;
      }
    } else {
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
    }

    transaction.feePayer = this.payer;

    return transaction;
  }

  /**
   * Build the transaction (versioned format)
   */
  async buildVersioned(): Promise<VersionedTransaction> {
    const instructions: TransactionInstruction[] = [];

    // Add compute budget instructions if specified
    if (this.options.computeUnitLimit !== undefined) {
      instructions.push(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: this.options.computeUnitLimit,
        })
      );
    }

    if (this.options.computeUnitPrice !== undefined) {
      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: this.options.computeUnitPrice,
        })
      );
    }

    // Add user instructions
    instructions.push(...this.instructions);

    // Get blockhash
    const { blockhash } = this.options.recentBlockhash
      ? { blockhash: this.options.recentBlockhash }
      : await this.connection.getLatestBlockhash();

    // Create message
    const messageV0 = new TransactionMessage({
      payerKey: this.payer,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
  }

  /**
   * Build and sign the transaction
   */
  async buildAndSign(wallet: WalletAdapter): Promise<Transaction> {
    const transaction = await this.build();

    // Sign with additional signers first
    if (this.signers.length > 0) {
      transaction.partialSign(...this.signers);
    }

    // Sign with wallet
    return await wallet.signTransaction(transaction);
  }

  /**
   * Get the current instructions
   */
  getInstructions(): TransactionInstruction[] {
    return [...this.instructions];
  }

  /**
   * Get the current signers
   */
  getSigners(): Signer[] {
    return [...this.signers];
  }

  /**
   * Clear all instructions and signers
   */
  clear(): this {
    this.instructions = [];
    this.signers = [];
    return this;
  }
}

/**
 * Send and confirm a transaction with retry logic
 */
export async function sendAndConfirmTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Signer[],
  options: SendTransactionOptions = {}
): Promise<TransactionSignature> {
  const {
    confirmations = 1,
    timeout = 60000,
    ...sendOptions
  } = options;

  try {
    // Sign the transaction
    if (signers.length > 0) {
      transaction.sign(...signers);
    }

    // Send the transaction
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: DEFAULT_COMMITMENT,
        ...sendOptions,
      }
    );

    // Confirm the transaction
    const startTime = Date.now();
    let confirmed = false;

    while (!confirmed && Date.now() - startTime < timeout) {
      const status = await connection.getSignatureStatus(signature);

      if (status.value?.err) {
        throw new TransactionError(
          `Transaction failed: ${JSON.stringify(status.value.err)}`,
          signature
        );
      }

      if (status.value?.confirmationStatus) {
        const confirmationLevels: Record<string, number> = {
          processed: 1,
          confirmed: 2,
          finalized: 3,
        };

        const currentLevel = confirmationLevels[status.value.confirmationStatus] ?? 0;
        if (currentLevel >= confirmations) {
          confirmed = true;
        }
      }

      if (!confirmed) {
        await sleep(500);
      }
    }

    if (!confirmed) {
      throw new TransactionError(
        'Transaction confirmation timeout',
        signature
      );
    }

    return signature;
  } catch (error) {
    if (error instanceof TransactionError) {
      throw error;
    }
    throw new TransactionError(
      `Failed to send transaction: ${(error as Error).message}`,
      undefined,
      error
    );
  }
}

/**
 * Send a transaction using an Anchor provider
 */
export async function sendWithProvider(
  provider: AnchorProvider,
  transaction: Transaction,
  signers: Signer[] = [],
  options: SendTransactionOptions = {}
): Promise<TransactionSignature> {
  try {
    // Sign with additional signers
    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }

    // Sign and send using provider
    const signature = await provider.sendAndConfirm(transaction, signers, {
      commitment: DEFAULT_COMMITMENT,
      ...options,
    });

    return signature;
  } catch (error) {
    throw new TransactionError(
      `Failed to send transaction: ${(error as Error).message}`,
      undefined,
      error
    );
  }
}

/**
 * Estimate transaction fees
 */
export async function estimateTransactionFee(
  connection: Connection,
  transaction: Transaction,
  signers: Signer[] = []
): Promise<number> {
  // Ensure transaction has a recent blockhash
  if (!transaction.recentBlockhash) {
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
  }

  // Sign the transaction for fee estimation
  if (signers.length > 0) {
    const signedTransaction = Transaction.from(transaction.serialize());
    signedTransaction.partialSign(...signers);
    
    const fee = await connection.getFeeForMessage(
      signedTransaction.compileMessage()
    );
    return fee.value ?? 0;
  }

  return 5000; // Default fee estimate
}

/**
 * Get optimal compute unit limit for a transaction
 */
export async function getOptimalComputeUnits(
  connection: Connection,
  transaction: Transaction,
  payer: PublicKey
): Promise<number> {
  try {
    // Simulate the transaction to get compute units used
    const simulation = await connection.simulateTransaction(transaction);

    if (simulation.value.err) {
      // Return default if simulation fails
      return MAX_COMPUTE_UNITS;
    }

    const unitsUsed = simulation.value.unitsConsumed ?? 200000;

    // Add 20% buffer
    return Math.min(Math.ceil(unitsUsed * 1.2), MAX_COMPUTE_UNITS);
  } catch {
    return MAX_COMPUTE_UNITS;
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForConfirmation(
  connection: Connection,
  signature: TransactionSignature,
  commitment: Commitment = DEFAULT_COMMITMENT,
  timeout: number = 60000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await connection.getSignatureStatus(signature);

    if (status.value?.err) {
      throw new TransactionError(
        `Transaction failed: ${JSON.stringify(status.value.err)}`,
        signature
      );
    }

    if (status.value?.confirmationStatus === commitment) {
      return;
    }

    await sleep(500);
  }

  throw new TransactionError('Transaction confirmation timeout', signature);
}

/**
 * Batch send transactions with rate limiting
 */
export async function batchSendTransactions(
  connection: Connection,
  transactions: Transaction[],
  signers: Signer[][],
  options: {
    batchSize?: number;
    delayMs?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<TransactionSignature[]> {
  const { batchSize = 10, delayMs = 500, onProgress } = options;
  const signatures: TransactionSignature[] = [];

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const batchSigners = signers.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map((tx, idx) =>
        sendAndConfirmTransaction(connection, tx, batchSigners[idx] ?? [])
      )
    );

    signatures.push(...results);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, transactions.length), transactions.length);
    }

    // Delay between batches to avoid rate limiting
    if (i + batchSize < transactions.length) {
      await sleep(delayMs);
    }
  }

  return signatures;
}

/**
 * Helper function to sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert a number to BN with optional decimals
 */
export function toBN(value: number | string, decimals: number = 0): BN {
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  const multiplier = Math.pow(10, decimals);
  return new BN(Math.floor(value * multiplier));
}

/**
 * Convert BN to number with optional decimals
 */
export function fromBN(value: BN, decimals: number = 0): number {
  const divisor = Math.pow(10, decimals);
  return value.toNumber() / divisor;
}

/**
 * Format a BN value as a string with decimals
 */
export function formatBN(value: BN, decimals: number = 0): string {
  const str = value.toString().padStart(decimals + 1, '0');
  const integerPart = str.slice(0, -decimals) || '0';
  const decimalPart = str.slice(-decimals);
  return decimals > 0 ? `${integerPart}.${decimalPart}` : integerPart;
}