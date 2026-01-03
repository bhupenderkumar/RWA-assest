import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { ESCROW_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "../constants";
import {
  Escrow,
  EscrowStatus,
  CreateEscrowParams,
  InvalidParameterError,
} from "../types";
import {
  deriveEscrow,
  deserializeEscrow,
  fetchAccount,
  getProgramAccounts,
  createMemcmpFilter,
  accountExists,
} from "../utils/accounts";
import {
  TransactionBuilder,
  sendWithProvider,
  SendTransactionOptions,
  WalletAdapter,
} from "../utils/transactions";

/**
 * Client for interacting with the Escrow program
 *
 * @example
 * ```typescript
 * const client = new EscrowClient(connection, wallet);
 *
 * // Create an escrow
 * const { signature, escrowAddress } = await client.createEscrow({
 *   seller: sellerPubkey,
 *   assetMint: assetMintPubkey,
 *   paymentMint: usdcMintPubkey,
 *   assetAmount: new BN(1000),
 *   paymentAmount: new BN(10_000_00), // $100.00
 *   expiresAt: new BN(Date.now() / 1000 + 86400), // 24 hours
 * });
 *
 * // Deposit payment
 * await client.depositPayment(escrowAddress);
 *
 * // Release escrow
 * await client.releaseEscrow(escrowAddress);
 * ```
 */
export class EscrowClient {
  private connection: Connection;
  private wallet: WalletAdapter;
  private provider: AnchorProvider | null = null;
  private programId: PublicKey;

  constructor(
    connection: Connection,
    wallet: WalletAdapter,
    programId: PublicKey = ESCROW_PROGRAM_ID,
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.programId = programId;
  }

  /**
   * Set an AnchorProvider for more advanced operations
   */
  setProvider(provider: AnchorProvider): void {
    this.provider = provider;
  }

  // ===========================================================================
  // Read Methods
  // ===========================================================================

  /**
   * Get an escrow by buyer and asset mint
   */
  async getEscrow(buyer: PublicKey, assetMint: PublicKey): Promise<Escrow> {
    const [escrowPda] = deriveEscrow(buyer, assetMint);
    return fetchAccount(
      this.connection,
      escrowPda,
      deserializeEscrow,
      "Escrow",
    );
  }

  /**
   * Get an escrow by its PDA address
   */
  async getEscrowByAddress(address: PublicKey): Promise<Escrow> {
    return fetchAccount(this.connection, address, deserializeEscrow, "Escrow");
  }

  /**
   * List all escrows
   */
  async listEscrows(): Promise<{ pubkey: PublicKey; account: Escrow }[]> {
    return getProgramAccounts(
      this.connection,
      this.programId,
      deserializeEscrow,
      [],
    );
  }

  /**
   * List escrows by buyer
   */
  async listEscrowsByBuyer(
    buyer: PublicKey,
  ): Promise<{ pubkey: PublicKey; account: Escrow }[]> {
    return getProgramAccounts(
      this.connection,
      this.programId,
      deserializeEscrow,
      [createMemcmpFilter(8, buyer)],
    );
  }

  /**
   * List escrows by seller
   */
  async listEscrowsBySeller(
    seller: PublicKey,
  ): Promise<{ pubkey: PublicKey; account: Escrow }[]> {
    return getProgramAccounts(
      this.connection,
      this.programId,
      deserializeEscrow,
      [createMemcmpFilter(40, seller)], // offset 8 (discriminator) + 32 (buyer)
    );
  }

  /**
   * List escrows by status
   */
  async listEscrowsByStatus(
    status: EscrowStatus,
  ): Promise<{ pubkey: PublicKey; account: Escrow }[]> {
    const allEscrows = await this.listEscrows();
    return allEscrows.filter((e) => e.account.status === status);
  }

  /**
   * Check if an escrow exists
   */
  async escrowExists(buyer: PublicKey, assetMint: PublicKey): Promise<boolean> {
    const [escrowPda] = deriveEscrow(buyer, assetMint);
    return accountExists(this.connection, escrowPda);
  }

  /**
   * Get the escrow PDA address
   */
  getEscrowAddress(buyer: PublicKey, assetMint: PublicKey): PublicKey {
    const [escrowPda] = deriveEscrow(buyer, assetMint);
    return escrowPda;
  }

  // ===========================================================================
  // Write Methods
  // ===========================================================================

  /**
   * Create a new escrow for a token purchase
   */
  async createEscrow(
    params: CreateEscrowParams,
    options?: SendTransactionOptions,
  ): Promise<{ signature: string; escrowAddress: PublicKey }> {
    if (params.assetAmount.lten(0)) {
      throw new InvalidParameterError(
        "assetAmount",
        "Asset amount must be positive",
      );
    }
    if (params.paymentAmount.lten(0)) {
      throw new InvalidParameterError(
        "paymentAmount",
        "Payment amount must be positive",
      );
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (params.expiresAt.lten(currentTime)) {
      throw new InvalidParameterError(
        "expiresAt",
        "Expiration time must be in the future",
      );
    }

    const [escrowPda] = deriveEscrow(this.wallet.publicKey, params.assetMint);

    const ix = await this.createCreateEscrowInstruction(params);

    const builder = new TransactionBuilder(
      this.connection,
      this.wallet.publicKey,
    );
    builder.addInstruction(ix);

    const tx = await builder.buildAndSign(this.wallet);

    let signature: string;
    if (this.provider) {
      signature = await sendWithProvider(this.provider, tx, [], options);
    } else {
      signature = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction(signature);
    }

    return { signature, escrowAddress: escrowPda };
  }

  /**
   * Deposit payment tokens into escrow (buyer action)
   */
  async depositPayment(
    assetMint: PublicKey,
    buyerPaymentAccount: PublicKey,
    escrowPaymentVault: PublicKey,
    paymentMint: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createDepositPaymentInstruction(
      assetMint,
      buyerPaymentAccount,
      escrowPaymentVault,
      paymentMint,
    );

    const builder = new TransactionBuilder(
      this.connection,
      this.wallet.publicKey,
    );
    builder.addInstruction(ix);

    const tx = await builder.buildAndSign(this.wallet);

    if (this.provider) {
      return sendWithProvider(this.provider, tx, [], options);
    }

    const signature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  /**
   * Deposit asset tokens into escrow (seller action)
   */
  async depositAsset(
    buyer: PublicKey,
    assetMint: PublicKey,
    sellerAssetAccount: PublicKey,
    escrowAssetVault: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createDepositAssetInstruction(
      buyer,
      assetMint,
      sellerAssetAccount,
      escrowAssetVault,
    );

    const builder = new TransactionBuilder(
      this.connection,
      this.wallet.publicKey,
    );
    builder.addInstruction(ix);

    const tx = await builder.buildAndSign(this.wallet);

    if (this.provider) {
      return sendWithProvider(this.provider, tx, [], options);
    }

    const signature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  /**
   * Release escrow - complete the swap
   */
  async releaseEscrow(
    buyer: PublicKey,
    seller: PublicKey,
    assetMint: PublicKey,
    paymentMint: PublicKey,
    escrowAssetVault: PublicKey,
    escrowPaymentVault: PublicKey,
    buyerAssetAccount: PublicKey,
    sellerPaymentAccount: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createReleaseInstruction(
      buyer,
      seller,
      assetMint,
      paymentMint,
      escrowAssetVault,
      escrowPaymentVault,
      buyerAssetAccount,
      sellerPaymentAccount,
    );

    const builder = new TransactionBuilder(
      this.connection,
      this.wallet.publicKey,
    );
    builder.addInstruction(ix);

    const tx = await builder.buildAndSign(this.wallet);

    if (this.provider) {
      return sendWithProvider(this.provider, tx, [], options);
    }

    const signature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  /**
   * Refund escrow - return funds to original owners
   */
  async refundEscrow(
    buyer: PublicKey,
    seller: PublicKey,
    assetMint: PublicKey,
    paymentMint: PublicKey,
    escrowAssetVault: PublicKey,
    escrowPaymentVault: PublicKey,
    buyerPaymentAccount: PublicKey,
    sellerAssetAccount: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createRefundInstruction(
      buyer,
      seller,
      assetMint,
      paymentMint,
      escrowAssetVault,
      escrowPaymentVault,
      buyerPaymentAccount,
      sellerAssetAccount,
    );

    const builder = new TransactionBuilder(
      this.connection,
      this.wallet.publicKey,
    );
    builder.addInstruction(ix);

    const tx = await builder.buildAndSign(this.wallet);

    if (this.provider) {
      return sendWithProvider(this.provider, tx, [], options);
    }

    const signature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  // ===========================================================================
  // Instruction Builders
  // ===========================================================================

  /**
   * Create escrow instruction
   */
  private async createCreateEscrowInstruction(
    params: CreateEscrowParams,
  ): Promise<TransactionInstruction> {
    const [escrowPda] = deriveEscrow(this.wallet.publicKey, params.assetMint);

    // Build instruction data
    const data = Buffer.alloc(32);
    let offset = 0;

    // Create escrow discriminator
    const discriminator = Buffer.from([29, 205, 107, 168, 32, 48, 98, 102]);
    discriminator.copy(data, offset);
    offset += 8;

    // Asset amount
    params.assetAmount.toArrayLike(Buffer, "le", 8).copy(data, offset);
    offset += 8;

    // Payment amount
    params.paymentAmount.toArrayLike(Buffer, "le", 8).copy(data, offset);
    offset += 8;

    // Expires at
    params.expiresAt.toArrayLike(Buffer, "le", 8).copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: params.seller, isSigner: false, isWritable: false },
        { pubkey: params.assetMint, isSigner: false, isWritable: false },
        { pubkey: params.paymentMint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create deposit payment instruction
   */
  private async createDepositPaymentInstruction(
    assetMint: PublicKey,
    buyerPaymentAccount: PublicKey,
    escrowPaymentVault: PublicKey,
    paymentMint: PublicKey,
  ): Promise<TransactionInstruction> {
    const [escrowPda] = deriveEscrow(this.wallet.publicKey, assetMint);

    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([149, 235, 89, 186, 226, 185, 187, 77]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: buyerPaymentAccount, isSigner: false, isWritable: true },
        { pubkey: escrowPaymentVault, isSigner: false, isWritable: true },
        { pubkey: paymentMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create deposit asset instruction
   */
  private async createDepositAssetInstruction(
    buyer: PublicKey,
    assetMint: PublicKey,
    sellerAssetAccount: PublicKey,
    escrowAssetVault: PublicKey,
  ): Promise<TransactionInstruction> {
    const [escrowPda] = deriveEscrow(buyer, assetMint);

    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([70, 21, 246, 167, 196, 78, 229, 141]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: sellerAssetAccount, isSigner: false, isWritable: true },
        { pubkey: escrowAssetVault, isSigner: false, isWritable: true },
        { pubkey: assetMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create release instruction
   */
  private async createReleaseInstruction(
    buyer: PublicKey,
    seller: PublicKey,
    assetMint: PublicKey,
    paymentMint: PublicKey,
    escrowAssetVault: PublicKey,
    escrowPaymentVault: PublicKey,
    buyerAssetAccount: PublicKey,
    sellerPaymentAccount: PublicKey,
  ): Promise<TransactionInstruction> {
    const [escrowPda] = deriveEscrow(buyer, assetMint);

    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([190, 189, 128, 44, 14, 155, 133, 106]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: buyer, isSigner: false, isWritable: true },
        { pubkey: seller, isSigner: false, isWritable: true },
        { pubkey: escrowAssetVault, isSigner: false, isWritable: true },
        { pubkey: escrowPaymentVault, isSigner: false, isWritable: true },
        { pubkey: buyerAssetAccount, isSigner: false, isWritable: true },
        { pubkey: sellerPaymentAccount, isSigner: false, isWritable: true },
        { pubkey: assetMint, isSigner: false, isWritable: false },
        { pubkey: paymentMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create refund instruction
   */
  private async createRefundInstruction(
    buyer: PublicKey,
    seller: PublicKey,
    assetMint: PublicKey,
    paymentMint: PublicKey,
    escrowAssetVault: PublicKey,
    escrowPaymentVault: PublicKey,
    buyerPaymentAccount: PublicKey,
    sellerAssetAccount: PublicKey,
  ): Promise<TransactionInstruction> {
    const [escrowPda] = deriveEscrow(buyer, assetMint);

    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([213, 0, 134, 50, 188, 195, 187, 213]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: escrowPda, isSigner: false, isWritable: true },
        { pubkey: buyer, isSigner: false, isWritable: true },
        { pubkey: seller, isSigner: false, isWritable: true },
        { pubkey: escrowAssetVault, isSigner: false, isWritable: true },
        { pubkey: escrowPaymentVault, isSigner: false, isWritable: true },
        { pubkey: buyerPaymentAccount, isSigner: false, isWritable: true },
        { pubkey: sellerAssetAccount, isSigner: false, isWritable: true },
        { pubkey: assetMint, isSigner: false, isWritable: false },
        { pubkey: paymentMint, isSigner: false, isWritable: false },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }
}
