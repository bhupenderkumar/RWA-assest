import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import { COMPLIANCE_PROGRAM_ID, MAX_REASON_LENGTH } from "../constants";
import {
  ComplianceConfig,
  WhitelistEntry,
  BlacklistEntry,
  JurisdictionRule,
  InvestorType,
  AddToWhitelistParams,
  AddToBlacklistParams,
  AddJurisdictionRuleParams,
  UpdateComplianceConfigParams,
  InvalidParameterError,
} from "../types";
import {
  deriveComplianceConfig,
  deriveWhitelistEntry,
  deriveBlacklistEntry,
  deriveJurisdictionRule,
  deserializeComplianceConfig,
  deserializeWhitelistEntry,
  deserializeBlacklistEntry,
  deserializeJurisdictionRule,
  fetchAccount,
  getProgramAccounts,
  accountExists,
  stringToJurisdiction,
  jurisdictionToString,
} from "../utils/accounts";
import {
  TransactionBuilder,
  sendWithProvider,
  SendTransactionOptions,
  WalletAdapter,
} from "../utils/transactions";

/**
 * Client for interacting with the Compliance program
 *
 * @example
 * ```typescript
 * const client = new ComplianceClient(connection, wallet);
 *
 * // Verify an investor
 * const isCompliant = await client.verifyInvestor(investorPubkey);
 *
 * // Add to whitelist
 * await client.addToWhitelist({
 *   investor: investorPubkey,
 *   investorType: InvestorType.Accredited,
 *   jurisdiction: "US",
 *   kycExpiry: new BN(Date.now() / 1000 + 365 * 24 * 60 * 60),
 * });
 *
 * // Check transfer restrictions
 * const canTransfer = await client.checkTransferRestrictions(
 *   senderPubkey,
 *   receiverPubkey,
 *   amount
 * );
 * ```
 */
export class ComplianceClient {
  private connection: Connection;
  private wallet: WalletAdapter;
  private provider: AnchorProvider | null = null;
  private programId: PublicKey;

  constructor(
    connection: Connection,
    wallet: WalletAdapter,
    programId: PublicKey = COMPLIANCE_PROGRAM_ID,
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
   * Get the compliance configuration
   */
  async getConfig(): Promise<ComplianceConfig> {
    const [configPda] = deriveComplianceConfig();
    return fetchAccount(
      this.connection,
      configPda,
      deserializeComplianceConfig,
      "ComplianceConfig",
    );
  }

  /**
   * Get whitelist entry for an investor
   */
  async getWhitelistEntry(investor: PublicKey): Promise<WhitelistEntry> {
    const [whitelistPda] = deriveWhitelistEntry(investor);
    return fetchAccount(
      this.connection,
      whitelistPda,
      deserializeWhitelistEntry,
      "WhitelistEntry",
    );
  }

  /**
   * Get blacklist entry for an address
   */
  async getBlacklistEntry(address: PublicKey): Promise<BlacklistEntry> {
    const [blacklistPda] = deriveBlacklistEntry(address);
    return fetchAccount(
      this.connection,
      blacklistPda,
      deserializeBlacklistEntry,
      "BlacklistEntry",
    );
  }

  /**
   * Get jurisdiction rule
   */
  async getJurisdictionRule(
    fromJurisdiction: string,
    toJurisdiction: string,
  ): Promise<JurisdictionRule> {
    const [rulePda] = deriveJurisdictionRule(fromJurisdiction, toJurisdiction);
    return fetchAccount(
      this.connection,
      rulePda,
      deserializeJurisdictionRule,
      "JurisdictionRule",
    );
  }

  /**
   * Verify if an investor is compliant (whitelisted and KYC valid)
   */
  async verifyInvestor(investor: PublicKey): Promise<{
    isCompliant: boolean;
    isWhitelisted: boolean;
    isBlacklisted: boolean;
    kycValid: boolean;
    investorType?: InvestorType;
    jurisdiction?: string;
    reason?: string;
  }> {
    const currentTime = Math.floor(Date.now() / 1000);

    // Check blacklist first
    try {
      const blacklistEntry = await this.getBlacklistEntry(investor);
      if (blacklistEntry.isActive) {
        return {
          isCompliant: false,
          isWhitelisted: false,
          isBlacklisted: true,
          kycValid: false,
          reason: "Investor is blacklisted",
        };
      }
    } catch {
      // Not blacklisted
    }

    // Check whitelist
    try {
      const whitelistEntry = await this.getWhitelistEntry(investor);

      if (!whitelistEntry.isActive) {
        return {
          isCompliant: false,
          isWhitelisted: false,
          isBlacklisted: false,
          kycValid: false,
          reason: "Investor is not whitelisted",
        };
      }

      const kycValid = whitelistEntry.kycExpiry.gtn(currentTime);

      const result: {
        isCompliant: boolean;
        isWhitelisted: boolean;
        isBlacklisted: boolean;
        kycValid: boolean;
        investorType?: InvestorType;
        jurisdiction?: string;
        reason?: string;
      } = {
        isCompliant: kycValid,
        isWhitelisted: true,
        isBlacklisted: false,
        kycValid,
        investorType: whitelistEntry.investorType,
        jurisdiction: jurisdictionToString(whitelistEntry.jurisdiction),
      };

      if (!kycValid) {
        result.reason = "KYC has expired";
      }

      return result;
    } catch {
      return {
        isCompliant: false,
        isWhitelisted: false,
        isBlacklisted: false,
        kycValid: false,
        reason: "Investor is not whitelisted",
      };
    }
  }

  /**
   * Check if a transfer between two addresses is allowed
   */
  async checkTransferRestrictions(
    sender: PublicKey,
    receiver: PublicKey,
    amount: BN,
  ): Promise<{
    isAllowed: boolean;
    reason?: string;
  }> {
    try {
      // Get config
      const config = await this.getConfig();

      // Check if transfers are paused
      if (config.isPaused) {
        return { isAllowed: false, reason: "Transfers are paused" };
      }

      // Check amount limit
      if (amount.gt(config.maxTransferAmount)) {
        return {
          isAllowed: false,
          reason: `Transfer amount exceeds maximum (${config.maxTransferAmount.toString()})`,
        };
      }

      // Verify sender
      const senderVerification = await this.verifyInvestor(sender);
      if (!senderVerification.isCompliant) {
        return {
          isAllowed: false,
          reason: `Sender not compliant: ${senderVerification.reason}`,
        };
      }

      // Verify receiver
      const receiverVerification = await this.verifyInvestor(receiver);
      if (!receiverVerification.isCompliant) {
        return {
          isAllowed: false,
          reason: `Receiver not compliant: ${receiverVerification.reason}`,
        };
      }

      // Check cooldown
      if (config.transferCooldown.gtn(0)) {
        const senderEntry = await this.getWhitelistEntry(sender);
        const currentTime = Math.floor(Date.now() / 1000);
        const cooldownEnd = senderEntry.lastTransfer.add(
          config.transferCooldown,
        );

        if (cooldownEnd.gtn(currentTime)) {
          return {
            isAllowed: false,
            reason: `Transfer cooldown active (${cooldownEnd.toNumber() - currentTime}s remaining)`,
          };
        }
      }

      // Check jurisdiction rules
      if (
        senderVerification.jurisdiction &&
        receiverVerification.jurisdiction
      ) {
        try {
          const rule = await this.getJurisdictionRule(
            senderVerification.jurisdiction,
            receiverVerification.jurisdiction,
          );

          if (!rule.isAllowed) {
            return {
              isAllowed: false,
              reason: `Transfers from ${senderVerification.jurisdiction} to ${receiverVerification.jurisdiction} are not allowed`,
            };
          }

          if (rule.maxAmount && amount.gt(rule.maxAmount)) {
            return {
              isAllowed: false,
              reason: `Transfer amount exceeds jurisdiction limit`,
            };
          }
        } catch {
          // No specific rule, allowed by default
        }
      }

      return { isAllowed: true };
    } catch (error) {
      return {
        isAllowed: false,
        reason: `Error checking restrictions: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check if an investor is whitelisted
   */
  async isWhitelisted(investor: PublicKey): Promise<boolean> {
    const [whitelistPda] = deriveWhitelistEntry(investor);
    if (!(await accountExists(this.connection, whitelistPda))) {
      return false;
    }
    const entry = await this.getWhitelistEntry(investor);
    return entry.isActive;
  }

  /**
   * Check if an address is blacklisted
   */
  async isBlacklisted(address: PublicKey): Promise<boolean> {
    const [blacklistPda] = deriveBlacklistEntry(address);
    if (!(await accountExists(this.connection, blacklistPda))) {
      return false;
    }
    const entry = await this.getBlacklistEntry(address);
    return entry.isActive;
  }

  /**
   * List all whitelist entries
   */
  async listWhitelistEntries(): Promise<
    { pubkey: PublicKey; account: WhitelistEntry }[]
  > {
    return getProgramAccounts(
      this.connection,
      this.programId,
      deserializeWhitelistEntry,
      [],
    );
  }

  /**
   * List all blacklist entries
   */
  async listBlacklistEntries(): Promise<
    { pubkey: PublicKey; account: BlacklistEntry }[]
  > {
    return getProgramAccounts(
      this.connection,
      this.programId,
      deserializeBlacklistEntry,
      [],
    );
  }

  /**
   * List whitelist entries by investor type
   */
  async listWhitelistByType(
    investorType: InvestorType,
  ): Promise<{ pubkey: PublicKey; account: WhitelistEntry }[]> {
    const all = await this.listWhitelistEntries();
    return all.filter(
      (e) => e.account.investorType === investorType && e.account.isActive,
    );
  }

  /**
   * List whitelist entries by jurisdiction
   */
  async listWhitelistByJurisdiction(
    jurisdiction: string,
  ): Promise<{ pubkey: PublicKey; account: WhitelistEntry }[]> {
    const all = await this.listWhitelistEntries();
    const targetJurisdiction = stringToJurisdiction(jurisdiction);
    return all.filter(
      (e) =>
        e.account.jurisdiction[0] === targetJurisdiction[0] &&
        e.account.jurisdiction[1] === targetJurisdiction[1] &&
        e.account.isActive,
    );
  }

  // ===========================================================================
  // Write Methods
  // ===========================================================================

  /**
   * Initialize the compliance program
   */
  async initialize(
    civicGatekeeperNetwork: PublicKey,
    maxTransferAmount: BN,
    transferCooldown: BN,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createInitializeInstruction(
      civicGatekeeperNetwork,
      maxTransferAmount,
      transferCooldown,
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
   * Add an address to the whitelist
   */
  async addToWhitelist(
    params: AddToWhitelistParams,
    options?: SendTransactionOptions,
  ): Promise<{ signature: string; whitelistAddress: PublicKey }> {
    if (params.jurisdiction.length !== 2) {
      throw new InvalidParameterError(
        "jurisdiction",
        "Jurisdiction must be a 2-letter country code",
      );
    }

    const [whitelistPda] = deriveWhitelistEntry(params.investor);

    const ix = await this.createAddToWhitelistInstruction(params);

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

    return { signature, whitelistAddress: whitelistPda };
  }

  /**
   * Remove an address from the whitelist
   */
  async removeFromWhitelist(
    investor: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createRemoveFromWhitelistInstruction(investor);

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
   * Add an address to the blacklist
   */
  async addToBlacklist(
    params: AddToBlacklistParams,
    options?: SendTransactionOptions,
  ): Promise<{ signature: string; blacklistAddress: PublicKey }> {
    if (params.reason.length > MAX_REASON_LENGTH) {
      throw new InvalidParameterError(
        "reason",
        `Reason must be at most ${MAX_REASON_LENGTH} characters`,
      );
    }

    const [blacklistPda] = deriveBlacklistEntry(params.address);

    const ix = await this.createAddToBlacklistInstruction(params);

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

    return { signature, blacklistAddress: blacklistPda };
  }

  /**
   * Remove an address from the blacklist
   */
  async removeFromBlacklist(
    address: PublicKey,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createRemoveFromBlacklistInstruction(address);

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
   * Add a jurisdiction rule
   */
  async addJurisdictionRule(
    params: AddJurisdictionRuleParams,
    options?: SendTransactionOptions,
  ): Promise<{ signature: string; ruleAddress: PublicKey }> {
    if (
      params.fromJurisdiction.length !== 2 ||
      params.toJurisdiction.length !== 2
    ) {
      throw new InvalidParameterError(
        "jurisdiction",
        "Jurisdictions must be 2-letter country codes",
      );
    }

    const [rulePda] = deriveJurisdictionRule(
      params.fromJurisdiction,
      params.toJurisdiction,
    );

    const ix = await this.createAddJurisdictionRuleInstruction(params);

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

    return { signature, ruleAddress: rulePda };
  }

  /**
   * Update compliance configuration
   */
  async updateConfig(
    params: UpdateComplianceConfigParams,
    options?: SendTransactionOptions,
  ): Promise<string> {
    const ix = await this.createUpdateConfigInstruction(params);

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
   * Pause all transfers
   */
  async pauseTransfers(options?: SendTransactionOptions): Promise<string> {
    return this.updateConfig({ isPaused: true }, options);
  }

  /**
   * Resume transfers
   */
  async resumeTransfers(options?: SendTransactionOptions): Promise<string> {
    return this.updateConfig({ isPaused: false }, options);
  }

  // ===========================================================================
  // Instruction Builders
  // ===========================================================================

  /**
   * Create initialize instruction
   */
  private async createInitializeInstruction(
    civicGatekeeperNetwork: PublicKey,
    maxTransferAmount: BN,
    transferCooldown: BN,
  ): Promise<TransactionInstruction> {
    const [configPda] = deriveComplianceConfig();

    const data = Buffer.alloc(56);
    let offset = 0;

    // Initialize discriminator
    const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
    discriminator.copy(data, offset);
    offset += 8;

    // Civic gatekeeper network
    civicGatekeeperNetwork.toBuffer().copy(data, offset);
    offset += 32;

    // Max transfer amount
    maxTransferAmount.toArrayLike(Buffer, "le", 8).copy(data, offset);
    offset += 8;

    // Transfer cooldown
    transferCooldown.toArrayLike(Buffer, "le", 8).copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create add to whitelist instruction
   */
  private async createAddToWhitelistInstruction(
    params: AddToWhitelistParams,
  ): Promise<TransactionInstruction> {
    const [configPda] = deriveComplianceConfig();
    const [whitelistPda] = deriveWhitelistEntry(params.investor);
    const jurisdictionBytes = stringToJurisdiction(params.jurisdiction);

    const data = Buffer.alloc(52);
    let offset = 0;

    // Add to whitelist discriminator
    const discriminator = Buffer.from([157, 141, 9, 116, 99, 35, 131, 193]);
    discriminator.copy(data, offset);
    offset += 8;

    // Investor
    params.investor.toBuffer().copy(data, offset);
    offset += 32;

    // Investor type
    data.writeUInt8(params.investorType, offset);
    offset += 1;

    // Jurisdiction
    jurisdictionBytes[0] !== undefined &&
      data.writeUInt8(jurisdictionBytes[0], offset);
    offset += 1;
    jurisdictionBytes[1] !== undefined &&
      data.writeUInt8(jurisdictionBytes[1], offset);
    offset += 1;

    // KYC expiry
    params.kycExpiry.toArrayLike(Buffer, "le", 8).copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: whitelistPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create remove from whitelist instruction
   */
  private async createRemoveFromWhitelistInstruction(
    investor: PublicKey,
  ): Promise<TransactionInstruction> {
    const [configPda] = deriveComplianceConfig();
    const [whitelistPda] = deriveWhitelistEntry(investor);

    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([178, 225, 56, 100, 147, 29, 37, 162]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: whitelistPda, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create add to blacklist instruction
   */
  private async createAddToBlacklistInstruction(
    params: AddToBlacklistParams,
  ): Promise<TransactionInstruction> {
    const [configPda] = deriveComplianceConfig();
    const [blacklistPda] = deriveBlacklistEntry(params.address);
    const reasonBytes = Buffer.from(params.reason, "utf8");

    const dataSize = 8 + 32 + 4 + reasonBytes.length;
    const data = Buffer.alloc(dataSize);
    let offset = 0;

    // Add to blacklist discriminator
    const discriminator = Buffer.from([68, 189, 230, 152, 114, 125, 20, 222]);
    discriminator.copy(data, offset);
    offset += 8;

    // Address
    params.address.toBuffer().copy(data, offset);
    offset += 32;

    // Reason
    data.writeUInt32LE(reasonBytes.length, offset);
    offset += 4;
    reasonBytes.copy(data, offset);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: blacklistPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create remove from blacklist instruction
   */
  private async createRemoveFromBlacklistInstruction(
    address: PublicKey,
  ): Promise<TransactionInstruction> {
    const [configPda] = deriveComplianceConfig();
    const [blacklistPda] = deriveBlacklistEntry(address);

    const data = Buffer.alloc(8);
    const discriminator = Buffer.from([54, 8, 240, 86, 130, 201, 2, 94]);
    discriminator.copy(data, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: blacklistPda, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create add jurisdiction rule instruction
   */
  private async createAddJurisdictionRuleInstruction(
    params: AddJurisdictionRuleParams,
  ): Promise<TransactionInstruction> {
    const [configPda] = deriveComplianceConfig();
    const [rulePda] = deriveJurisdictionRule(
      params.fromJurisdiction,
      params.toJurisdiction,
    );
    const fromBytes = stringToJurisdiction(params.fromJurisdiction);
    const toBytes = stringToJurisdiction(params.toJurisdiction);

    const dataSize = 8 + 2 + 2 + 1 + 1 + (params.maxAmount ? 8 : 0);
    const data = Buffer.alloc(dataSize);
    let offset = 0;

    // Add jurisdiction rule discriminator
    const discriminator = Buffer.from([213, 128, 149, 50, 106, 249, 69, 47]);
    discriminator.copy(data, offset);
    offset += 8;

    // From jurisdiction
    fromBytes[0] !== undefined && data.writeUInt8(fromBytes[0], offset);
    offset += 1;
    fromBytes[1] !== undefined && data.writeUInt8(fromBytes[1], offset);
    offset += 1;

    // To jurisdiction
    toBytes[0] !== undefined && data.writeUInt8(toBytes[0], offset);
    offset += 1;
    toBytes[1] !== undefined && data.writeUInt8(toBytes[1], offset);
    offset += 1;

    // Is allowed
    data.writeUInt8(params.isAllowed ? 1 : 0, offset);
    offset += 1;

    // Max amount (optional)
    if (params.maxAmount) {
      data.writeUInt8(1, offset);
      offset += 1;
      params.maxAmount.toArrayLike(Buffer, "le", 8).copy(data, offset);
    } else {
      data.writeUInt8(0, offset);
    }

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: rulePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  /**
   * Create update config instruction
   */
  private async createUpdateConfigInstruction(
    params: UpdateComplianceConfigParams,
  ): Promise<TransactionInstruction> {
    const [configPda] = deriveComplianceConfig();

    const dataSize =
      8 +
      1 +
      (params.maxTransferAmount ? 8 : 0) +
      1 +
      (params.transferCooldown ? 8 : 0) +
      1 +
      (params.isPaused !== undefined ? 1 : 0);

    const data = Buffer.alloc(dataSize);
    let offset = 0;

    // Update config discriminator
    const discriminator = Buffer.from([29, 158, 252, 191, 10, 83, 219, 99]);
    discriminator.copy(data, offset);
    offset += 8;

    // Max transfer amount (optional)
    if (params.maxTransferAmount) {
      data.writeUInt8(1, offset);
      offset += 1;
      params.maxTransferAmount.toArrayLike(Buffer, "le", 8).copy(data, offset);
      offset += 8;
    } else {
      data.writeUInt8(0, offset);
      offset += 1;
    }

    // Transfer cooldown (optional)
    if (params.transferCooldown) {
      data.writeUInt8(1, offset);
      offset += 1;
      params.transferCooldown.toArrayLike(Buffer, "le", 8).copy(data, offset);
      offset += 8;
    } else {
      data.writeUInt8(0, offset);
      offset += 1;
    }

    // Is paused (optional)
    if (params.isPaused !== undefined) {
      data.writeUInt8(1, offset);
      offset += 1;
      data.writeUInt8(params.isPaused ? 1 : 0, offset);
    } else {
      data.writeUInt8(0, offset);
    }

    return new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: configPda, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data,
    });
  }
}
