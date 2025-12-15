import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AssetRegistry } from "../target/types/asset_registry";
import { Escrow } from "../target/types/escrow";
import { Auction } from "../target/types/auction";
import { Compliance } from "../target/types/compliance";
import { 
  Keypair, 
  PublicKey, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import { 
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

/**
 * Integration Tests
 * 
 * Tests end-to-end flows across all programs:
 * 1. Asset tokenization flow
 * 2. Compliant transfer flow
 * 3. Escrow purchase flow
 * 4. Auction flow
 */
describe("integration", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const assetRegistryProgram = anchor.workspace.AssetRegistry as Program<AssetRegistry>;
  const escrowProgram = anchor.workspace.Escrow as Program<Escrow>;
  const auctionProgram = anchor.workspace.Auction as Program<Auction>;
  const complianceProgram = anchor.workspace.Compliance as Program<Compliance>;

  // Participants
  const bank = Keypair.generate();
  const investor1 = Keypair.generate();
  const investor2 = Keypair.generate();

  // Mints and accounts
  let assetMint: PublicKey;
  let usdcMint: PublicKey;
  let bankAssetAccount: PublicKey;
  let investor1AssetAccount: PublicKey;
  let investor1UsdcAccount: PublicKey;
  let investor2AssetAccount: PublicKey;
  let investor2UsdcAccount: PublicKey;

  // PDAs
  let assetRegistryConfigPda: PublicKey;
  let complianceConfigPda: PublicKey;
  let assetPda: PublicKey;
  let mintConfigPda: PublicKey;
  let investor1WhitelistPda: PublicKey;
  let investor2WhitelistPda: PublicKey;
  let bankWhitelistPda: PublicKey;

  before(async () => {
    // Airdrop SOL to all participants
    for (const wallet of [bank, investor1, investor2]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(wallet.publicKey, 20 * LAMPORTS_PER_SOL)
      );
    }

    // Create USDC-like payment mint
    usdcMint = await createMint(
      provider.connection,
      bank,
      bank.publicKey,
      null,
      6,
      Keypair.generate(),
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    // Create investor USDC accounts and mint tokens
    investor1UsdcAccount = await createAssociatedTokenAccount(
      provider.connection,
      investor1,
      usdcMint,
      investor1.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    investor2UsdcAccount = await createAssociatedTokenAccount(
      provider.connection,
      investor2,
      usdcMint,
      investor2.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    await mintTo(
      provider.connection,
      bank,
      usdcMint,
      investor1UsdcAccount,
      bank,
      100_000_000_000, // 100,000 USDC
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    await mintTo(
      provider.connection,
      bank,
      usdcMint,
      investor2UsdcAccount,
      bank,
      100_000_000_000, // 100,000 USDC
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    // Derive PDAs
    [assetRegistryConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      assetRegistryProgram.programId
    );

    [complianceConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("compliance-config")],
      complianceProgram.programId
    );

    [investor1WhitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), investor1.publicKey.toBuffer()],
      complianceProgram.programId
    );

    [investor2WhitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), investor2.publicKey.toBuffer()],
      complianceProgram.programId
    );

    [bankWhitelistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), bank.publicKey.toBuffer()],
      complianceProgram.programId
    );
  });

  describe("1. Initial Setup", () => {
    it("initializes asset registry", async () => {
      await assetRegistryProgram.methods
        .initialize(250) // 2.5% platform fee
        .accounts({
          config: assetRegistryConfigPda,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await assetRegistryProgram.account.config.fetch(assetRegistryConfigPda);
      expect(config.platformFeeBps).to.equal(250);
    });

    it("initializes compliance program", async () => {
      const civicGatekeeperNetwork = Keypair.generate().publicKey;

      await complianceProgram.methods
        .initialize(
          civicGatekeeperNetwork,
          new anchor.BN(10_000_000_000), // 10,000 USDC max transfer
          new anchor.BN(0) // No cooldown for testing
        )
        .accounts({
          authority: provider.wallet.publicKey,
          config: complianceConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await complianceProgram.account.complianceConfig.fetch(complianceConfigPda);
      expect(config.isPaused).to.equal(false);
    });

    it("whitelists bank and investors", async () => {
      const kycExpiry = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const usJurisdiction = [0x55, 0x53] as [number, number];

      // Whitelist bank
      await complianceProgram.methods
        .addToWhitelist(bank.publicKey, { institutional: {} }, usJurisdiction, new anchor.BN(kycExpiry))
        .accounts({
          authority: provider.wallet.publicKey,
          config: complianceConfigPda,
          whitelistEntry: bankWhitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Whitelist investor1
      await complianceProgram.methods
        .addToWhitelist(investor1.publicKey, { accredited: {} }, usJurisdiction, new anchor.BN(kycExpiry))
        .accounts({
          authority: provider.wallet.publicKey,
          config: complianceConfigPda,
          whitelistEntry: investor1WhitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Whitelist investor2
      await complianceProgram.methods
        .addToWhitelist(investor2.publicKey, { accredited: {} }, usJurisdiction, new anchor.BN(kycExpiry))
        .accounts({
          authority: provider.wallet.publicKey,
          config: complianceConfigPda,
          whitelistEntry: investor2WhitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await complianceProgram.account.complianceConfig.fetch(complianceConfigPda);
      expect(config.totalWhitelisted.toNumber()).to.equal(3);
    });
  });

  describe("2. Asset Tokenization Flow", () => {
    it("creates asset token mint", async () => {
      // Create the Token-2022 mint for the asset
      assetMint = await createMint(
        provider.connection,
        bank,
        bank.publicKey,
        null,
        6, // 6 decimals
        Keypair.generate(),
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      [mintConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint-config"), assetMint.toBuffer()],
        assetRegistryProgram.programId
      );

      const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint-authority"), assetMint.toBuffer()],
        assetRegistryProgram.programId
      );

      await assetRegistryProgram.methods
        .createTokenMint(
          "Commercial RE Token",
          "CRT",
          "https://arweave.net/commercial-re-metadata",
          6,
          complianceProgram.programId // Set compliance program as transfer hook
        )
        .accounts({
          authority: provider.wallet.publicKey,
          permanentDelegate: provider.wallet.publicKey,
          mint: assetMint,
          mintConfig: mintConfigPda,
          mintAuthority: mintAuthorityPda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const mintConfig = await assetRegistryProgram.account.mintConfig.fetch(mintConfigPda);
      expect(mintConfig.name).to.equal("Commercial RE Token");
      expect(mintConfig.symbol).to.equal("CRT");
    });

    it("registers the asset", async () => {
      [assetPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("asset"), assetMint.toBuffer()],
        assetRegistryProgram.programId
      );

      await assetRegistryProgram.methods
        .registerAsset(
          "Downtown Commercial Building",
          { realEstate: {} },
          new anchor.BN(10_000_000_00), // $10M
          new anchor.BN(1_000_000_000_000), // 1M tokens (6 decimals)
          "https://arweave.net/asset-docs-hash"
        )
        .accounts({
          config: assetRegistryConfigPda,
          asset: assetPda,
          mint: assetMint,
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const asset = await assetRegistryProgram.account.asset.fetch(assetPda);
      expect(asset.name).to.equal("Downtown Commercial Building");
      expect(asset.status).to.deep.equal({ pending: {} });
    });

    it("activates the asset", async () => {
      await assetRegistryProgram.methods
        .activateAsset()
        .accounts({
          asset: assetPda,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      const asset = await assetRegistryProgram.account.asset.fetch(assetPda);
      expect(asset.status).to.deep.equal({ active: {} });
    });

    it("creates token accounts and mints tokens to bank", async () => {
      bankAssetAccount = await createAssociatedTokenAccount(
        provider.connection,
        bank,
        assetMint,
        bank.publicKey,
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      await mintTo(
        provider.connection,
        bank,
        assetMint,
        bankAssetAccount,
        bank,
        1_000_000_000_000, // 1M tokens
        [],
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      const balance = await getAccount(
        provider.connection,
        bankAssetAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(balance.amount)).to.equal(1_000_000_000_000);
    });
  });

  describe("3. Direct Purchase via Escrow", () => {
    let escrowPda: PublicKey;
    let escrowAssetVault: PublicKey;
    let escrowPaymentVault: PublicKey;
    const purchaseAmount = new anchor.BN(100_000_000_000); // 100,000 tokens
    const purchasePrice = new anchor.BN(1_000_000_000); // 1,000 USDC

    before(async () => {
      // Create investor1's asset account
      investor1AssetAccount = await createAssociatedTokenAccount(
        provider.connection,
        investor1,
        assetMint,
        investor1.publicKey,
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          investor1.publicKey.toBuffer(),
          assetMint.toBuffer(),
        ],
        escrowProgram.programId
      );

      escrowAssetVault = await getAssociatedTokenAddress(
        assetMint,
        escrowPda,
        true,
        TOKEN_2022_PROGRAM_ID
      );

      escrowPaymentVault = await getAssociatedTokenAddress(
        usdcMint,
        escrowPda,
        true,
        TOKEN_2022_PROGRAM_ID
      );
    });

    it("creates escrow for token purchase", async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;

      await escrowProgram.methods
        .createEscrow(purchaseAmount, purchasePrice, new anchor.BN(expiresAt))
        .accounts({
          escrow: escrowPda,
          buyer: investor1.publicKey,
          seller: bank.publicKey,
          assetMint: assetMint,
          paymentMint: usdcMint,
          systemProgram: SystemProgram.programId,
        })
        .signers([investor1])
        .rpc();

      const escrow = await escrowProgram.account.escrow.fetch(escrowPda);
      expect(escrow.buyer.toString()).to.equal(investor1.publicKey.toString());
      expect(escrow.seller.toString()).to.equal(bank.publicKey.toString());
    });

    it("buyer deposits payment", async () => {
      // Create bank's USDC account
      const bankUsdcAccount = await createAssociatedTokenAccount(
        provider.connection,
        bank,
        usdcMint,
        bank.publicKey,
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      await escrowProgram.methods
        .depositPayment()
        .accounts({
          escrow: escrowPda,
          buyer: investor1.publicKey,
          paymentMint: usdcMint,
          buyerPaymentAccount: investor1UsdcAccount,
          escrowPaymentVault: escrowPaymentVault,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([investor1])
        .rpc();

      const escrow = await escrowProgram.account.escrow.fetch(escrowPda);
      expect(escrow.status).to.deep.equal({ paymentDeposited: {} });
    });

    it("seller deposits assets", async () => {
      await escrowProgram.methods
        .depositAsset()
        .accounts({
          escrow: escrowPda,
          seller: bank.publicKey,
          assetMint: assetMint,
          sellerAssetAccount: bankAssetAccount,
          escrowAssetVault: escrowAssetVault,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([bank])
        .rpc();

      const escrow = await escrowProgram.account.escrow.fetch(escrowPda);
      expect(escrow.status).to.deep.equal({ fullyFunded: {} });
    });

    it("releases escrow and completes purchase", async () => {
      const bankUsdcAccount = await getAssociatedTokenAddress(
        usdcMint,
        bank.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      await escrowProgram.methods
        .release()
        .accounts({
          escrow: escrowPda,
          buyer: investor1.publicKey,
          seller: bank.publicKey,
          assetMint: assetMint,
          paymentMint: usdcMint,
          escrowAssetVault: escrowAssetVault,
          escrowPaymentVault: escrowPaymentVault,
          buyerAssetAccount: investor1AssetAccount,
          sellerPaymentAccount: bankUsdcAccount,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      // Verify investor1 received tokens
      const investor1Balance = await getAccount(
        provider.connection,
        investor1AssetAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(investor1Balance.amount)).to.equal(purchaseAmount.toNumber());
    });
  });

  describe("4. Secondary Market Auction", () => {
    let auctionPda: PublicKey;
    let auctionAssetVault: PublicKey;
    let auctionPaymentVault: PublicKey;
    const auctionAmount = new anchor.BN(50_000_000_000); // 50,000 tokens
    const startingPrice = new anchor.BN(400_000_000); // 400 USDC
    const reservePrice = new anchor.BN(450_000_000); // 450 USDC

    before(async () => {
      // Create investor2's asset account
      investor2AssetAccount = await createAssociatedTokenAccount(
        provider.connection,
        investor2,
        assetMint,
        investor2.publicKey,
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      const auctionCreatedAt = Math.floor(Date.now() / 1000);
      
      [auctionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("auction"),
          investor1.publicKey.toBuffer(),
          assetMint.toBuffer(),
          new anchor.BN(auctionCreatedAt).toArrayLike(Buffer, "le", 8),
        ],
        auctionProgram.programId
      );

      auctionAssetVault = await getAssociatedTokenAddress(
        assetMint,
        auctionPda,
        true,
        TOKEN_2022_PROGRAM_ID
      );

      auctionPaymentVault = await getAssociatedTokenAddress(
        usdcMint,
        auctionPda,
        true,
        TOKEN_2022_PROGRAM_ID
      );
    });

    it("investor1 creates auction to sell portion of holdings", async () => {
      const startTime = Math.floor(Date.now() / 1000) + 10; // 10 seconds from now
      const endTime = startTime + 7200; // 2 hours

      await auctionProgram.methods
        .createAuction(
          auctionAmount,
          startingPrice,
          reservePrice,
          new anchor.BN(10_000_000), // 10 USDC min increment
          new anchor.BN(startTime),
          new anchor.BN(endTime)
        )
        .accounts({
          seller: investor1.publicKey,
          auction: auctionPda,
          assetMint: assetMint,
          paymentMint: usdcMint,
          sellerAssetAccount: investor1AssetAccount,
          auctionAssetVault: auctionAssetVault,
          auctionPaymentVault: auctionPaymentVault,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([investor1])
        .rpc();

      const auction = await auctionProgram.account.auction.fetch(auctionPda);
      expect(auction.seller.toString()).to.equal(investor1.publicKey.toString());
      expect(auction.status).to.deep.equal({ active: {} });
    });

    it("investor2 places a bid", async () => {
      // Wait for auction to start
      await new Promise(resolve => setTimeout(resolve, 12000));

      const bidAmount = new anchor.BN(450_000_000); // 450 USDC (meets reserve)

      const [bid2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bid"), auctionPda.toBuffer(), investor2.publicKey.toBuffer()],
        auctionProgram.programId
      );

      await auctionProgram.methods
        .placeBid(bidAmount)
        .accounts({
          bidder: investor2.publicKey,
          auction: auctionPda,
          bid: bid2Pda,
          paymentMint: usdcMint,
          bidderPaymentAccount: investor2UsdcAccount,
          auctionPaymentVault: auctionPaymentVault,
          previousBidderPaymentAccount: investor2UsdcAccount, // Dummy for first bid
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([investor2])
        .rpc();

      const auction = await auctionProgram.account.auction.fetch(auctionPda);
      expect(auction.currentBid.toNumber()).to.equal(bidAmount.toNumber());
      expect(auction.currentBidder.toString()).to.equal(investor2.publicKey.toString());
    });
  });

  describe("5. Compliance Enforcement", () => {
    it("validates compliant transfer between whitelisted addresses", async () => {
      const transferAmount = new anchor.BN(1_000_000_000); // 1,000 USDC equivalent

      await complianceProgram.methods
        .transferHook(transferAmount)
        .accounts({
          config: complianceConfigPda,
          sender: investor1.publicKey,
          receiver: investor2.publicKey,
          senderWhitelist: investor1WhitelistPda,
          receiverWhitelist: investor2WhitelistPda,
          senderBlacklist: null,
          receiverBlacklist: null,
          jurisdictionRule: null,
        })
        .rpc();

      // Transfer validated successfully
    });

    it("blocks transfer to non-whitelisted address", async () => {
      const nonWhitelisted = Keypair.generate().publicKey;
      const [nonWhitelistedPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), nonWhitelisted.toBuffer()],
        complianceProgram.programId
      );

      try {
        await complianceProgram.methods
          .transferHook(new anchor.BN(1_000_000_000))
          .accounts({
            config: complianceConfigPda,
            sender: investor1.publicKey,
            receiver: nonWhitelisted,
            senderWhitelist: investor1WhitelistPda,
            receiverWhitelist: null, // Not whitelisted
            senderBlacklist: null,
            receiverBlacklist: null,
            jurisdictionRule: null,
          })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("ReceiverNotWhitelisted");
      }
    });

    it("can freeze and unfreeze the asset mint", async () => {
      await assetRegistryProgram.methods
        .freezeMint()
        .accounts({
          authority: provider.wallet.publicKey,
          mintConfig: mintConfigPda,
        })
        .rpc();

      let mintConfig = await assetRegistryProgram.account.mintConfig.fetch(mintConfigPda);
      expect(mintConfig.isFrozen).to.equal(true);

      await assetRegistryProgram.methods
        .unfreezeMint()
        .accounts({
          authority: provider.wallet.publicKey,
          mintConfig: mintConfigPda,
        })
        .rpc();

      mintConfig = await assetRegistryProgram.account.mintConfig.fetch(mintConfigPda);
      expect(mintConfig.isFrozen).to.equal(false);
    });
  });

  describe("6. Asset Lifecycle", () => {
    it("can freeze and unfreeze an asset", async () => {
      await assetRegistryProgram.methods
        .freezeAsset()
        .accounts({
          asset: assetPda,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      let asset = await assetRegistryProgram.account.asset.fetch(assetPda);
      expect(asset.status).to.deep.equal({ frozen: {} });

      await assetRegistryProgram.methods
        .unfreezeAsset()
        .accounts({
          asset: assetPda,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      asset = await assetRegistryProgram.account.asset.fetch(assetPda);
      expect(asset.status).to.deep.equal({ active: {} });
    });

    it("can update asset valuation", async () => {
      const newValue = new anchor.BN(12_000_000_00); // $12M (20% increase)

      await assetRegistryProgram.methods
        .updateAsset(null, newValue)
        .accounts({
          asset: assetPda,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      const asset = await assetRegistryProgram.account.asset.fetch(assetPda);
      expect(asset.totalValue.toNumber()).to.equal(newValue.toNumber());
    });
  });
});
