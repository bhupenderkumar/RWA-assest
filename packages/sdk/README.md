# @rwa-platform/sdk

TypeScript SDK for interacting with the RWA Platform Solana smart contracts.

## Installation

```bash
npm install @rwa-platform/sdk
# or
yarn add @rwa-platform/sdk
# or
pnpm add @rwa-platform/sdk
```

## Features

- **Asset Registry Client** - Register and manage tokenized real-world assets
- **Escrow Client** - Create and manage secure token escrows for purchases
- **Auction Client** - Run English-style auctions for asset tokens
- **Compliance Client** - KYC/AML verification and transfer restrictions

## Quick Start

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import {
  AssetRegistryClient,
  EscrowClient,
  AuctionClient,
  ComplianceClient,
  AssetType,
  InvestorType,
  RPC_ENDPOINTS,
} from '@rwa-platform/sdk';
import BN from 'bn.js';

// Create connection
const connection = new Connection(RPC_ENDPOINTS.devnet);

// Create a wallet adapter (implement the WalletAdapter interface)
const wallet = {
  publicKey: yourPublicKey,
  signTransaction: async (tx) => {
    // Sign the transaction
    return signedTx;
  },
};

// Initialize clients
const assetRegistry = new AssetRegistryClient(connection, wallet);
const escrow = new EscrowClient(connection, wallet);
const auction = new AuctionClient(connection, wallet);
const compliance = new ComplianceClient(connection, wallet);
```

## Asset Registry Client

### Register a New Asset

```typescript
import { AssetType, RegisterAssetParams } from '@rwa-platform/sdk';
import BN from 'bn.js';

// Create a new mint keypair for the asset token
const mintKeypair = Keypair.generate();

// Register the asset
const { signature, assetAddress } = await assetRegistry.registerAsset(
  {
    name: 'Manhattan Office Building',
    assetType: AssetType.RealEstate,
    totalValue: new BN(10_000_000_00), // $10M in cents
    totalSupply: new BN(1_000_000), // 1M tokens
    metadataUri: 'https://arweave.net/asset-metadata.json',
  },
  mintKeypair
);

console.log('Asset registered:', assetAddress.toBase58());
```

### Get Asset Details

```typescript
// Get asset by mint address
const asset = await assetRegistry.getAsset(mintAddress);

console.log('Asset name:', asset.name);
console.log('Total value:', asset.totalValue.toString());
console.log('Status:', asset.status);
```

### List Assets

```typescript
// List all assets
const allAssets = await assetRegistry.listAssets();

// List assets by authority
const myAssets = await assetRegistry.listAssetsByAuthority(wallet.publicKey);

// List assets by type
const realEstateAssets = await assetRegistry.listAssetsByType(AssetType.RealEstate);

// List active assets
const activeAssets = await assetRegistry.listAssetsByStatus(AssetStatus.Active);
```

### Update Asset

```typescript
// Update metadata URI
await assetRegistry.updateAsset(mintAddress, {
  metadataUri: 'https://arweave.net/new-metadata.json',
});

// Update value
await assetRegistry.updateAsset(mintAddress, {
  totalValue: new BN(12_000_000_00), // $12M
});
```

### Asset Lifecycle

```typescript
// Activate asset (make tradeable)
await assetRegistry.activateAsset(mintAddress);

// Freeze asset (pause trading)
await assetRegistry.freezeAsset(mintAddress);

// Unfreeze asset
await assetRegistry.unfreezeAsset(mintAddress);

// Burn/retire asset
await assetRegistry.burnAsset(mintAddress);
```

### Create Token Mint

```typescript
// Create a Token-2022 mint with compliance hooks
const { signature, mintAddress } = await assetRegistry.createTokenMint(
  {
    name: 'RWA Token',
    symbol: 'RWA',
    uri: 'https://arweave.net/token-metadata.json',
    decimals: 6,
    transferHookProgram: COMPLIANCE_PROGRAM_ID, // Optional
  },
  mintKeypair,
  permanentDelegatePubkey
);
```

## Escrow Client

### Create an Escrow

```typescript
// Create escrow for a token purchase
const { signature, escrowAddress } = await escrow.createEscrow({
  seller: sellerPubkey,
  assetMint: assetMintPubkey,
  paymentMint: USDC_MINT.devnet,
  assetAmount: new BN(1000), // 1000 tokens
  paymentAmount: new BN(10_000_00), // $100.00
  expiresAt: new BN(Date.now() / 1000 + 86400), // 24 hours
});
```

### Deposit Payment (Buyer)

```typescript
await escrow.depositPayment(
  assetMintPubkey,
  buyerPaymentAccount, // Buyer's USDC account
  escrowPaymentVault, // Escrow's USDC vault
  USDC_MINT.devnet
);
```

### Deposit Asset (Seller)

```typescript
await escrow.depositAsset(
  buyerPubkey,
  assetMintPubkey,
  sellerAssetAccount, // Seller's token account
  escrowAssetVault // Escrow's token vault
);
```

### Complete or Refund

```typescript
// Release escrow (complete the swap)
await escrow.releaseEscrow(
  buyerPubkey,
  sellerPubkey,
  assetMintPubkey,
  paymentMintPubkey,
  escrowAssetVault,
  escrowPaymentVault,
  buyerAssetAccount,
  sellerPaymentAccount
);

// Refund escrow (cancel)
await escrow.refundEscrow(
  buyerPubkey,
  sellerPubkey,
  assetMintPubkey,
  paymentMintPubkey,
  escrowAssetVault,
  escrowPaymentVault,
  buyerPaymentAccount,
  sellerAssetAccount
);
```

## Auction Client

### Create an Auction

```typescript
const { signature, auctionAddress, createdAt } = await auction.createAuction(
  {
    assetMint: assetMintPubkey,
    paymentMint: USDC_MINT.devnet,
    assetAmount: new BN(1000),
    startingPrice: new BN(100_00), // $1.00 per token
    reservePrice: new BN(150_00), // $1.50 minimum
    minBidIncrement: new BN(10_00), // $0.10 increment
    startTime: new BN(Date.now() / 1000),
    endTime: new BN(Date.now() / 1000 + 86400), // 24 hours
  },
  sellerAssetAccount
);
```

### Place a Bid

```typescript
const { signature, bidAddress } = await auction.placeBid(
  {
    auction: auctionAddress,
    bidAmount: new BN(200_00), // $2.00 per token
  },
  bidderPaymentAccount,
  auctionPaymentVault,
  USDC_MINT.devnet,
  previousBidderPaymentAccount
);
```

### Get Auction State

```typescript
const { auction, isActive, isEnded, timeRemaining, currentHighBid } =
  await auction.getAuctionState(auctionAddress);

console.log('Current high bid:', currentHighBid.toString());
console.log('Time remaining:', timeRemaining, 'seconds');
console.log('Is active:', isActive);
```

### Settle Auction

```typescript
// After auction ends
await auction.settleAuction(
  auctionAddress,
  auctionData,
  auctionAssetVault,
  auctionPaymentVault,
  winnerAssetAccount,
  winnerPaymentAccount,
  sellerAssetAccount,
  sellerPaymentAccount
);
```

### Cancel Auction

```typescript
// Cancel before any bids
await auction.cancelAuction(
  auctionAddress,
  auctionData,
  auctionAssetVault,
  sellerAssetAccount
);
```

## Compliance Client

### Verify an Investor

```typescript
const verification = await compliance.verifyInvestor(investorPubkey);

console.log('Is compliant:', verification.isCompliant);
console.log('Is whitelisted:', verification.isWhitelisted);
console.log('Is blacklisted:', verification.isBlacklisted);
console.log('KYC valid:', verification.kycValid);
console.log('Investor type:', verification.investorType);
console.log('Jurisdiction:', verification.jurisdiction);
```

### Check Transfer Restrictions

```typescript
const { isAllowed, reason } = await compliance.checkTransferRestrictions(
  senderPubkey,
  receiverPubkey,
  new BN(1000)
);

if (!isAllowed) {
  console.log('Transfer blocked:', reason);
}
```

### Manage Whitelist

```typescript
// Add to whitelist
await compliance.addToWhitelist({
  investor: investorPubkey,
  investorType: InvestorType.Accredited,
  jurisdiction: 'US',
  kycExpiry: new BN(Date.now() / 1000 + 365 * 24 * 60 * 60), // 1 year
});

// Remove from whitelist
await compliance.removeFromWhitelist(investorPubkey);

// Check if whitelisted
const isWhitelisted = await compliance.isWhitelisted(investorPubkey);
```

### Manage Blacklist

```typescript
// Add to blacklist
await compliance.addToBlacklist({
  address: suspiciousAddress,
  reason: 'Suspicious activity detected',
});

// Remove from blacklist
await compliance.removeFromBlacklist(address);

// Check if blacklisted
const isBlacklisted = await compliance.isBlacklisted(address);
```

### Jurisdiction Rules

```typescript
// Add jurisdiction rule
await compliance.addJurisdictionRule({
  fromJurisdiction: 'US',
  toJurisdiction: 'CA',
  isAllowed: true,
  maxAmount: new BN(1_000_000_00), // $1M limit
});

// Block transfers between jurisdictions
await compliance.addJurisdictionRule({
  fromJurisdiction: 'US',
  toJurisdiction: 'KP', // North Korea
  isAllowed: false,
});
```

### Pause/Resume Transfers

```typescript
// Pause all transfers
await compliance.pauseTransfers();

// Resume transfers
await compliance.resumeTransfers();
```

## Utility Functions

### Transaction Builder

```typescript
import { TransactionBuilder, toBN, fromBN } from '@rwa-platform/sdk';

// Build a custom transaction
const builder = new TransactionBuilder(connection, wallet.publicKey, {
  computeUnitLimit: 400_000,
  computeUnitPrice: 1000,
});

builder.addInstruction(instruction1);
builder.addInstruction(instruction2);
builder.addSigner(keypair);

const tx = await builder.buildAndSign(wallet);
```

### PDA Derivation

```typescript
import {
  deriveAsset,
  deriveEscrow,
  deriveAuction,
  deriveWhitelistEntry,
} from '@rwa-platform/sdk';

// Get asset PDA
const [assetPda] = deriveAsset(mintPubkey);

// Get escrow PDA
const [escrowPda] = deriveEscrow(buyerPubkey, assetMintPubkey);

// Get whitelist entry PDA
const [whitelistPda] = deriveWhitelistEntry(investorPubkey);
```

### BN Helpers

```typescript
import { toBN, fromBN, formatBN } from '@rwa-platform/sdk';

// Convert number to BN with decimals
const amount = toBN(100.5, 6); // 100500000

// Convert BN to number
const value = fromBN(amount, 6); // 100.5

// Format BN as string
const formatted = formatBN(amount, 6); // "100.500000"
```

## Error Handling

```typescript
import {
  SDKError,
  TransactionError,
  AccountNotFoundError,
  InvalidParameterError,
} from '@rwa-platform/sdk';

try {
  await assetRegistry.registerAsset(params, mint);
} catch (error) {
  if (error instanceof InvalidParameterError) {
    console.log('Invalid parameter:', error.parameter, error.message);
  } else if (error instanceof AccountNotFoundError) {
    console.log('Account not found:', error.accountType, error.address.toBase58());
  } else if (error instanceof TransactionError) {
    console.log('Transaction failed:', error.signature, error.message);
  } else if (error instanceof SDKError) {
    console.log('SDK error:', error.code, error.message);
  }
}
```

## Constants

```typescript
import {
  ASSET_REGISTRY_PROGRAM_ID,
  ESCROW_PROGRAM_ID,
  AUCTION_PROGRAM_ID,
  COMPLIANCE_PROGRAM_ID,
  USDC_MINT,
  RPC_ENDPOINTS,
  WS_ENDPOINTS,
} from '@rwa-platform/sdk';

// Use cluster-specific values
const usdcMint = USDC_MINT.devnet;
const rpcEndpoint = RPC_ENDPOINTS.devnet;
```

## TypeScript Types

All types are fully exported and documented:

```typescript
import type {
  Asset,
  Auction,
  Escrow,
  WhitelistEntry,
  AssetType,
  AuctionStatus,
  InvestorType,
  RegisterAssetParams,
  CreateAuctionParams,
} from '@rwa-platform/sdk';
```

## License

MIT