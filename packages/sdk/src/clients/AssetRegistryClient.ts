import {
  Connection,
  PublicKey,
  Keypair,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  ASSET_REGISTRY_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  MAX_ASSET_NAME_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_URI_LENGTH,
} from "../constants";
import {
  Config,
  Asset,
  MintConfig,
  AssetType,
  AssetStatus,
  RegisterAssetParams,
  UpdateAssetParams,
  CreateTokenMintParams,
  InvalidParameterError,
} from "../types";
import {
  deriveAssetRegistryConfig,
  deriveAsset,
  deriveMintConfig,
  deriveMintAuthority,
  deserializeConfig,
  deserializeAsset,
  deserializeMintConfig,
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
 * Client for interacting with the Asset Registry program
 *
 * @example
 * ```typescript
 * const client = new AssetRegistryClient(connection, wallet);
 *
 * // Register a new asset
 * const { signature, assetAddress } = await client.registerAsset({
 *   name: "Manhattan Office Building",
 *   assetType: AssetType.RealEstate,
 *   totalValue: new BN(10_000_000_00), // $10M in cents
 *   totalSupply: new BN(1_000_000),
 *   metadataUri: "https://arweave.net/...",
 * }, mintKeypair);
 * ```
 */
export class AssetRegistryClient {
  private connection: Connection;
  private wallet: WalletAdapter;
  private provider: AnchorProvider | null = null;
  private programId: PublicKey;

  constructor(
    connection: Connection,
    wallet: WalletAdapter,
    programId: PublicKey = ASSET_REGISTRY_PROGRAM_ID,
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
   * Get the Asset Registry configuration
   */
  async getConfig(): Promise<Config> {
    const [configPda] = deriveAssetRegistryConfig();
    return fetchAccount(
      this.connection,
      configPda,
      deserializeConfig,
      "Config",
    );
  }

  /**
   * Get an asset by its mint address
   */
  async getAsset(mint: PublicKey): Promise<Asset> {
    const [assetPda] = deriveAsset(mint);
    return fetchAccount(this.connection, assetPda, deserializeAsset, "Asset");
  }

  /**
   * Get an asset by its PDA address
   */
  async getAssetByAddress(address: PublicKey): Promise<Asset> {
    return fetchAccount(this.connection, address, deserializeAsset, "Asset");
  }

  /**
   * Get the mint configuration for a token
   */
  async getMintConfig(mint: PublicKey): Promise<MintConfig> {
    const [mintConfigPda] = deriveMintConfig(mint);
    return fetchAccount(
      this.connection,
      mintConfigPda,
      deserializeMintConfig,
      "MintConfig",
    );
  }

  /**
   * List all registered assets
   */
  async listAssets(): Promise<{ pubkey: PublicKey; account: Asset }[]> {
    return getProgramAccounts(
      this.connection,
      this.programId,
      deserializeAsset,
      [
        // Filter by account discriminator (first 8 bytes)
        // Asset discriminator can be derived from the account name hash
      ],
    );
  }

  /**
   * List assets by authority
   */
  async listAssetsByAuthority(
    authority: PublicKey,
  ): Promise<{ pubkey: PublicKey; account: Asset }[]> {
    return getProgramAccounts(
      this.connection,
      this.programId,
      deserializeAsset,
      [
        // Filter by authority at offset 8 (after discriminator)
        createMemcmpFilter(8, authority),
      ],
    );
  }

  /**
   * List assets by status
   */
  async listAssetsByStatus(
    status: AssetStatus,
  ): Promise<{ pubkey: PublicKey; account: Asset }[]> {
    const allAssets = await this.listAssets();
    return allAssets.filter((a) => a.account.status === status);
  }

  /**
   * List assets by type
   */
  async listAssetsByType(
    assetType: AssetType,
  ): Promise<{ pubkey: PublicKey; account: Asset }[]> {
    const allAssets = await this.listAssets();
    return allAssets.filter((a) => a.account.assetType === assetType);
  }

  /**
   * Check if an asset exists
   */
  async assetExists(mint: PublicKey): Promise<boolean> {
    const [assetPda] = deriveAsset(mint);
    return accountExists(this.connection, assetPda);
  }

  /**
   * Get the PDA addresses for an asset
   */
  getAssetAddresses(mint: PublicKey): {
    asset: PublicKey;
    mintConfig: PublicKey;
    mintAuthority: PublicKey;
  } {
    const [asset] = deriveAsset(mint);
    const [mintConfig] = deriveMintConfig(mint);
    const [mintAuthority] = deriveMintAuthority(mint);

    return { asset, mintConfig, mintAuthority };
  }

  // ===========================================================================
  // Write Methods
  // ===========================================================================

  /**
   * Initialize the Asset Registry program
   */
  async initialize(
    platformFeeBps: number,
    options?: SendTransactionOptions,
  ): Promise<string> {
    if (platformFeeBps < 0 || platformFeeBps > 10000) {
      throw new InvalidParameterError(
        "platformFeeBps",
        "Platform fee must be between 0 and 10000 basis points",
      );
    }

    const ix = await this.createInitializeInstruction(platformFeeBps);

    const builder = new TransactionBuilder(
      this.connection,
      this.wallet.publicKey,
    );
    builder.addInstruction(ix);

    const tx = await builder.buildAndSign(this.wallet);

    if (this.provider) {
      return sendWithProvider(this.provider, tx, [], options);
    }

    // Send without provider
    const signature = await this.connection.sendRawTransaction(tx.serialize());
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  /**
   * Register a new asset
   */
  async registerAsset(
    params: RegisterAssetParams,
    mint: Keypair,
    options?: SendTransactionOptions,
  ): Promise<{ signature: string; assetAddress: PublicKey }> {
    // Validate parameters
    if (params.name.length > MAX_ASSET_NAME_LENGTH) {
      throw new InvalidParameterError(
        "name",
        `Asset name must be at most ${MAX_ASSET_NAME_LENGTH} characters`,
      );
    }
    if (params.metadataUri.length > MAX_URI_LENGTH) {
      throw new InvalidParameterError(
        "metadataUri",
        `Metadata URI must be at most ${MAX_URI_LENGTH} characters`,
      );
    }
    if (params.totalValue.lten(0)) {
      throw new InvalidParameterError(
        "totalValue",
        "Total value must be positive",
      );
    }
    if (params.totalSupply.lten(0)) {
      throw new InvalidParameterError(
        "totalSupply",
        "Total supply must be positive",
      );
    }

    const [assetPda] = deriveAsset(mint.publicKey);

    const ix = await this.createRegisterAssetInstruction(
      params,
      mint.publicKey,
    );

    const builder = new TransactionBuilder(
      this.connection,
      this.wallet.publicKey,
    );
    builder.addInstruction(ix);
    builder.addSigner(mint);

    const tx = await builder.buildAndSign(this.wallet);

    let signature: string;
    if (this.provider) {
      signature = await sendWithProvider(this.provider, tx, [mint], options);
    } else {
      signature = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction(signature);
    }

    return { signature, assetAddress: assetPda };
  }

  /**
   * Update an asset's metadata
   */
  async updateAsset(
    mint: PublicKey,
    params: UpdateAssetParams,
    options?: SendTransactionOptions,
  ): Promise<string> {
    if (params.metadataUri && params.metadataUri.length > MAX_URI_LENGTH) {
      throw new InvalidParameterError(
        "metadataUri",
        `Metadata URI must be at most ${MAX_URI_LENGTH} characters`,
      );
    }
    if (params.totalValue && params.totalValue.lten(0)) {
      throw new InvalidParameterError(
        "totalValue",
        "Total value must be positive",
      );
    }

    const ix = await this.createUpdateAssetInstruction(mint, params);

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
   * Activate an asset (make it tradeable)
   */
  async activateAsset(
    mint: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createActivateAssetInstruction(mint);

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
   * Freeze an asset (pause trading)
   */
  async freezeAsset(
    mint: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createFreezeAssetInstruction(mint);

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
   * Unfreeze an asset (resume trading)
   */
  async unfreezeAsset(
    mint: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createUnfreezeAssetInstruction(mint);

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
   * Burn/retire an asset
   */
  async burnAsset(
    mint: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createBurnAssetInstruction(mint);

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
   * Create a Token-2022 mint with transfer hook
   */
  async createTokenMint(
    params: CreateTokenMintParams,
    mint: Keypair,
    permanentDelegate: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<{ signature: string; mintAddress: PublicKey }> {
    if (params.name.length > 32) {
      throw new InvalidParameterError(
        "name",
        "Token name must be at most 32 characters",
      );
    }
    if (params.symbol.length > MAX_SYMBOL_LENGTH) {
      throw new InvalidParameterError(
        "symbol",
        `Token symbol must be at most ${MAX_SYMBOL_LENGTH} characters`,
      );
    }
    if (params.uri.length > 200) {
      throw new InvalidParameterError(
        "uri",
        "URI must be at most 200 characters",
      );
    }

    const ix = await this.createTokenMintInstruction(
      params,
      mint.publicKey,
      permanentDelegate,
    );

    const builder = new TransactionBuilder(
      this.connection,
      this.wallet.publicKey,
    );
    builder.addInstruction(ix);
    builder.addSigner(mint);

    const tx = await builder.buildAndSign(this.wallet);

    let signature: string;
    if (this.provider) {
      signature = await sendWithProvider(this.provider, tx, [mint], options);
    } else {
      signature = await this.connection.sendRawTransaction(tx.serialize());
      await this.connection.confirmTransaction(signature);
    }

    return { signature, mintAddress: mint.publicKey };
  }

  /**
   * Mint tokens to a recipient
   */
  async mintTokens(
    mint: PublicKey,
    recipient: PublicKey,
    recipientTokenAccount: PublicKey,
    amount: BN,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createMintTokensInstruction(
      mint,
      recipient,
      recipientTokenAccount,
      amount,
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
   * Create initialize instruction
   */
  private async createInitializeInstruction(
    platformFeeBps: number,
  ): Promise<TransactionInstruction> {
    const [configPda] = deriveAssetRegistryConfig();

    // Build instruction data
    // Discriminator (8 bytes) + platform_fee_bps (2 bytes)
    const data = Buffer.alloc(10);
    // Initialize discriminator - hash of "global:initialize"
    const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
    discriminator.copy(data, 0);
    data.writeUInt16LE(platformFeeBps, 8);

    return new TransactionInstruction({
      keys: [
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create register asset instruction
   */
  private async createRegisterAssetInstruction(
    params: RegisterAssetParams,
    mint: PublicKey,
  ): Promise<TransactionInstruction> {
    const [configPda] = deriveAssetRegistryConfig();
    const [assetPda] = deriveAsset(mint);

    // Serialize instruction data
    const nameBytes = Buffer.from(params.name, "utf8");
    const uriBytes = Buffer.from(params.metadataUri, "utf8");

    const dataSize =
      8 + // discriminator
      4 +
      nameBytes.length + // name (string)
      1 + // asset_type (enum)
      8 + // total_value
      8 + // total_supply
      4 +
      uriBytes.length; // metadata_uri (string)

    const data = Buffer.alloc(dataSize);
    let offset = 0;

    // Register asset discriminator
    const discriminator = Buffer.from([199, 83, 195, 213, 159, 211, 141, 108]);
    discriminator.copy(data, offset);
    offset += 8;

    // Name
    data.writeUInt32LE(nameBytes.length, offset);
    offset += 4;
    nameBytes.copy(data, offset);
    offset += nameBytes.length;

    // Asset type
    data.writeUInt8(params.assetType, offset);
    offset += 1;

    // Total value
    params.totalValue.toArrayLike(Buffer, "le", 8).copy(data, offset);
    offset += 8;

    // Total supply
    params.totalSupply.toArrayLike(Buffer, "le", 8).copy(data, offset);
    offset += 8;

    // Metadata URI
    data.writeUInt32LE(uriBytes.length, offset);
    offset += 4;
    uriBytes.copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: assetPda, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create update asset instruction
   */
  private async createUpdateAssetInstruction(
    mint: PublicKey,
    params: UpdateAssetParams,
  ): Promise<TransactionInstruction> {
    const [assetPda] = deriveAsset(mint);

    // Serialize instruction data
    const uriBytes = params.metadataUri
      ? Buffer.from(params.metadataUri, "utf8")
      : null;

    const dataSize =
      8 + // discriminator
      1 +
      (uriBytes ? 4 + uriBytes.length : 0) + // optional metadata_uri
      1 +
      (params.totalValue ? 8 : 0); // optional total_value

    const data = Buffer.alloc(dataSize);
    let offset = 0;

    // Update asset discriminator
    const discriminator = Buffer.from([107, 203, 66, 238, 43, 155, 108, 161]);
    discriminator.copy(data, offset);
    offset += 8;

    // Optional metadata URI
    if (uriBytes) {
      data.writeUInt8(1, offset); // Some variant
      offset += 1;
      data.writeUInt32LE(uriBytes.length, offset);
      offset += 4;
      uriBytes.copy(data, offset);
      offset += uriBytes.length;
    } else {
      data.writeUInt8(0, offset); // None variant
      offset += 1;
    }

    // Optional total value
    if (params.totalValue) {
      data.writeUInt8(1, offset);
      offset += 1;
      params.totalValue.toArrayLike(Buffer, "le", 8).copy(data, offset);
    } else {
      data.writeUInt8(0, offset);
    }

    return new TransactionInstruction({
      keys: [
        { pubkey: assetPda, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create activate asset instruction
   */
  private async createActivateAssetInstruction(
    mint: PublicKey,
  ): Promise<TransactionInstruction> {
    const [assetPda] = deriveAsset(mint);

    const data = Buffer.alloc(8);
    // Activate asset discriminator
    const discriminator = Buffer.from([214, 62, 202, 98, 187, 47, 68, 119]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: assetPda, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create freeze asset instruction
   */
  private async createFreezeAssetInstruction(
    mint: PublicKey,
  ): Promise<TransactionInstruction> {
    const [assetPda] = deriveAsset(mint);

    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([169, 244, 114, 127, 126, 185, 125, 28]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: assetPda, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create unfreeze asset instruction
   */
  private async createUnfreezeAssetInstruction(
    mint: PublicKey,
  ): Promise<TransactionInstruction> {
    const [assetPda] = deriveAsset(mint);

    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([217, 39, 139, 168, 92, 108, 2, 218]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: assetPda, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create burn asset instruction
   */
  private async createBurnAssetInstruction(
    mint: PublicKey,
  ): Promise<TransactionInstruction> {
    const [assetPda] = deriveAsset(mint);
    const [configPda] = deriveAssetRegistryConfig();

    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([116, 215, 164, 116, 229, 80, 226, 229]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: assetPda, isSigner: false, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create token mint instruction
   */
  private async createTokenMintInstruction(
    params: CreateTokenMintParams,
    mint: PublicKey,
    permanentDelegate: PublicKey,
  ): Promise<TransactionInstruction> {
    const [mintConfigPda] = deriveMintConfig(mint);
    const [mintAuthority] = deriveMintAuthority(mint);

    const nameBytes = Buffer.from(params.name, "utf8");
    const symbolBytes = Buffer.from(params.symbol, "utf8");
    const uriBytes = Buffer.from(params.uri, "utf8");

    const dataSize =
      8 + // discriminator
      4 +
      nameBytes.length + // name
      4 +
      symbolBytes.length + // symbol
      4 +
      uriBytes.length + // uri
      1 + // decimals
      1 +
      (params.transferHookProgram ? 32 : 0); // optional transfer hook

    const data = Buffer.alloc(dataSize);
    let offset = 0;

    const discriminator = Buffer.from([28, 227, 157, 226, 144, 31, 48, 125]);
    discriminator.copy(data, offset);
    offset += 8;

    // Name
    data.writeUInt32LE(nameBytes.length, offset);
    offset += 4;
    nameBytes.copy(data, offset);
    offset += nameBytes.length;

    // Symbol
    data.writeUInt32LE(symbolBytes.length, offset);
    offset += 4;
    symbolBytes.copy(data, offset);
    offset += symbolBytes.length;

    // URI
    data.writeUInt32LE(uriBytes.length, offset);
    offset += 4;
    uriBytes.copy(data, offset);
    offset += uriBytes.length;

    // Decimals
    data.writeUInt8(params.decimals, offset);
    offset += 1;

    // Transfer hook program (optional)
    if (params.transferHookProgram) {
      data.writeUInt8(1, offset);
      offset += 1;
      params.transferHookProgram.toBuffer().copy(data, offset);
    } else {
      data.writeUInt8(0, offset);
    }

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: permanentDelegate, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: mintConfigPda, isSigner: false, isWritable: true },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create mint tokens instruction
   */
  private async createMintTokensInstruction(
    mint: PublicKey,
    recipient: PublicKey,
    recipientTokenAccount: PublicKey,
    amount: BN,
  ): Promise<TransactionInstruction> {
    const [mintConfigPda] = deriveMintConfig(mint);
    const [mintAuthority] = deriveMintAuthority(mint);

    const data = Buffer.alloc(16);
    const discriminator = Buffer.from([59, 132, 24, 246, 122, 115, 207, 87]);
    discriminator.copy(data, 0);
    amount.toArrayLike(Buffer, "le", 8).copy(data, 8);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: mintConfigPda, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: recipient, isSigner: false, isWritable: false },
        { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }
}
