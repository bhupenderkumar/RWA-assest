import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AssetRegistry } from "../target/types/asset_registry";
import { Compliance } from "../target/types/compliance";
import { 
  Keypair, 
  PublicKey, 
  SystemProgram,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

/**
 * Initialize Script
 * 
 * Initializes programs with configuration and sets up initial data.
 * Can be used after deployment to configure programs or reset state.
 * 
 * Usage: 
 *   NETWORK=devnet npx ts-node scripts/initialize.ts
 *   NETWORK=mainnet npx ts-node scripts/initialize.ts
 */

interface InitConfig {
  platformFeeBps: number;
  civicGatekeeperNetwork: string;
  maxTransferAmount: number;
  transferCooldown: number;
  initialWhitelist: string[];
  jurisdictionRules: {
    from: string;
    to: string;
    allowed: boolean;
    maxAmount?: number;
  }[];
}

// Configuration per network
const configs: Record<string, InitConfig> = {
  devnet: {
    platformFeeBps: 250, // 2.5%
    civicGatekeeperNetwork: "ignREusXmGrscGNUesoU9mxfds9AiYqdn251V6RgMPm",
    maxTransferAmount: 10_000_000_000_000, // 10M USDC
    transferCooldown: 0, // No cooldown for testing
    initialWhitelist: [],
    jurisdictionRules: [
      { from: "US", to: "US", allowed: true },
      { from: "US", to: "GB", allowed: true },
      { from: "GB", to: "US", allowed: true },
      { from: "US", to: "CN", allowed: false },
    ],
  },
  mainnet: {
    platformFeeBps: 100, // 1%
    civicGatekeeperNetwork: "ignREusXmGrscGNUesoU9mxfds9AiYqdn251V6RgMPm",
    maxTransferAmount: 100_000_000_000, // 100K USDC
    transferCooldown: 300, // 5 minutes
    initialWhitelist: [],
    jurisdictionRules: [
      { from: "US", to: "US", allowed: true, maxAmount: 1_000_000_000_000 },
      { from: "US", to: "GB", allowed: true },
      { from: "GB", to: "US", allowed: true },
      { from: "US", to: "CN", allowed: false },
      { from: "CN", to: "US", allowed: false },
    ],
  },
  localnet: {
    platformFeeBps: 250,
    civicGatekeeperNetwork: "ignREusXmGrscGNUesoU9mxfds9AiYqdn251V6RgMPm",
    maxTransferAmount: 1_000_000_000_000_000, // Unlimited for testing
    transferCooldown: 0,
    initialWhitelist: [],
    jurisdictionRules: [],
  },
};

function jurisdictionToBytes(code: string): [number, number] {
  return [code.charCodeAt(0), code.charCodeAt(1)];
}

async function main() {
  const network = process.env.NETWORK || "devnet";
  const config = configs[network];

  if (!config) {
    throw new Error(`Unknown network: ${network}. Use devnet, mainnet, or localnet`);
  }

  console.log(`\n🔧 Initializing programs on ${network}\n`);
  console.log("━".repeat(50));

  // Setup connection
  let rpcUrl: string;
  if (network === "mainnet") {
    rpcUrl = process.env.MAINNET_RPC_URL || clusterApiUrl("mainnet-beta");
  } else if (network === "devnet") {
    rpcUrl = clusterApiUrl("devnet");
  } else {
    rpcUrl = "http://localhost:8899";
  }

  const connection = new Connection(rpcUrl, "confirmed");

  // Load wallet
  const walletPath = process.env.WALLET_PATH || 
    path.join(process.env.HOME || "", ".config/solana/id.json");
  
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  console.log(`📍 Authority: ${wallet.publicKey.toString()}`);
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL\n`);

  // Load programs
  const assetRegistryProgram = anchor.workspace.AssetRegistry as Program<AssetRegistry>;
  const complianceProgram = anchor.workspace.Compliance as Program<Compliance>;

  // Initialize Asset Registry
  console.log("1️⃣  Initializing Asset Registry...");
  const [assetRegistryConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    assetRegistryProgram.programId
  );

  try {
    await assetRegistryProgram.methods
      .initialize(config.platformFeeBps)
      .accounts({
        config: assetRegistryConfigPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`   ✅ Initialized with ${config.platformFeeBps / 100}% platform fee`);
  } catch (error: any) {
    if (error.message.includes("already in use")) {
      console.log(`   ⏭️  Already initialized`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Initialize Compliance
  console.log("\n2️⃣  Initializing Compliance...");
  const [complianceConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("compliance-config")],
    complianceProgram.programId
  );

  try {
    await complianceProgram.methods
      .initialize(
        new PublicKey(config.civicGatekeeperNetwork),
        new anchor.BN(config.maxTransferAmount),
        new anchor.BN(config.transferCooldown)
      )
      .accounts({
        authority: wallet.publicKey,
        config: complianceConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`   ✅ Initialized with:`);
    console.log(`      Max transfer: ${config.maxTransferAmount / 1e6} USDC`);
    console.log(`      Cooldown: ${config.transferCooldown}s`);
  } catch (error: any) {
    if (error.message.includes("already in use")) {
      console.log(`   ⏭️  Already initialized`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Add jurisdiction rules
  if (config.jurisdictionRules.length > 0) {
    console.log("\n3️⃣  Adding jurisdiction rules...");
    
    for (const rule of config.jurisdictionRules) {
      const fromBytes = jurisdictionToBytes(rule.from);
      const toBytes = jurisdictionToBytes(rule.to);
      
      const [rulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("jurisdiction"),
          Buffer.from(fromBytes),
          Buffer.from(toBytes),
        ],
        complianceProgram.programId
      );

      try {
        await complianceProgram.methods
          .addJurisdictionRule(
            fromBytes,
            toBytes,
            rule.allowed,
            rule.maxAmount ? new anchor.BN(rule.maxAmount) : null
          )
          .accounts({
            authority: wallet.publicKey,
            config: complianceConfigPda,
            jurisdictionRule: rulePda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        
        const status = rule.allowed ? "✅ Allowed" : "🚫 Blocked";
        const maxStr = rule.maxAmount ? ` (max: ${rule.maxAmount / 1e6} USDC)` : "";
        console.log(`   ${status}: ${rule.from} → ${rule.to}${maxStr}`);
      } catch (error: any) {
        if (error.message.includes("already in use")) {
          console.log(`   ⏭️  ${rule.from} → ${rule.to}: Already exists`);
        } else {
          console.log(`   ❌ ${rule.from} → ${rule.to}: ${error.message}`);
        }
      }
    }
  }

  // Whitelist initial addresses
  if (config.initialWhitelist.length > 0) {
    console.log("\n4️⃣  Whitelisting addresses...");
    
    const kycExpiry = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
    const usJurisdiction = jurisdictionToBytes("US");

    for (const address of config.initialWhitelist) {
      const pubkey = new PublicKey(address);
      const [whitelistPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), pubkey.toBuffer()],
        complianceProgram.programId
      );

      try {
        await complianceProgram.methods
          .addToWhitelist(
            pubkey,
            { institutional: {} },
            usJurisdiction,
            new anchor.BN(kycExpiry)
          )
          .accounts({
            authority: wallet.publicKey,
            config: complianceConfigPda,
            whitelistEntry: whitelistPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        console.log(`   ✅ Whitelisted: ${address.slice(0, 8)}...`);
      } catch (error: any) {
        if (error.message.includes("already in use")) {
          console.log(`   ⏭️  Already whitelisted: ${address.slice(0, 8)}...`);
        } else {
          console.log(`   ❌ Error whitelisting ${address.slice(0, 8)}...: ${error.message}`);
        }
      }
    }
  }

  // Create sample data for devnet/localnet
  if (network === "devnet" || network === "localnet") {
    console.log("\n5️⃣  Creating sample data...");
    
    try {
      // Create a sample USDC-like mint
      const usdcMint = await createMint(
        connection,
        walletKeypair,
        wallet.publicKey,
        null,
        6,
        Keypair.generate(),
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );
      console.log(`   ✅ Sample USDC mint: ${usdcMint.toString()}`);

      // Create a sample asset mint
      const assetMint = await createMint(
        connection,
        walletKeypair,
        wallet.publicKey,
        null,
        6,
        Keypair.generate(),
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID
      );
      console.log(`   ✅ Sample asset mint: ${assetMint.toString()}`);

      // Save sample data
      const sampleData = {
        network,
        usdcMint: usdcMint.toString(),
        assetMint: assetMint.toString(),
        timestamp: new Date().toISOString(),
      };

      const sampleDataPath = path.join(__dirname, `../deployments/${network}-sample-data.json`);
      fs.writeFileSync(sampleDataPath, JSON.stringify(sampleData, null, 2));
      console.log(`   📁 Sample data saved to: deployments/${network}-sample-data.json`);
    } catch (error: any) {
      console.log(`   ⚠️  Could not create sample data: ${error.message}`);
    }
  }

  console.log("\n" + "━".repeat(50));
  console.log("✅ Initialization complete!\n");

  // Summary
  console.log("📋 Summary:");
  console.log(`   Network: ${network}`);
  console.log(`   Asset Registry Config: ${assetRegistryConfigPda.toString()}`);
  console.log(`   Compliance Config: ${complianceConfigPda.toString()}`);
  console.log(`   Jurisdiction Rules: ${config.jurisdictionRules.length}`);
  console.log(`   Whitelisted Addresses: ${config.initialWhitelist.length}\n`);
}

main().catch((error) => {
  console.error("❌ Initialization failed:", error);
  process.exit(1);
});
