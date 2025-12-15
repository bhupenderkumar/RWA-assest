import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
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

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Escrow>;
  
  const buyer = Keypair.generate();
  const seller = Keypair.generate();
  
  let assetMint: PublicKey;
  let paymentMint: PublicKey;
  let escrowPda: PublicKey;
  let escrowBump: number;
  
  let buyerPaymentAccount: PublicKey;
  let sellerAssetAccount: PublicKey;
  let escrowPaymentVault: PublicKey;
  let escrowAssetVault: PublicKey;

  const assetAmount = new anchor.BN(100);
  const paymentAmount = new anchor.BN(1_000_000); // 1 USDC (6 decimals)
  
  before(async () => {
    // Airdrop SOL to buyer and seller
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyer.publicKey, 10 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(seller.publicKey, 10 * LAMPORTS_PER_SOL)
    );

    // Create asset mint (Token-2022)
    assetMint = await createMint(
      provider.connection,
      seller,
      seller.publicKey,
      null,
      6,
      Keypair.generate(),
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    // Create payment mint (USDC-like)
    paymentMint = await createMint(
      provider.connection,
      buyer,
      buyer.publicKey,
      null,
      6,
      Keypair.generate(),
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    // Create token accounts
    sellerAssetAccount = await createAssociatedTokenAccount(
      provider.connection,
      seller,
      assetMint,
      seller.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    buyerPaymentAccount = await createAssociatedTokenAccount(
      provider.connection,
      buyer,
      paymentMint,
      buyer.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    // Mint tokens to seller (assets) and buyer (payment)
    await mintTo(
      provider.connection,
      seller,
      assetMint,
      sellerAssetAccount,
      seller,
      assetAmount.toNumber(),
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    await mintTo(
      provider.connection,
      buyer,
      paymentMint,
      buyerPaymentAccount,
      buyer,
      paymentAmount.toNumber(),
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    // Derive escrow PDA
    [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        buyer.publicKey.toBuffer(),
        assetMint.toBuffer(),
      ],
      program.programId
    );

    // Get escrow vault addresses
    escrowPaymentVault = await getAssociatedTokenAddress(
      paymentMint,
      escrowPda,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    escrowAssetVault = await getAssociatedTokenAddress(
      assetMint,
      escrowPda,
      true,
      TOKEN_2022_PROGRAM_ID
    );
  });

  describe("create_escrow", () => {
    it("creates a new escrow", async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await program.methods
        .createEscrow(assetAmount, paymentAmount, new anchor.BN(expiresAt))
        .accounts({
          escrow: escrowPda,
          buyer: buyer.publicKey,
          seller: seller.publicKey,
          assetMint: assetMint,
          paymentMint: paymentMint,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      const escrow = await program.account.escrow.fetch(escrowPda);
      
      expect(escrow.buyer.toString()).to.equal(buyer.publicKey.toString());
      expect(escrow.seller.toString()).to.equal(seller.publicKey.toString());
      expect(escrow.assetMint.toString()).to.equal(assetMint.toString());
      expect(escrow.paymentMint.toString()).to.equal(paymentMint.toString());
      expect(escrow.assetAmount.toNumber()).to.equal(assetAmount.toNumber());
      expect(escrow.paymentAmount.toNumber()).to.equal(paymentAmount.toNumber());
      expect(escrow.status).to.deep.equal({ created: {} });
    });

    it("fails with zero asset amount", async () => {
      const newAssetMint = await createMint(
        provider.connection,
        seller,
        seller.publicKey,
        null,
        6,
        Keypair.generate(),
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      const [badEscrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          buyer.publicKey.toBuffer(),
          newAssetMint.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .createEscrow(
            new anchor.BN(0), // Zero amount
            paymentAmount, 
            new anchor.BN(Math.floor(Date.now() / 1000) + 3600)
          )
          .accounts({
            escrow: badEscrowPda,
            buyer: buyer.publicKey,
            seller: seller.publicKey,
            assetMint: newAssetMint,
            paymentMint: paymentMint,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("InvalidAmount");
      }
    });

    it("fails with past expiration", async () => {
      const newAssetMint = await createMint(
        provider.connection,
        seller,
        seller.publicKey,
        null,
        6,
        Keypair.generate(),
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      const [badEscrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          buyer.publicKey.toBuffer(),
          newAssetMint.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .createEscrow(
            assetAmount,
            paymentAmount, 
            new anchor.BN(Math.floor(Date.now() / 1000) - 3600) // Past expiration
          )
          .accounts({
            escrow: badEscrowPda,
            buyer: buyer.publicKey,
            seller: seller.publicKey,
            assetMint: newAssetMint,
            paymentMint: paymentMint,
            systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("InvalidExpiration");
      }
    });
  });

  describe("deposit_payment", () => {
    it("deposits payment tokens from buyer to escrow", async () => {
      const buyerBalanceBefore = await getAccount(
        provider.connection,
        buyerPaymentAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );

      await program.methods
        .depositPayment()
        .accounts({
          escrow: escrowPda,
          buyer: buyer.publicKey,
          paymentMint: paymentMint,
          buyerPaymentAccount: buyerPaymentAccount,
          escrowPaymentVault: escrowPaymentVault,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      const escrow = await program.account.escrow.fetch(escrowPda);
      expect(escrow.status).to.deep.equal({ paymentDeposited: {} });

      const vaultBalance = await getAccount(
        provider.connection,
        escrowPaymentVault,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(vaultBalance.amount)).to.equal(paymentAmount.toNumber());
    });
  });

  describe("deposit_asset", () => {
    it("deposits asset tokens from seller to escrow", async () => {
      await program.methods
        .depositAsset()
        .accounts({
          escrow: escrowPda,
          seller: seller.publicKey,
          assetMint: assetMint,
          sellerAssetAccount: sellerAssetAccount,
          escrowAssetVault: escrowAssetVault,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller])
        .rpc();

      const escrow = await program.account.escrow.fetch(escrowPda);
      expect(escrow.status).to.deep.equal({ fullyFunded: {} });

      const vaultBalance = await getAccount(
        provider.connection,
        escrowAssetVault,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(vaultBalance.amount)).to.equal(assetAmount.toNumber());
    });
  });

  describe("release", () => {
    let buyerAssetAccount: PublicKey;
    let sellerPaymentAccount: PublicKey;

    before(async () => {
      // Create buyer's asset account
      buyerAssetAccount = await createAssociatedTokenAccount(
        provider.connection,
        buyer,
        assetMint,
        buyer.publicKey,
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      // Create seller's payment account
      sellerPaymentAccount = await createAssociatedTokenAccount(
        provider.connection,
        seller,
        paymentMint,
        seller.publicKey,
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );
    });

    it("releases escrow and completes the swap", async () => {
      await program.methods
        .release()
        .accounts({
          escrow: escrowPda,
          buyer: buyer.publicKey,
          seller: seller.publicKey,
          assetMint: assetMint,
          paymentMint: paymentMint,
          escrowAssetVault: escrowAssetVault,
          escrowPaymentVault: escrowPaymentVault,
          buyerAssetAccount: buyerAssetAccount,
          sellerPaymentAccount: sellerPaymentAccount,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      // Check buyer received assets
      const buyerAssets = await getAccount(
        provider.connection,
        buyerAssetAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(buyerAssets.amount)).to.equal(assetAmount.toNumber());

      // Check seller received payment
      const sellerPayment = await getAccount(
        provider.connection,
        sellerPaymentAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(sellerPayment.amount)).to.equal(paymentAmount.toNumber());

      // Check escrow status
      const escrow = await program.account.escrow.fetch(escrowPda);
      expect(escrow.status).to.deep.equal({ completed: {} });
    });
  });

  describe("cancel", () => {
    let newEscrowPda: PublicKey;
    let newAssetMint: PublicKey;

    before(async () => {
      // Create a new escrow for cancellation test
      newAssetMint = await createMint(
        provider.connection,
        seller,
        seller.publicKey,
        null,
        6,
        Keypair.generate(),
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      [newEscrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          buyer.publicKey.toBuffer(),
          newAssetMint.toBuffer(),
        ],
        program.programId
      );

      const expiresAt = Math.floor(Date.now() / 1000) + 3600;

      await program.methods
        .createEscrow(assetAmount, paymentAmount, new anchor.BN(expiresAt))
        .accounts({
          escrow: newEscrowPda,
          buyer: buyer.publicKey,
          seller: seller.publicKey,
          assetMint: newAssetMint,
          paymentMint: paymentMint,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
    });

    it("cancels an escrow before deposits", async () => {
      await program.methods
        .cancel()
        .accounts({
          escrow: newEscrowPda,
          authority: buyer.publicKey,
        })
        .signers([buyer])
        .rpc();

      const escrow = await program.account.escrow.fetch(newEscrowPda);
      expect(escrow.status).to.deep.equal({ cancelled: {} });
    });
  });
});
