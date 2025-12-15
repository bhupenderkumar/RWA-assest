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
  clusterApiUrl,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy to Devnet Script
 * 
 * Deploys all programs to Solana Devnet and initializes them.
 * 
 * Prerequisites:
 * 1. Run `anchor build` to compile programs
 * 2. Ensure you have SOL in your devnet wallet
 * 3. Run `solana config set --url devnet`
 * 
 * Usage: npx ts-node scripts/deploy-devnet.ts
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
}

async function main() {
  console.log("🚀 Starting Devnet Deployment...\n");

  // Setup connection and provider
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Load wallet from default Solana CLI location
  const walletPath = process.env.WALLET_PATH || 
    path.join(process.env.HOME || "", ".config/solana/id.json");
  
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  
  console.log(`📍 Deployer: ${walletKeypair.publicKey.toString()}`);
  
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL\n`);

  if (balance < 5 * 1e9) {
    console.log("⚠️  Warning: Low balance. Consider airdropping SOL:");
    console.log("   solana airdrop 5 --url devnet\n");
  }

  // Create Anchor provider
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

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

  // Deploy programs (assuming `anchor deploy --provider.cluster devnet` was run)
  console.log("📤 Deploying programs...");
  console.log("   Run: anchor deploy --provider.cluster devnet\n");

  // Initialize Asset Registry
  console.log("⚙️  Initializing Asset Registry...");
  const [assetRegistryConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    assetRegistryProgram.programId
  );

  try {
    await assetRegistryProgram.methods
      .initialize(250) // 2.5% platform fee
      .accounts({
        config: assetRegistryConfigPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`   ✅ Asset Registry initialized at: ${assetRegistryConfigPda.toString()}`);
  } catch (error: any) {
    if (error.message.includes("already in use")) {
      console.log(`   ⏭️  Asset Registry already initialized at: ${assetRegistryConfigPda.toString()}`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Initialize Compliance
  console.log("⚙️  Initializing Compliance...");
  const [complianceConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("compliance-config")],
    complianceProgram.programId
  );

  // Use a placeholder Civic gatekeeper network for devnet
  // In production, use the actual Civic gatekeeper network
  const civicGatekeeperNetwork = new PublicKey("ignREusXmGrscGNUesoU9mxfds9AiYqdn251V6RgMPm"); // Civic mainnet

  try {
    await complianceProgram.methods
      .initialize(
        civicGatekeeperNetwork,
        new anchor.BN(10_000_000_000_000), // 10M USDC max transfer
        new anchor.BN(0) // No cooldown for devnet testing
      )
      .accounts({
        authority: wallet.publicKey,
        config: complianceConfigPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`   ✅ Compliance initialized at: ${complianceConfigPda.toString()}`);
  } catch (error: any) {
    if (error.message.includes("already in use")) {
      console.log(`   ⏭️  Compliance already initialized at: ${complianceConfigPda.toString()}`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Save deployment info
  const deploymentInfo: DeploymentInfo = {
    network: "devnet",
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

  const deploymentPath = path.join(__dirname, "../deployments/devnet.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📁 Deployment info saved to: deployments/devnet.json");
  console.log("\n✅ Devnet deployment complete!\n");

  console.log("📋 Next steps:");
  console.log("   1. Verify programs on Solana Explorer");
  console.log("   2. Update frontend .env with program IDs");
  console.log("   3. Run integration tests against devnet");
  console.log("   4. Set up monitoring and alerts\n");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
