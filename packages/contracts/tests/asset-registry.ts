import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AssetRegistry } from "../target/types/asset_registry";
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
} from "@solana/spl-token";
import { expect } from "chai";

describe("asset-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AssetRegistry as Program<AssetRegistry>;
  
  const authority = provider.wallet as anchor.Wallet;
  let configPda: PublicKey;
  let configBump: number;
  let assetMint: Keypair;
  let assetPda: PublicKey;

  before(async () => {
    // Derive config PDA
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
    
    assetMint = Keypair.generate();
  });

  describe("initialize", () => {
    it("initializes the asset registry config", async () => {
      const platformFeeBps = 250; // 2.5%

      await program.methods
        .initialize(platformFeeBps)
        .accounts({
          config: configPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await program.account.config.fetch(configPda);
      
      expect(config.authority.toString()).to.equal(authority.publicKey.toString());
      expect(config.platformFeeBps).to.equal(platformFeeBps);
      expect(config.totalAssets.toNumber()).to.equal(0);
      expect(config.bump).to.equal(configBump);
    });
  });

  describe("register_asset", () => {
    it("registers a new asset", async () => {
      // Derive asset PDA
      [assetPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("asset"), assetMint.publicKey.toBuffer()],
        program.programId
      );

      const assetName = "Commercial Real Estate Fund";
      const assetType = { realEstate: {} };
      const totalValue = new anchor.BN(10_000_000_00); // $10M in cents
      const totalSupply = new anchor.BN(1_000_000);
      const metadataUri = "https://arweave.net/asset-metadata-hash";

      await program.methods
        .registerAsset(assetName, assetType, totalValue, totalSupply, metadataUri)
        .accounts({
          config: configPda,
          asset: assetPda,
          mint: assetMint.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const asset = await program.account.asset.fetch(assetPda);
      
      expect(asset.authority.toString()).to.equal(authority.publicKey.toString());
      expect(asset.mint.toString()).to.equal(assetMint.publicKey.toString());
      expect(asset.name).to.equal(assetName);
      expect(asset.totalValue.toNumber()).to.equal(totalValue.toNumber());
      expect(asset.totalSupply.toNumber()).to.equal(totalSupply.toNumber());
      expect(asset.metadataUri).to.equal(metadataUri);
      expect(asset.status).to.deep.equal({ pending: {} });

      // Check config was updated
      const config = await program.account.config.fetch(configPda);
      expect(config.totalAssets.toNumber()).to.equal(1);
    });

    it("fails with name too long", async () => {
      const badMint = Keypair.generate();
      const [badAssetPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("asset"), badMint.publicKey.toBuffer()],
        program.programId
      );

      const longName = "A".repeat(65); // 65 chars, max is 64

      try {
        await program.methods
          .registerAsset(
            longName, 
            { realEstate: {} }, 
            new anchor.BN(1000), 
            new anchor.BN(100), 
            "https://test.com"
          )
          .accounts({
            config: configPda,
            asset: badAssetPda,
            mint: badMint.publicKey,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("NameTooLong");
      }
    });

    it("fails with zero value", async () => {
      const badMint = Keypair.generate();
      const [badAssetPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("asset"), badMint.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .registerAsset(
            "Test Asset", 
            { realEstate: {} }, 
            new anchor.BN(0), // Zero value
            new anchor.BN(100), 
            "https://test.com"
          )
          .accounts({
            config: configPda,
            asset: badAssetPda,
            mint: badMint.publicKey,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("InvalidValue");
      }
    });
  });

  describe("update_asset", () => {
    it("updates asset metadata URI", async () => {
      const newUri = "https://arweave.net/updated-metadata-hash";

      await program.methods
        .updateAsset(newUri, null)
        .accounts({
          asset: assetPda,
          authority: authority.publicKey,
        })
        .rpc();

      const asset = await program.account.asset.fetch(assetPda);
      expect(asset.metadataUri).to.equal(newUri);
    });

    it("updates asset total value", async () => {
      const newValue = new anchor.BN(15_000_000_00); // $15M

      await program.methods
        .updateAsset(null, newValue)
        .accounts({
          asset: assetPda,
          authority: authority.publicKey,
        })
        .rpc();

      const asset = await program.account.asset.fetch(assetPda);
      expect(asset.totalValue.toNumber()).to.equal(newValue.toNumber());
    });
  });

  describe("activate_asset", () => {
    it("activates a pending asset", async () => {
      await program.methods
        .activateAsset()
        .accounts({
          asset: assetPda,
          authority: authority.publicKey,
        })
        .rpc();

      const asset = await program.account.asset.fetch(assetPda);
      expect(asset.status).to.deep.equal({ active: {} });
    });

    it("fails to activate an already active asset", async () => {
      try {
        await program.methods
          .activateAsset()
          .accounts({
            asset: assetPda,
            authority: authority.publicKey,
          })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("InvalidStatus");
      }
    });
  });

  describe("freeze_asset", () => {
    it("freezes an active asset", async () => {
      await program.methods
        .freezeAsset()
        .accounts({
          asset: assetPda,
          authority: authority.publicKey,
        })
        .rpc();

      const asset = await program.account.asset.fetch(assetPda);
      expect(asset.status).to.deep.equal({ frozen: {} });
    });
  });

  describe("unfreeze_asset", () => {
    it("unfreezes a frozen asset", async () => {
      await program.methods
        .unfreezeAsset()
        .accounts({
          asset: assetPda,
          authority: authority.publicKey,
        })
        .rpc();

      const asset = await program.account.asset.fetch(assetPda);
      expect(asset.status).to.deep.equal({ active: {} });
    });
  });

  describe("create_token_mint", () => {
    let mintPda: PublicKey;
    let mintConfigPda: PublicKey;
    let mintAuthorityPda: PublicKey;
    let permanentDelegate: Keypair;

    before(() => {
      permanentDelegate = Keypair.generate();
      mintPda = Keypair.generate().publicKey;

      [mintConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint-config"), mintPda.toBuffer()],
        program.programId
      );

      [mintAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint-authority"), mintPda.toBuffer()],
        program.programId
      );
    });

    it("creates a token mint configuration", async () => {
      const name = "RWA Token";
      const symbol = "RWAT";
      const uri = "https://arweave.net/token-metadata";
      const decimals = 6;
      const transferHookProgram = null;

      await program.methods
        .createTokenMint(name, symbol, uri, decimals, transferHookProgram)
        .accounts({
          authority: authority.publicKey,
          permanentDelegate: permanentDelegate.publicKey,
          mint: mintPda,
          mintConfig: mintConfigPda,
          mintAuthority: mintAuthorityPda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const mintConfig = await program.account.mintConfig.fetch(mintConfigPda);
      
      expect(mintConfig.mint.toString()).to.equal(mintPda.toString());
      expect(mintConfig.authority.toString()).to.equal(authority.publicKey.toString());
      expect(mintConfig.permanentDelegate.toString()).to.equal(permanentDelegate.publicKey.toString());
      expect(mintConfig.name).to.equal(name);
      expect(mintConfig.symbol).to.equal(symbol);
      expect(mintConfig.uri).to.equal(uri);
      expect(mintConfig.decimals).to.equal(decimals);
      expect(mintConfig.isFrozen).to.equal(false);
    });
  });

  describe("freeze_mint / unfreeze_mint", () => {
    let mintPda: PublicKey;
    let mintConfigPda: PublicKey;

    before(async () => {
      mintPda = Keypair.generate().publicKey;
      
      [mintConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint-config"), mintPda.toBuffer()],
        program.programId
      );

      const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint-authority"), mintPda.toBuffer()],
        program.programId
      );

      // Create mint config first
      await program.methods
        .createTokenMint("Test Token", "TEST", "https://test.com", 6, null)
        .accounts({
          authority: authority.publicKey,
          permanentDelegate: authority.publicKey,
          mint: mintPda,
          mintConfig: mintConfigPda,
          mintAuthority: mintAuthorityPda,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("freezes a mint", async () => {
      await program.methods
        .freezeMint()
        .accounts({
          authority: authority.publicKey,
          mintConfig: mintConfigPda,
        })
        .rpc();

      const mintConfig = await program.account.mintConfig.fetch(mintConfigPda);
      expect(mintConfig.isFrozen).to.equal(true);
    });

    it("unfreezes a mint", async () => {
      await program.methods
        .unfreezeMint()
        .accounts({
          authority: authority.publicKey,
          mintConfig: mintConfigPda,
        })
        .rpc();

      const mintConfig = await program.account.mintConfig.fetch(mintConfigPda);
      expect(mintConfig.isFrozen).to.equal(false);
    });
  });
});
