import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Auction } from "../target/types/auction";
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

describe("auction", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Auction as Program<Auction>;
  
  const seller = Keypair.generate();
  const bidder1 = Keypair.generate();
  const bidder2 = Keypair.generate();
  
  let assetMint: PublicKey;
  let paymentMint: PublicKey;
  let auctionPda: PublicKey;
  let auctionCreatedAt: number;
  
  let sellerAssetAccount: PublicKey;
  let bidder1PaymentAccount: PublicKey;
  let bidder2PaymentAccount: PublicKey;
  let auctionAssetVault: PublicKey;
  let auctionPaymentVault: PublicKey;

  const assetAmount = new anchor.BN(100);
  const startingPrice = new anchor.BN(1_000_000); // 1 USDC
  const reservePrice = new anchor.BN(5_000_000); // 5 USDC
  const minBidIncrement = new anchor.BN(100_000); // 0.1 USDC
  
  before(async () => {
    // Airdrop SOL to all participants
    for (const wallet of [seller, bidder1, bidder2]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(wallet.publicKey, 10 * LAMPORTS_PER_SOL)
      );
    }

    // Create asset mint
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

    // Create payment mint
    paymentMint = await createMint(
      provider.connection,
      seller,
      seller.publicKey,
      null,
      6,
      Keypair.generate(),
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    // Create seller's asset account and mint tokens
    sellerAssetAccount = await createAssociatedTokenAccount(
      provider.connection,
      seller,
      assetMint,
      seller.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

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

    // Create bidder payment accounts and mint payment tokens
    bidder1PaymentAccount = await createAssociatedTokenAccount(
      provider.connection,
      bidder1,
      paymentMint,
      bidder1.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    bidder2PaymentAccount = await createAssociatedTokenAccount(
      provider.connection,
      bidder2,
      paymentMint,
      bidder2.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    await mintTo(
      provider.connection,
      seller,
      paymentMint,
      bidder1PaymentAccount,
      seller,
      10_000_000, // 10 USDC
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    await mintTo(
      provider.connection,
      seller,
      paymentMint,
      bidder2PaymentAccount,
      seller,
      10_000_000, // 10 USDC
      [],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    // Get current time for auction PDA
    auctionCreatedAt = Math.floor(Date.now() / 1000);
  });

  describe("create_auction", () => {
    it("creates a new auction", async () => {
      const startTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
      const endTime = startTime + 7200; // 2 hours duration

      // Derive auction PDA (using created_at timestamp)
      [auctionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("auction"),
          seller.publicKey.toBuffer(),
          assetMint.toBuffer(),
          new anchor.BN(auctionCreatedAt).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      auctionAssetVault = await getAssociatedTokenAddress(
        assetMint,
        auctionPda,
        true,
        TOKEN_2022_PROGRAM_ID
      );

      auctionPaymentVault = await getAssociatedTokenAddress(
        paymentMint,
        auctionPda,
        true,
        TOKEN_2022_PROGRAM_ID
      );

      await program.methods
        .createAuction(
          assetAmount,
          startingPrice,
          reservePrice,
          minBidIncrement,
          new anchor.BN(startTime),
          new anchor.BN(endTime)
        )
        .accounts({
          seller: seller.publicKey,
          auction: auctionPda,
          assetMint: assetMint,
          paymentMint: paymentMint,
          sellerAssetAccount: sellerAssetAccount,
          auctionAssetVault: auctionAssetVault,
          auctionPaymentVault: auctionPaymentVault,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller])
        .rpc();

      const auction = await program.account.auction.fetch(auctionPda);
      
      expect(auction.seller.toString()).to.equal(seller.publicKey.toString());
      expect(auction.assetMint.toString()).to.equal(assetMint.toString());
      expect(auction.assetAmount.toNumber()).to.equal(assetAmount.toNumber());
      expect(auction.startingPrice.toNumber()).to.equal(startingPrice.toNumber());
      expect(auction.reservePrice.toNumber()).to.equal(reservePrice.toNumber());
      expect(auction.minBidIncrement.toNumber()).to.equal(minBidIncrement.toNumber());
      expect(auction.currentBid.toNumber()).to.equal(0);
      expect(auction.status).to.deep.equal({ active: {} });
      expect(auction.totalBids.toNumber()).to.equal(0);

      // Check assets transferred to vault
      const vaultBalance = await getAccount(
        provider.connection,
        auctionAssetVault,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(vaultBalance.amount)).to.equal(assetAmount.toNumber());
    });

    it("fails with auction too short", async () => {
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

      const startTime = Math.floor(Date.now() / 1000) + 60;
      const endTime = startTime + 1800; // Only 30 minutes (min is 1 hour)

      try {
        const [badAuctionPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("auction"),
            seller.publicKey.toBuffer(),
            newAssetMint.toBuffer(),
            new anchor.BN(Math.floor(Date.now() / 1000)).toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

        await program.methods
          .createAuction(
            assetAmount,
            startingPrice,
            reservePrice,
            minBidIncrement,
            new anchor.BN(startTime),
            new anchor.BN(endTime)
          )
          .accounts({
            seller: seller.publicKey,
            auction: badAuctionPda,
            assetMint: newAssetMint,
            paymentMint: paymentMint,
            sellerAssetAccount: sellerAssetAccount,
            auctionAssetVault: await getAssociatedTokenAddress(newAssetMint, badAuctionPda, true, TOKEN_2022_PROGRAM_ID),
            auctionPaymentVault: await getAssociatedTokenAddress(paymentMint, badAuctionPda, true, TOKEN_2022_PROGRAM_ID),
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([seller])
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("AuctionTooShort");
      }
    });

    it("fails with invalid reserve price", async () => {
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

      const startTime = Math.floor(Date.now() / 1000) + 60;
      const endTime = startTime + 7200;

      try {
        const [badAuctionPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("auction"),
            seller.publicKey.toBuffer(),
            newAssetMint.toBuffer(),
            new anchor.BN(Math.floor(Date.now() / 1000)).toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

        await program.methods
          .createAuction(
            assetAmount,
            reservePrice, // Starting price higher than reserve
            startingPrice, // Reserve lower than starting
            minBidIncrement,
            new anchor.BN(startTime),
            new anchor.BN(endTime)
          )
          .accounts({
            seller: seller.publicKey,
            auction: badAuctionPda,
            assetMint: newAssetMint,
            paymentMint: paymentMint,
            sellerAssetAccount: sellerAssetAccount,
            auctionAssetVault: await getAssociatedTokenAddress(newAssetMint, badAuctionPda, true, TOKEN_2022_PROGRAM_ID),
            auctionPaymentVault: await getAssociatedTokenAddress(paymentMint, badAuctionPda, true, TOKEN_2022_PROGRAM_ID),
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([seller])
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("InvalidReservePrice");
      }
    });
  });

  describe("place_bid", () => {
    it("places a valid first bid", async () => {
      const bidAmount = startingPrice.add(new anchor.BN(500_000)); // 1.5 USDC

      const [bid1Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bid"), auctionPda.toBuffer(), bidder1.publicKey.toBuffer()],
        program.programId
      );

      // Wait for auction to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      await program.methods
        .placeBid(bidAmount)
        .accounts({
          bidder: bidder1.publicKey,
          auction: auctionPda,
          bid: bid1Pda,
          paymentMint: paymentMint,
          bidderPaymentAccount: bidder1PaymentAccount,
          auctionPaymentVault: auctionPaymentVault,
          previousBidderPaymentAccount: bidder1PaymentAccount, // Dummy for first bid
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([bidder1])
        .rpc();

      const auction = await program.account.auction.fetch(auctionPda);
      expect(auction.currentBid.toNumber()).to.equal(bidAmount.toNumber());
      expect(auction.currentBidder.toString()).to.equal(bidder1.publicKey.toString());
      expect(auction.totalBids.toNumber()).to.equal(1);

      const bid = await program.account.bid.fetch(bid1Pda);
      expect(bid.bidder.toString()).to.equal(bidder1.publicKey.toString());
      expect(bid.amount.toNumber()).to.equal(bidAmount.toNumber());
      expect(bid.status).to.deep.equal({ active: {} });
    });

    it("fails with bid too low", async () => {
      const lowBid = new anchor.BN(500_000); // 0.5 USDC (below starting)

      const [bid2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bid"), auctionPda.toBuffer(), bidder2.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .placeBid(lowBid)
          .accounts({
            bidder: bidder2.publicKey,
            auction: auctionPda,
            bid: bid2Pda,
            paymentMint: paymentMint,
            bidderPaymentAccount: bidder2PaymentAccount,
            auctionPaymentVault: auctionPaymentVault,
            previousBidderPaymentAccount: bidder1PaymentAccount,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([bidder2])
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("BidTooLow");
      }
    });

    it("places a higher bid and refunds previous bidder", async () => {
      const auction = await program.account.auction.fetch(auctionPda);
      const newBidAmount = auction.currentBid.add(minBidIncrement).add(new anchor.BN(100_000));

      const [bid2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bid"), auctionPda.toBuffer(), bidder2.publicKey.toBuffer()],
        program.programId
      );

      const bidder1BalanceBefore = await getAccount(
        provider.connection,
        bidder1PaymentAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );

      await program.methods
        .placeBid(newBidAmount)
        .accounts({
          bidder: bidder2.publicKey,
          auction: auctionPda,
          bid: bid2Pda,
          paymentMint: paymentMint,
          bidderPaymentAccount: bidder2PaymentAccount,
          auctionPaymentVault: auctionPaymentVault,
          previousBidderPaymentAccount: bidder1PaymentAccount,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([bidder2])
        .rpc();

      const updatedAuction = await program.account.auction.fetch(auctionPda);
      expect(updatedAuction.currentBid.toNumber()).to.equal(newBidAmount.toNumber());
      expect(updatedAuction.currentBidder.toString()).to.equal(bidder2.publicKey.toString());
      expect(updatedAuction.totalBids.toNumber()).to.equal(2);

      // Verify bidder1 was refunded
      const bidder1BalanceAfter = await getAccount(
        provider.connection,
        bidder1PaymentAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(bidder1BalanceAfter.amount)).to.be.greaterThan(Number(bidder1BalanceBefore.amount));
    });
  });

  describe("extend_auction", () => {
    it("extends the auction end time", async () => {
      const auctionBefore = await program.account.auction.fetch(auctionPda);
      const newEndTime = auctionBefore.endTime.add(new anchor.BN(3600)); // +1 hour

      await program.methods
        .extendAuction(newEndTime)
        .accounts({
          seller: seller.publicKey,
          auction: auctionPda,
        })
        .signers([seller])
        .rpc();

      const auctionAfter = await program.account.auction.fetch(auctionPda);
      expect(auctionAfter.endTime.toNumber()).to.equal(newEndTime.toNumber());
    });

    it("fails to extend to earlier time", async () => {
      const auction = await program.account.auction.fetch(auctionPda);
      const earlierEndTime = auction.endTime.sub(new anchor.BN(3600));

      try {
        await program.methods
          .extendAuction(earlierEndTime)
          .accounts({
            seller: seller.publicKey,
            auction: auctionPda,
          })
          .signers([seller])
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("InvalidEndTime");
      }
    });
  });

  describe("cancel_auction", () => {
    let cancelAuctionPda: PublicKey;
    let cancelAssetMint: PublicKey;
    let cancelSellerAssetAccount: PublicKey;
    let cancelAuctionAssetVault: PublicKey;

    before(async () => {
      // Create a new auction for cancellation test
      cancelAssetMint = await createMint(
        provider.connection,
        seller,
        seller.publicKey,
        null,
        6,
        Keypair.generate(),
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      cancelSellerAssetAccount = await createAssociatedTokenAccount(
        provider.connection,
        seller,
        cancelAssetMint,
        seller.publicKey,
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      await mintTo(
        provider.connection,
        seller,
        cancelAssetMint,
        cancelSellerAssetAccount,
        seller,
        assetAmount.toNumber(),
        [],
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );

      const createdAt = Math.floor(Date.now() / 1000);
      [cancelAuctionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("auction"),
          seller.publicKey.toBuffer(),
          cancelAssetMint.toBuffer(),
          new anchor.BN(createdAt).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      cancelAuctionAssetVault = await getAssociatedTokenAddress(
        cancelAssetMint,
        cancelAuctionPda,
        true,
        TOKEN_2022_PROGRAM_ID
      );

      const cancelAuctionPaymentVault = await getAssociatedTokenAddress(
        paymentMint,
        cancelAuctionPda,
        true,
        TOKEN_2022_PROGRAM_ID
      );

      const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const endTime = startTime + 7200;

      await program.methods
        .createAuction(
          assetAmount,
          startingPrice,
          reservePrice,
          minBidIncrement,
          new anchor.BN(startTime),
          new anchor.BN(endTime)
        )
        .accounts({
          seller: seller.publicKey,
          auction: cancelAuctionPda,
          assetMint: cancelAssetMint,
          paymentMint: paymentMint,
          sellerAssetAccount: cancelSellerAssetAccount,
          auctionAssetVault: cancelAuctionAssetVault,
          auctionPaymentVault: cancelAuctionPaymentVault,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller])
        .rpc();
    });

    it("cancels an auction with no bids", async () => {
      const sellerBalanceBefore = await getAccount(
        provider.connection,
        cancelSellerAssetAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );

      await program.methods
        .cancelAuction()
        .accounts({
          authority: seller.publicKey,
          auction: cancelAuctionPda,
          assetMint: cancelAssetMint,
          auctionAssetVault: cancelAuctionAssetVault,
          sellerAssetAccount: cancelSellerAssetAccount,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([seller])
        .rpc();

      const auction = await program.account.auction.fetch(cancelAuctionPda);
      expect(auction.status).to.deep.equal({ cancelled: {} });

      // Verify assets returned to seller
      const sellerBalanceAfter = await getAccount(
        provider.connection,
        cancelSellerAssetAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      expect(Number(sellerBalanceAfter.amount)).to.equal(
        Number(sellerBalanceBefore.amount) + assetAmount.toNumber()
      );
    });
  });
});
