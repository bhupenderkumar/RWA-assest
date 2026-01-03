import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  AUCTION_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MIN_AUCTION_DURATION,
} from "../constants";
import {
  Auction,
  Bid,
  AuctionStatus,
  CreateAuctionParams,
  PlaceBidParams,
  InvalidParameterError,
} from "../types";
import {
  deriveAuction,
  deriveBid,
  deserializeAuction,
  deserializeBid,
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
 * Client for interacting with the Auction program
 *
 * @example
 * ```typescript
 * const client = new AuctionClient(connection, wallet);
 *
 * // Create an auction
 * const { signature, auctionAddress } = await client.createAuction({
 *   assetMint: assetMintPubkey,
 *   paymentMint: usdcMintPubkey,
 *   assetAmount: new BN(1000),
 *   startingPrice: new BN(100_00), // $1.00 per token
 *   reservePrice: new BN(150_00), // $1.50 minimum
 *   minBidIncrement: new BN(10_00), // $0.10 increment
 *   startTime: new BN(Date.now() / 1000),
 *   endTime: new BN(Date.now() / 1000 + 86400), // 24 hours
 * });
 *
 * // Place a bid
 * await client.placeBid(auctionAddress, new BN(200_00)); // $2.00 per token
 *
 * // Settle auction
 * await client.settleAuction(auctionAddress);
 * ```
 */
export class AuctionClient {
  private connection: Connection;
  private wallet: WalletAdapter;
  private provider: AnchorProvider | null = null;
  private programId: PublicKey;

  constructor(
    connection: Connection,
    wallet: WalletAdapter,
    programId: PublicKey = AUCTION_PROGRAM_ID,
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
   * Get an auction by seller, asset mint, and creation time
   */
  async getAuction(
    seller: PublicKey,
    assetMint: PublicKey,
    createdAt: BN,
  ): Promise<Auction> {
    const [auctionPda] = deriveAuction(seller, assetMint, createdAt);
    return fetchAccount(
      this.connection,
      auctionPda,
      deserializeAuction,
      "Auction",
    );
  }

  /**
   * Get an auction by its PDA address
   */
  async getAuctionByAddress(address: PublicKey): Promise<Auction> {
    return fetchAccount(
      this.connection,
      address,
      deserializeAuction,
      "Auction",
    );
  }

  /**
   * Get the current state of an auction
   */
  async getAuctionState(address: PublicKey): Promise<{
    auction: Auction;
    isActive: boolean;
    isEnded: boolean;
    timeRemaining: number;
    currentHighBid: BN;
  }> {
    const auction = await this.getAuctionByAddress(address);
    const currentTime = Math.floor(Date.now() / 1000);

    const isActive =
      auction.status === AuctionStatus.Active &&
      currentTime >= auction.startTime.toNumber() &&
      currentTime < auction.endTime.toNumber();

    const isEnded = currentTime >= auction.endTime.toNumber();
    const timeRemaining = Math.max(0, auction.endTime.toNumber() - currentTime);

    return {
      auction,
      isActive,
      isEnded,
      timeRemaining,
      currentHighBid: auction.currentBid,
    };
  }

  /**
   * Get a bid by auction and bidder
   */
  async getBid(auction: PublicKey, bidder: PublicKey): Promise<Bid> {
    const [bidPda] = deriveBid(auction, bidder);
    return fetchAccount(this.connection, bidPda, deserializeBid, "Bid");
  }

  /**
   * List all auctions
   */
  async listAuctions(): Promise<{ pubkey: PublicKey; account: Auction }[]> {
    return getProgramAccounts(
      this.connection,
      this.programId,
      deserializeAuction,
      [],
    );
  }

  /**
   * List auctions by seller
   */
  async listAuctionsBySeller(
    seller: PublicKey,
  ): Promise<{ pubkey: PublicKey; account: Auction }[]> {
    return getProgramAccounts(
      this.connection,
      this.programId,
      deserializeAuction,
      [createMemcmpFilter(8, seller)],
    );
  }

  /**
   * List active auctions
   */
  async listActiveAuctions(): Promise<
    { pubkey: PublicKey; account: Auction }[]
  > {
    const allAuctions = await this.listAuctions();
    const currentTime = Math.floor(Date.now() / 1000);

    return allAuctions.filter(
      (a) =>
        a.account.status === AuctionStatus.Active &&
        currentTime >= a.account.startTime.toNumber() &&
        currentTime < a.account.endTime.toNumber(),
    );
  }

  /**
   * List auctions by status
   */
  async listAuctionsByStatus(
    status: AuctionStatus,
  ): Promise<{ pubkey: PublicKey; account: Auction }[]> {
    const allAuctions = await this.listAuctions();
    return allAuctions.filter((a) => a.account.status === status);
  }

  /**
   * List bids for an auction
   */
  async listBidsForAuction(
    auction: PublicKey,
  ): Promise<{ pubkey: PublicKey; account: Bid }[]> {
    return getProgramAccounts(this.connection, this.programId, deserializeBid, [
      createMemcmpFilter(8, auction),
    ]);
  }

  /**
   * List bids by bidder
   */
  async listBidsByBidder(
    bidder: PublicKey,
  ): Promise<{ pubkey: PublicKey; account: Bid }[]> {
    return getProgramAccounts(this.connection, this.programId, deserializeBid, [
      createMemcmpFilter(40, bidder), // offset 8 + 32
    ]);
  }

  /**
   * Check if an auction exists
   */
  async auctionExists(
    seller: PublicKey,
    assetMint: PublicKey,
    createdAt: BN,
  ): Promise<boolean> {
    const [auctionPda] = deriveAuction(seller, assetMint, createdAt);
    return accountExists(this.connection, auctionPda);
  }

  /**
   * Get auction PDA address
   */
  getAuctionAddress(
    seller: PublicKey,
    assetMint: PublicKey,
    createdAt: BN,
  ): PublicKey {
    const [auctionPda] = deriveAuction(seller, assetMint, createdAt);
    return auctionPda;
  }

  /**
   * Get bid PDA address
   */
  getBidAddress(auction: PublicKey, bidder: PublicKey): PublicKey {
    const [bidPda] = deriveBid(auction, bidder);
    return bidPda;
  }

  // ===========================================================================
  // Write Methods
  // ===========================================================================

  /**
   * Create a new auction
   */
  async createAuction(
    params: CreateAuctionParams,
    sellerAssetAccount: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<{ signature: string; auctionAddress: PublicKey; createdAt: BN }> {
    // Validate parameters
    if (params.assetAmount.lten(0)) {
      throw new InvalidParameterError(
        "assetAmount",
        "Asset amount must be positive",
      );
    }
    if (params.startingPrice.lten(0)) {
      throw new InvalidParameterError(
        "startingPrice",
        "Starting price must be positive",
      );
    }
    if (params.reservePrice.lt(params.startingPrice)) {
      throw new InvalidParameterError(
        "reservePrice",
        "Reserve price must be >= starting price",
      );
    }
    if (params.minBidIncrement.lten(0)) {
      throw new InvalidParameterError(
        "minBidIncrement",
        "Minimum bid increment must be positive",
      );
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (params.startTime.ltn(currentTime)) {
      throw new InvalidParameterError(
        "startTime",
        "Start time must be in the future",
      );
    }
    if (params.endTime.lte(params.startTime)) {
      throw new InvalidParameterError(
        "endTime",
        "End time must be after start time",
      );
    }

    const duration = params.endTime.sub(params.startTime).toNumber();
    if (duration < MIN_AUCTION_DURATION) {
      throw new InvalidParameterError(
        "endTime",
        `Auction duration must be at least ${MIN_AUCTION_DURATION} seconds`,
      );
    }

    const createdAt = new BN(currentTime);
    const [auctionPda] = deriveAuction(
      this.wallet.publicKey,
      params.assetMint,
      createdAt,
    );

    const ix = await this.createCreateAuctionInstruction(
      params,
      sellerAssetAccount,
      createdAt,
    );

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

    return { signature, auctionAddress: auctionPda, createdAt };
  }

  /**
   * Place a bid on an auction
   */
  async placeBid(
    params: PlaceBidParams,
    bidderPaymentAccount: PublicKey,
    auctionPaymentVault: PublicKey,
    paymentMint: PublicKey,
    previousBidderPaymentAccount: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<{ signature: string; bidAddress: PublicKey }> {
    if (params.bidAmount.lten(0)) {
      throw new InvalidParameterError(
        "bidAmount",
        "Bid amount must be positive",
      );
    }

    const [bidPda] = deriveBid(params.auction, this.wallet.publicKey);

    const ix = await this.createPlaceBidInstruction(
      params,
      bidderPaymentAccount,
      auctionPaymentVault,
      paymentMint,
      previousBidderPaymentAccount,
    );

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

    return { signature, bidAddress: bidPda };
  }

  /**
   * Cancel a bid
   */
  async cancelBid(
    auction: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const [bidPda] = deriveBid(auction, this.wallet.publicKey);

    const ix = await this.createCancelBidInstruction(auction, bidPda);

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
   * Settle an auction after it ends
   */
  async settleAuction(
    auction: PublicKey,
    auctionData: Auction,
    auctionAssetVault: PublicKey,
    auctionPaymentVault: PublicKey,
    winnerAssetAccount: PublicKey,
    winnerPaymentAccount: PublicKey,
    sellerAssetAccount: PublicKey,
    sellerPaymentAccount: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createSettleAuctionInstruction(
      auction,
      auctionData,
      auctionAssetVault,
      auctionPaymentVault,
      winnerAssetAccount,
      winnerPaymentAccount,
      sellerAssetAccount,
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
   * Cancel an auction
   */
  async cancelAuction(
    auction: PublicKey,
    auctionData: Auction,
    auctionAssetVault: PublicKey,
    sellerAssetAccount: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createCancelAuctionInstruction(
      auction,
      auctionData,
      auctionAssetVault,
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

  /**
   * Extend an auction end time
   */
  async extendAuction(
    auction: PublicKey,
    newEndTime: BN,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createExtendAuctionInstruction(auction, newEndTime);

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
   * Create auction instruction
   */
  private async createCreateAuctionInstruction(
    params: CreateAuctionParams,
    sellerAssetAccount: PublicKey,
    createdAt: BN,
  ): Promise<TransactionInstruction> {
    const [auctionPda] = deriveAuction(
      this.wallet.publicKey,
      params.assetMint,
      createdAt,
    );

    // Build instruction data
    const data = Buffer.alloc(56);
    let offset = 0;

    // Create auction discriminator
    const discriminator = Buffer.from([234, 146, 119, 228, 52, 243, 113, 175]);
    discriminator.copy(data, offset);
    offset += 8;

    // Asset amount
    params.assetAmount.toArrayLike(Buffer, "le", 8).copy(data, offset);
    offset += 8;

    // Starting price
    params.startingPrice.toArrayLike(Buffer, "le", 8).copy(data, offset);
    offset += 8;

    // Reserve price
    params.reservePrice.toArrayLike(Buffer, "le", 8).copy(data, offset);
    offset += 8;

    // Min bid increment
    params.minBidIncrement.toArrayLike(Buffer, "le", 8).copy(data, offset);
    offset += 8;

    // Start time
    params.startTime.toArrayLike(Buffer, "le", 8).copy(data, offset);
    offset += 8;

    // End time
    params.endTime.toArrayLike(Buffer, "le", 8).copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: auctionPda, isSigner: false, isWritable: true },
        { pubkey: params.assetMint, isSigner: false, isWritable: false },
        { pubkey: params.paymentMint, isSigner: false, isWritable: false },
        { pubkey: sellerAssetAccount, isSigner: false, isWritable: true },
        // Auction asset vault (ATA for auction PDA)
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create place bid instruction
   */
  private async createPlaceBidInstruction(
    params: PlaceBidParams,
    bidderPaymentAccount: PublicKey,
    auctionPaymentVault: PublicKey,
    paymentMint: PublicKey,
    previousBidderPaymentAccount: PublicKey,
  ): Promise<TransactionInstruction> {
    const [bidPda] = deriveBid(params.auction, this.wallet.publicKey);

    const data = Buffer.alloc(16);
    let offset = 0;

    // Place bid discriminator
    const discriminator = Buffer.from([238, 77, 50, 175, 130, 42, 248, 214]);
    discriminator.copy(data, offset);
    offset += 8;

    // Bid amount
    params.bidAmount.toArrayLike(Buffer, "le", 8).copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: params.auction, isSigner: false, isWritable: true },
        { pubkey: bidPda, isSigner: false, isWritable: true },
        { pubkey: paymentMint, isSigner: false, isWritable: false },
        { pubkey: bidderPaymentAccount, isSigner: false, isWritable: true },
        { pubkey: auctionPaymentVault, isSigner: false, isWritable: true },
        {
          pubkey: previousBidderPaymentAccount,
          isSigner: false,
          isWritable: true,
        },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create cancel bid instruction
   */
  private async createCancelBidInstruction(
    auction: PublicKey,
    bid: PublicKey,
  ): Promise<TransactionInstruction> {
    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([64, 99, 116, 233, 95, 11, 53, 209]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: auction, isSigner: false, isWritable: false },
        { pubkey: bid, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create settle auction instruction
   */
  private async createSettleAuctionInstruction(
    auction: PublicKey,
    auctionData: Auction,
    auctionAssetVault: PublicKey,
    auctionPaymentVault: PublicKey,
    winnerAssetAccount: PublicKey,
    winnerPaymentAccount: PublicKey,
    sellerAssetAccount: PublicKey,
    sellerPaymentAccount: PublicKey,
  ): Promise<TransactionInstruction> {
    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([102, 182, 109, 166, 37, 35, 254, 167]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: auction, isSigner: false, isWritable: true },
        { pubkey: auctionData.assetMint, isSigner: false, isWritable: false },
        { pubkey: auctionData.paymentMint, isSigner: false, isWritable: false },
        { pubkey: auctionAssetVault, isSigner: false, isWritable: true },
        { pubkey: auctionPaymentVault, isSigner: false, isWritable: true },
        { pubkey: winnerAssetAccount, isSigner: false, isWritable: true },
        { pubkey: winnerPaymentAccount, isSigner: false, isWritable: true },
        { pubkey: sellerAssetAccount, isSigner: false, isWritable: true },
        { pubkey: sellerPaymentAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create cancel auction instruction
   */
  private async createCancelAuctionInstruction(
    auction: PublicKey,
    auctionData: Auction,
    auctionAssetVault: PublicKey,
    sellerAssetAccount: PublicKey,
  ): Promise<TransactionInstruction> {
    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([140, 244, 78, 254, 118, 242, 206, 227]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: auction, isSigner: false, isWritable: true },
        { pubkey: auctionData.assetMint, isSigner: false, isWritable: false },
        { pubkey: auctionAssetVault, isSigner: false, isWritable: true },
        { pubkey: sellerAssetAccount, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create extend auction instruction
   */
  private async createExtendAuctionInstruction(
    auction: PublicKey,
    newEndTime: BN,
  ): Promise<TransactionInstruction> {
    const data = Buffer.alloc(16);
    let offset = 0;

    const discriminator = Buffer.from([45, 48, 108, 182, 27, 119, 89, 53]);
    discriminator.copy(data, offset);
    offset += 8;

    newEndTime.toArrayLike(Buffer, "le", 8).copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: auction, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });
  }
}
