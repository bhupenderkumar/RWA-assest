import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Compliance } from "../target/types/compliance";
import { 
  Keypair, 
  PublicKey, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import { expect } from "chai";

describe("compliance", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Compliance as Program<Compliance>;
  
  const authority = provider.wallet as anchor.Wallet;
  let configPda: PublicKey;
  let configBump: number;
  
  const civicGatekeeperNetwork = Keypair.generate().publicKey;
  const maxTransferAmount = new anchor.BN(1_000_000_000); // 1000 USDC
  const transferCooldown = new anchor.BN(3600); // 1 hour

  before(async () => {
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("compliance-config")],
      program.programId
    );
  });

  describe("initialize", () => {
    it("initializes the compliance configuration", async () => {
      await program.methods
        .initialize(civicGatekeeperNetwork, maxTransferAmount, transferCooldown)
        .accounts({
          authority: authority.publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await program.account.complianceConfig.fetch(configPda);
      
      expect(config.authority.toString()).to.equal(authority.publicKey.toString());
      expect(config.civicGatekeeperNetwork.toString()).to.equal(civicGatekeeperNetwork.toString());
      expect(config.maxTransferAmount.toNumber()).to.equal(maxTransferAmount.toNumber());
      expect(config.transferCooldown.toNumber()).to.equal(transferCooldown.toNumber());
      expect(config.isPaused).to.equal(false);
      expect(config.totalWhitelisted.toNumber()).to.equal(0);
      expect(config.totalBlacklisted.toNumber()).to.equal(0);
    });
  });

  describe("whitelist management", () => {
    const investor1 = Keypair.generate().publicKey;
    const investor2 = Keypair.generate().publicKey;
    let investor1WhitelistPda: PublicKey;
    let investor2WhitelistPda: PublicKey;

    before(() => {
      [investor1WhitelistPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), investor1.toBuffer()],
        program.programId
      );
      [investor2WhitelistPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), investor2.toBuffer()],
        program.programId
      );
    });

    it("adds an address to the whitelist", async () => {
      const investorType = { accredited: {} };
      const jurisdiction = [0x55, 0x53] as [number, number]; // "US"
      const kycExpiry = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year

      await program.methods
        .addToWhitelist(investor1, investorType, jurisdiction, new anchor.BN(kycExpiry))
        .accounts({
          authority: authority.publicKey,
          config: configPda,
          whitelistEntry: investor1WhitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const entry = await program.account.whitelistEntry.fetch(investor1WhitelistPda);
      
      expect(entry.investor.toString()).to.equal(investor1.toString());
      expect(entry.investorType).to.deep.equal(investorType);
      expect(entry.jurisdiction).to.deep.equal(jurisdiction);
      expect(entry.kycVerified).to.equal(true);
      expect(entry.kycExpiry.toNumber()).to.equal(kycExpiry);
      expect(entry.isActive).to.equal(true);

      const config = await program.account.complianceConfig.fetch(configPda);
      expect(config.totalWhitelisted.toNumber()).to.equal(1);
    });

    it("adds another investor with different type", async () => {
      const investorType = { institutional: {} };
      const jurisdiction = [0x47, 0x42] as [number, number]; // "GB"
      const kycExpiry = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

      await program.methods
        .addToWhitelist(investor2, investorType, jurisdiction, new anchor.BN(kycExpiry))
        .accounts({
          authority: authority.publicKey,
          config: configPda,
          whitelistEntry: investor2WhitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const entry = await program.account.whitelistEntry.fetch(investor2WhitelistPda);
      
      expect(entry.investor.toString()).to.equal(investor2.toString());
      expect(entry.investorType).to.deep.equal(investorType);
      expect(entry.jurisdiction).to.deep.equal(jurisdiction);

      const config = await program.account.complianceConfig.fetch(configPda);
      expect(config.totalWhitelisted.toNumber()).to.equal(2);
    });

    it("removes an address from the whitelist", async () => {
      await program.methods
        .removeFromWhitelist()
        .accounts({
          authority: authority.publicKey,
          config: configPda,
          whitelistEntry: investor2WhitelistPda,
        })
        .rpc();

      const entry = await program.account.whitelistEntry.fetch(investor2WhitelistPda);
      expect(entry.isActive).to.equal(false);

      const config = await program.account.complianceConfig.fetch(configPda);
      expect(config.totalWhitelisted.toNumber()).to.equal(1);
    });
  });

  describe("blacklist management", () => {
    const badActor = Keypair.generate().publicKey;
    let badActorBlacklistPda: PublicKey;

    before(() => {
      [badActorBlacklistPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("blacklist"), badActor.toBuffer()],
        program.programId
      );
    });

    it("adds an address to the blacklist", async () => {
      const reason = "Suspicious activity detected";

      await program.methods
        .addToBlacklist(badActor, reason)
        .accounts({
          authority: authority.publicKey,
          config: configPda,
          blacklistEntry: badActorBlacklistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const entry = await program.account.blacklistEntry.fetch(badActorBlacklistPda);
      
      expect(entry.address.toString()).to.equal(badActor.toString());
      expect(entry.reason).to.equal(reason);
      expect(entry.addedBy.toString()).to.equal(authority.publicKey.toString());
      expect(entry.isActive).to.equal(true);

      const config = await program.account.complianceConfig.fetch(configPda);
      expect(config.totalBlacklisted.toNumber()).to.equal(1);
    });

    it("fails with reason too long", async () => {
      const newBadActor = Keypair.generate().publicKey;
      const [newBlacklistPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("blacklist"), newBadActor.toBuffer()],
        program.programId
      );
      
      const longReason = "A".repeat(129); // Max is 128

      try {
        await program.methods
          .addToBlacklist(newBadActor, longReason)
          .accounts({
            authority: authority.publicKey,
            config: configPda,
            blacklistEntry: newBlacklistPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("ReasonTooLong");
      }
    });

    it("removes an address from the blacklist", async () => {
      await program.methods
        .removeFromBlacklist()
        .accounts({
          authority: authority.publicKey,
          config: configPda,
          blacklistEntry: badActorBlacklistPda,
        })
        .rpc();

      const entry = await program.account.blacklistEntry.fetch(badActorBlacklistPda);
      expect(entry.isActive).to.equal(false);

      const config = await program.account.complianceConfig.fetch(configPda);
      expect(config.totalBlacklisted.toNumber()).to.equal(0);
    });
  });

  describe("jurisdiction rules", () => {
    const usJurisdiction = [0x55, 0x53] as [number, number]; // "US"
    const gbJurisdiction = [0x47, 0x42] as [number, number]; // "GB"
    const cnJurisdiction = [0x43, 0x4E] as [number, number]; // "CN"
    
    let usToGbRulePda: PublicKey;
    let usToCnRulePda: PublicKey;

    before(() => {
      [usToGbRulePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("jurisdiction"), Buffer.from(usJurisdiction), Buffer.from(gbJurisdiction)],
        program.programId
      );
      [usToCnRulePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("jurisdiction"), Buffer.from(usJurisdiction), Buffer.from(cnJurisdiction)],
        program.programId
      );
    });

    it("adds an allowed jurisdiction rule", async () => {
      await program.methods
        .addJurisdictionRule(usJurisdiction, gbJurisdiction, true, null)
        .accounts({
          authority: authority.publicKey,
          config: configPda,
          jurisdictionRule: usToGbRulePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const rule = await program.account.jurisdictionRule.fetch(usToGbRulePda);
      
      expect(rule.fromJurisdiction).to.deep.equal(usJurisdiction);
      expect(rule.toJurisdiction).to.deep.equal(gbJurisdiction);
      expect(rule.isAllowed).to.equal(true);
      expect(rule.maxAmount).to.equal(null);
    });

    it("adds a restricted jurisdiction rule with max amount", async () => {
      const maxAmount = new anchor.BN(100_000_000); // 100 USDC max

      await program.methods
        .addJurisdictionRule(usJurisdiction, cnJurisdiction, false, maxAmount)
        .accounts({
          authority: authority.publicKey,
          config: configPda,
          jurisdictionRule: usToCnRulePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const rule = await program.account.jurisdictionRule.fetch(usToCnRulePda);
      
      expect(rule.fromJurisdiction).to.deep.equal(usJurisdiction);
      expect(rule.toJurisdiction).to.deep.equal(cnJurisdiction);
      expect(rule.isAllowed).to.equal(false);
      expect(rule.maxAmount.toNumber()).to.equal(maxAmount.toNumber());
    });
  });

  describe("config updates", () => {
    it("updates max transfer amount", async () => {
      const newMaxAmount = new anchor.BN(2_000_000_000); // 2000 USDC

      await program.methods
        .updateConfig(newMaxAmount, null, null)
        .accounts({
          authority: authority.publicKey,
          config: configPda,
        })
        .rpc();

      const config = await program.account.complianceConfig.fetch(configPda);
      expect(config.maxTransferAmount.toNumber()).to.equal(newMaxAmount.toNumber());
    });

    it("updates transfer cooldown", async () => {
      const newCooldown = new anchor.BN(7200); // 2 hours

      await program.methods
        .updateConfig(null, newCooldown, null)
        .accounts({
          authority: authority.publicKey,
          config: configPda,
        })
        .rpc();

      const config = await program.account.complianceConfig.fetch(configPda);
      expect(config.transferCooldown.toNumber()).to.equal(newCooldown.toNumber());
    });

    it("pauses and resumes transfers", async () => {
      // Pause
      await program.methods
        .updateConfig(null, null, true)
        .accounts({
          authority: authority.publicKey,
          config: configPda,
        })
        .rpc();

      let config = await program.account.complianceConfig.fetch(configPda);
      expect(config.isPaused).to.equal(true);

      // Resume
      await program.methods
        .updateConfig(null, null, false)
        .accounts({
          authority: authority.publicKey,
          config: configPda,
        })
        .rpc();

      config = await program.account.complianceConfig.fetch(configPda);
      expect(config.isPaused).to.equal(false);
    });
  });

  describe("transfer hook validation", () => {
    const validSender = Keypair.generate().publicKey;
    const validReceiver = Keypair.generate().publicKey;
    let senderWhitelistPda: PublicKey;
    let receiverWhitelistPda: PublicKey;

    before(async () => {
      [senderWhitelistPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), validSender.toBuffer()],
        program.programId
      );
      [receiverWhitelistPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), validReceiver.toBuffer()],
        program.programId
      );

      // Whitelist both addresses
      const kycExpiry = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      const jurisdiction = [0x55, 0x53] as [number, number];

      await program.methods
        .addToWhitelist(validSender, { retail: {} }, jurisdiction, new anchor.BN(kycExpiry))
        .accounts({
          authority: authority.publicKey,
          config: configPda,
          whitelistEntry: senderWhitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .addToWhitelist(validReceiver, { retail: {} }, jurisdiction, new anchor.BN(kycExpiry))
        .accounts({
          authority: authority.publicKey,
          config: configPda,
          whitelistEntry: receiverWhitelistPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

    it("validates a compliant transfer", async () => {
      const transferAmount = new anchor.BN(100_000_000); // 100 USDC

      await program.methods
        .transferHook(transferAmount)
        .accounts({
          config: configPda,
          sender: validSender,
          receiver: validReceiver,
          senderWhitelist: senderWhitelistPda,
          receiverWhitelist: receiverWhitelistPda,
          senderBlacklist: null,
          receiverBlacklist: null,
          jurisdictionRule: null,
        })
        .rpc();

      // If we get here without error, the transfer is validated
    });

    it("fails when transfers are paused", async () => {
      // Pause transfers
      await program.methods
        .updateConfig(null, null, true)
        .accounts({
          authority: authority.publicKey,
          config: configPda,
        })
        .rpc();

      try {
        await program.methods
          .transferHook(new anchor.BN(100_000_000))
          .accounts({
            config: configPda,
            sender: validSender,
            receiver: validReceiver,
            senderWhitelist: senderWhitelistPda,
            receiverWhitelist: receiverWhitelistPda,
            senderBlacklist: null,
            receiverBlacklist: null,
            jurisdictionRule: null,
          })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("TransfersPaused");
      }

      // Resume for other tests
      await program.methods
        .updateConfig(null, null, false)
        .accounts({
          authority: authority.publicKey,
          config: configPda,
        })
        .rpc();
    });

    it("fails when transfer amount exceeds max", async () => {
      const excessiveAmount = new anchor.BN(5_000_000_000); // 5000 USDC (max is 2000)

      try {
        await program.methods
          .transferHook(excessiveAmount)
          .accounts({
            config: configPda,
            sender: validSender,
            receiver: validReceiver,
            senderWhitelist: senderWhitelistPda,
            receiverWhitelist: receiverWhitelistPda,
            senderBlacklist: null,
            receiverBlacklist: null,
            jurisdictionRule: null,
          })
          .rpc();
        
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("TransferAmountExceeded");
      }
    });
  });
});
