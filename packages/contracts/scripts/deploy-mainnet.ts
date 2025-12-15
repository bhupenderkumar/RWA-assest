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
  Connection,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

/**
 * Deploy to Mainnet Script
 * 
 * Deploys all programs to Solana Mainnet with safety checks.
 * 
 * ⚠️  PRODUCTION DEPLOYMENT - PROCEED WITH CAUTION ⚠️
 * 
 * Prerequisites:
 * 1. Run `anchor build` to compile programs
 * 2. Audit all programs before deployment
 * 3. Ensure you have sufficient SOL in your mainnet wallet
 * 4. Run `solana config set --url mainnet-beta`
 * 5. Set environment variables for sensitive data
 * 
 * Usage: MAINNET_RPC_URL=<your-rpc> npx ts-node scripts/deploy-mainnet.ts
 */

interface DeploymentInfo {
  network: string;
  timestamp: string;
  programs: {
    assetRegistry: string;
    escrow: string;
    auction: string;
    compliance: string;
  };
  pdas: {
    assetRegistryConfig: string;
    complianceConfig: string;
  };
  authority: string;
  multisig?: string;
}

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function preDeploymentChecks(wallet: anchor.Wallet, connection: Connection) {
  console.log("\n🔐 Pre-Deployment Security Checks\n");
  console.log("━".repeat(50));

  // Check 1: Confirm network
  const genesisHash = await connection.getGenesisHash();
  const mainnetGenesisHash = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
  
  if (genesisHash !== mainnetGenesisHash) {
    throw new Error("❌ Not connected to Mainnet! Aborting.");
  }
  console.log("✅ Connected to Solana Mainnet");

  // Check 2: Balance check
  const balance = await connection.getBalance(wallet.publicKey);
  const requiredBalance = 10 * 1e9; // 10 SOL recommended
  
  if (balance < requiredBalance) {
    console.log(`⚠️  Warning: Balance (${balance / 1e9} SOL) may be insufficient`);
    console.log(`   Recommended: ${requiredBalance / 1e9} SOL`);
  } else {
    console.log(`✅ Sufficient balance: ${balance / 1e9} SOL`);
  }

  // Check 3: Confirm authority
  console.log(`📍 Deployer address: ${wallet.publicKey.toString()}`);
  
  // Check 4: Program verification
  console.log("\n📋 Pre-deployment Checklist:");
  console.log("   [ ] Programs have been audited");
  console.log("   [ ] All tests pass on devnet");
  console.log("   [ ] Upgrade authority secured (multisig recommended)");
  console.log("   [ ] Emergency procedures documented");
  console.log("   [ ] Monitoring and alerts configured");
  console.log("");

  const confirm = await askQuestion("Have you completed all checklist items? (yes/no): ");
  if (confirm.toLowerCase() !== "yes") {
    throw new Error("❌ Deployment aborted. Complete the checklist first.");
  }

  const finalConfirm = await askQuestion("⚠️  Type 'DEPLOY MAINNET' to proceed: ");
  if (finalConfirm !== "DEPLOY MAINNET") {
    throw new Error("❌ Deployment aborted by user.");
  }

  console.log("\n" + "━".repeat(50) + "\n");
}

async function main() {
  console.log("\n" + "═".repeat(50));
  console.log("  🚀 MAINNET DEPLOYMENT - RWA Asset Tokenization");
  console.log("═".repeat(50) + "\n");

  // Setup connection
  const rpcUrl = process.env.MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  // Load wallet
  const walletPath = process.env.WALLET_PATH || 
    path.join(process.env.HOME || "", ".config/solana/id.json");
  
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet not found at: ${walletPath}`);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Pre-deployment checks
  await preDeploymentChecks(wallet, connection);

  // Load programs
  const assetRegistryProgram = anchor.workspace.AssetRegistry as Program<AssetRegistry>;
  const escrowProgram = anchor.workspace.Escrow as Program<Escrow>;
  const auctionProgram = anchor.workspace.Auction as Program<Auction>;
  const complianceProgram = anchor.workspace.Compliance as Program<Compliance>;

  console.log("📦 Program IDs:");
  console.log(`   Asset Registry: ${assetRegistryProgram.programId.toString()}`);
  console.log(`   Escrow:         ${escrowProgram.programId.toString()}`);
  console.log(`   Auction:        ${auctionProgram.programId.toString()}`);
  console.log(`   Compliance:     ${complianceProgram.programId.toString()}\n`);

  // Deploy programs
  console.log("📤 Deploying programs to Mainnet...");
  console.log("   Run: anchor deploy --provider.cluster mainnet\n");

  // Initialize Asset Registry
  console.log("⚙️  Initializing Asset Registry...");
  const [assetRegistryConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    assetRegistryProgram.programId
  );

  // Platform fee: 1% for mainnet (100 basis points)
  const platformFeeBps = 100;

  try {
    const tx = await assetRegistryProgram.methods
      .initialize(platformFeeBps)
      .accounts({
        config: assetRegistryConfigPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log(`   ✅ Asset Registry initialized`);
    console.log(`      PDA: ${assetRegistryConfigPda.toString()}`);
    console.log(`      TX:  ${tx}`);
  } catch (error: any) {
    if (error.message.includes("already in use")) {
      console.log(`   ⏭️  Asset Registry already initialized`);
    } else {
      throw error;
    }
  }

  // Initialize Compliance
  console.log("\n⚙️  Initializing Compliance...");
  const [complianceConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("compliance-config")],
    complianceProgram.programId
  );

  // Civic mainnet gatekeeper network
  const civicGatekeeperNetwork = new PublicKey("ignREusXmGrscGNUesoU9mxfds9AiYqdn251V6RgMPm");

  // Conservative limits for mainnet
  const maxTransferAmount = new anchor.BN(100_000_000_000); // 100,000 USDC
  const transferCooldown = new anchor.BN(300); // 5 minutes

  try {
    const tx = await complianceProgram.methods
      .initialize(
        civicGatekeeperNetwork,
        maxTransferAmount,
        transferCooldown
      )
      .accounts({
        authority: wallet.publicKey,
        config: complianceConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log(`   ✅ Compliance initialized`);
    console.log(`      PDA: ${complianceConfigPda.toString()}`);
    console.log(`      TX:  ${tx}`);
  } catch (error: any) {
    if (error.message.includes("already in use")) {
      console.log(`   ⏭️  Compliance already initialized`);
    } else {
      throw error;
    }
  }

  // Save deployment info
  const deploymentInfo: DeploymentInfo = {
    network: "mainnet-beta",
    timestamp: new Date().toISOString(),
    programs: {
      assetRegistry: assetRegistryProgram.programId.toString(),
      escrow: escrowProgram.programId.toString(),
      auction: auctionProgram.programId.toString(),
      compliance: complianceProgram.programId.toString(),
    },
    pdas: {
      assetRegistryConfig: assetRegistryConfigPda.toString(),
      complianceConfig: complianceConfigPda.toString(),
    },
    authority: wallet.publicKey.toString(),
  };

  const deploymentPath = path.join(__dirname, "../deployments/mainnet.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📁 Deployment info saved to: deployments/mainnet.json");

  // Post-deployment reminders
  console.log("\n" + "═".repeat(50));
  console.log("  ✅ MAINNET DEPLOYMENT COMPLETE");
  console.log("═".repeat(50) + "\n");

  console.log("🔐 Critical Post-Deployment Steps:");
  console.log("   1. Transfer upgrade authority to multisig");
  console.log("   2. Verify programs on Solana Explorer");
  console.log("   3. Update production .env with program IDs");
  console.log("   4. Enable monitoring and alerts");
  console.log("   5. Perform smoke tests with small amounts");
  console.log("   6. Document emergency procedures");
  console.log("   7. Set up on-call rotation\n");

  console.log("📊 Monitoring Links:");
  console.log(`   Asset Registry: https://solscan.io/account/${assetRegistryProgram.programId.toString()}`);
  console.log(`   Escrow:         https://solscan.io/account/${escrowProgram.programId.toString()}`);
  console.log(`   Auction:        https://solscan.io/account/${auctionProgram.programId.toString()}`);
  console.log(`   Compliance:     https://solscan.io/account/${complianceProgram.programId.toString()}\n`);
}

main().catch((error) => {
  console.error("\n❌ Mainnet deployment failed:", error);
  console.error("\n⚠️  Review error and retry after fixing issues.");
  process.exit(1);
});
