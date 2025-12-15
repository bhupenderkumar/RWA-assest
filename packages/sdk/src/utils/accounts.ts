import {
  Connection,
  PublicKey,
  GetProgramAccountsFilter,
  MemcmpFilter,
  DataSizeFilter,
} from '@solana/web3.js';
import { BorshCoder, Idl } from '@coral-xyz/anchor';
import BN from 'bn.js';
import {
  ASSET_REGISTRY_PROGRAM_ID,
  ESCROW_PROGRAM_ID,
  AUCTION_PROGRAM_ID,
  COMPLIANCE_PROGRAM_ID,
  ASSET_REGISTRY_SEEDS,
  ESCROW_SEEDS,
  AUCTION_SEEDS,
  COMPLIANCE_SEEDS,
} from '../constants';
import {
  Config,
  Asset,
  MintConfig,
  Escrow,
  Auction,
  Bid,
  ComplianceConfig,
  WhitelistEntry,
  BlacklistEntry,
  JurisdictionRule,
  AssetType,
  AssetStatus,
  EscrowStatus,
  AuctionStatus,
  BidStatus,
  InvestorType,
  AccountNotFoundError,
} from '../types';

// =============================================================================
// PDA Derivation Functions
// =============================================================================

/**
 * Derive the Asset Registry config PDA
 */
export function deriveAssetRegistryConfig(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ASSET_REGISTRY_SEEDS.CONFIG],
    ASSET_REGISTRY_PROGRAM_ID
  );
}

/**
 * Derive an Asset PDA from mint address
 */
export function deriveAsset(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ASSET_REGISTRY_SEEDS.ASSET, mint.toBuffer()],
    ASSET_REGISTRY_PROGRAM_ID
  );
}

/**
 * Derive a Mint Config PDA from mint address
 */
export function deriveMintConfig(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ASSET_REGISTRY_SEEDS.MINT_CONFIG, mint.toBuffer()],
    ASSET_REGISTRY_PROGRAM_ID
  );
}

/**
 * Derive the Mint Authority PDA from mint address
 */
export function deriveMintAuthority(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ASSET_REGISTRY_SEEDS.MINT_AUTHORITY, mint.toBuffer()],
    ASSET_REGISTRY_PROGRAM_ID
  );
}

/**
 * Derive an Escrow PDA from buyer and asset mint
 */
export function deriveEscrow(
  buyer: PublicKey,
  assetMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ESCROW_SEEDS.ESCROW, buyer.toBuffer(), assetMint.toBuffer()],
    ESCROW_PROGRAM_ID
  );
}

/**
 * Derive an Auction PDA from seller, asset mint, and creation timestamp
 */
export function deriveAuction(
  seller: PublicKey,
  assetMint: PublicKey,
  createdAt: BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      AUCTION_SEEDS.AUCTION,
      seller.toBuffer(),
      assetMint.toBuffer(),
      createdAt.toArrayLike(Buffer, 'le', 8),
    ],
    AUCTION_PROGRAM_ID
  );
}

/**
 * Derive a Bid PDA from auction and bidder
 */
export function deriveBid(
  auction: PublicKey,
  bidder: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AUCTION_SEEDS.BID, auction.toBuffer(), bidder.toBuffer()],
    AUCTION_PROGRAM_ID
  );
}

/**
 * Derive the Compliance config PDA
 */
export function deriveComplianceConfig(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [COMPLIANCE_SEEDS.CONFIG],
    COMPLIANCE_PROGRAM_ID
  );
}

/**
 * Derive a Whitelist entry PDA from investor address
 */
export function deriveWhitelistEntry(investor: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [COMPLIANCE_SEEDS.WHITELIST, investor.toBuffer()],
    COMPLIANCE_PROGRAM_ID
  );
}

/**
 * Derive a Blacklist entry PDA from address
 */
export function deriveBlacklistEntry(address: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [COMPLIANCE_SEEDS.BLACKLIST, address.toBuffer()],
    COMPLIANCE_PROGRAM_ID
  );
}

/**
 * Derive a Jurisdiction Rule PDA from jurisdictions
 */
export function deriveJurisdictionRule(
  fromJurisdiction: string,
  toJurisdiction: string
): [PublicKey, number] {
  const fromBytes = Buffer.from(fromJurisdiction.toUpperCase().slice(0, 2));
  const toBytes = Buffer.from(toJurisdiction.toUpperCase().slice(0, 2));

  return PublicKey.findProgramAddressSync(
    [COMPLIANCE_SEEDS.JURISDICTION, fromBytes, toBytes],
    COMPLIANCE_PROGRAM_ID
  );
}

// =============================================================================
// Account Deserialization Functions
// =============================================================================

/**
 * Deserialize Asset Registry Config account data
 */
export function deserializeConfig(data: Buffer): Config {
  // Skip 8-byte discriminator
  const offset = 8;

  return {
    authority: new PublicKey(data.subarray(offset, offset + 32)),
    platformFeeBps: data.readUInt16LE(offset + 32),
    totalAssets: new BN(data.subarray(offset + 34, offset + 42), 'le'),
    bump: data.readUInt8(offset + 42),
  };
}

/**
 * Deserialize Asset account data
 */
export function deserializeAsset(data: Buffer): Asset {
  const offset = 8; // Skip discriminator
  let pos = offset;

  const authority = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const mint = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const nameLen = data.readUInt32LE(pos);
  pos += 4;
  const name = data.subarray(pos, pos + nameLen).toString('utf8');
  pos += nameLen;

  const assetType = data.readUInt8(pos) as AssetType;
  pos += 1;

  const totalValue = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const totalSupply = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const uriLen = data.readUInt32LE(pos);
  pos += 4;
  const metadataUri = data.subarray(pos, pos + uriLen).toString('utf8');
  pos += uriLen;

  const status = data.readUInt8(pos) as AssetStatus;
  pos += 1;

  const createdAt = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const updatedAt = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const bump = data.readUInt8(pos);

  return {
    authority,
    mint,
    name,
    assetType,
    totalValue,
    totalSupply,
    metadataUri,
    status,
    createdAt,
    updatedAt,
    bump,
  };
}

/**
 * Deserialize MintConfig account data
 */
export function deserializeMintConfig(data: Buffer): MintConfig {
  const offset = 8;
  let pos = offset;

  const mint = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const authority = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const permanentDelegate = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const hasTransferHook = data.readUInt8(pos) === 1;
  pos += 1;
  const transferHookProgram = hasTransferHook
    ? new PublicKey(data.subarray(pos, pos + 32))
    : null;
  if (hasTransferHook) pos += 32;

  const nameLen = data.readUInt32LE(pos);
  pos += 4;
  const name = data.subarray(pos, pos + nameLen).toString('utf8');
  pos += nameLen;

  const symbolLen = data.readUInt32LE(pos);
  pos += 4;
  const symbol = data.subarray(pos, pos + symbolLen).toString('utf8');
  pos += symbolLen;

  const uriLen = data.readUInt32LE(pos);
  pos += 4;
  const uri = data.subarray(pos, pos + uriLen).toString('utf8');
  pos += uriLen;

  const decimals = data.readUInt8(pos);
  pos += 1;

  const isFrozen = data.readUInt8(pos) === 1;
  pos += 1;

  const createdAt = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const bump = data.readUInt8(pos);

  return {
    mint,
    authority,
    permanentDelegate,
    transferHookProgram,
    name,
    symbol,
    uri,
    decimals,
    isFrozen,
    createdAt,
    bump,
  };
}

/**
 * Deserialize Escrow account data
 */
export function deserializeEscrow(data: Buffer): Escrow {
  const offset = 8;
  let pos = offset;

  const buyer = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const seller = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const assetMint = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const paymentMint = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const assetAmount = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const paymentAmount = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const status = data.readUInt8(pos) as EscrowStatus;
  pos += 1;

  const createdAt = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const expiresAt = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const bump = data.readUInt8(pos);

  return {
    buyer,
    seller,
    assetMint,
    paymentMint,
    assetAmount,
    paymentAmount,
    status,
    createdAt,
    expiresAt,
    bump,
  };
}

/**
 * Deserialize Auction account data
 */
export function deserializeAuction(data: Buffer): Auction {
  const offset = 8;
  let pos = offset;

  const seller = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const assetMint = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const paymentMint = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const assetAmount = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const startingPrice = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const reservePrice = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const minBidIncrement = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const currentBid = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const currentBidder = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const startTime = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const endTime = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const status = data.readUInt8(pos) as AuctionStatus;
  pos += 1;

  const totalBids = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const createdAt = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const bump = data.readUInt8(pos);

  return {
    seller,
    assetMint,
    paymentMint,
    assetAmount,
    startingPrice,
    reservePrice,
    minBidIncrement,
    currentBid,
    currentBidder,
    startTime,
    endTime,
    status,
    totalBids,
    createdAt,
    bump,
  };
}

/**
 * Deserialize Bid account data
 */
export function deserializeBid(data: Buffer): Bid {
  const offset = 8;
  let pos = offset;

  const auction = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const bidder = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const amount = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const timestamp = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const status = data.readUInt8(pos) as BidStatus;
  pos += 1;

  const bump = data.readUInt8(pos);

  return {
    auction,
    bidder,
    amount,
    timestamp,
    status,
    bump,
  };
}

/**
 * Deserialize ComplianceConfig account data
 */
export function deserializeComplianceConfig(data: Buffer): ComplianceConfig {
  const offset = 8;
  let pos = offset;

  const authority = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const civicGatekeeperNetwork = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const maxTransferAmount = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const transferCooldown = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const isPaused = data.readUInt8(pos) === 1;
  pos += 1;

  const totalWhitelisted = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const totalBlacklisted = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const bump = data.readUInt8(pos);

  return {
    authority,
    civicGatekeeperNetwork,
    maxTransferAmount,
    transferCooldown,
    isPaused,
    totalWhitelisted,
    totalBlacklisted,
    bump,
  };
}

/**
 * Deserialize WhitelistEntry account data
 */
export function deserializeWhitelistEntry(data: Buffer): WhitelistEntry {
  const offset = 8;
  let pos = offset;

  const investor = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const investorType = data.readUInt8(pos) as InvestorType;
  pos += 1;

  const jurisdiction = new Uint8Array(data.subarray(pos, pos + 2));
  pos += 2;

  const kycVerified = data.readUInt8(pos) === 1;
  pos += 1;

  const kycExpiry = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const addedAt = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const lastTransfer = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const isActive = data.readUInt8(pos) === 1;
  pos += 1;

  const bump = data.readUInt8(pos);

  return {
    investor,
    investorType,
    jurisdiction,
    kycVerified,
    kycExpiry,
    addedAt,
    lastTransfer,
    isActive,
    bump,
  };
}

/**
 * Deserialize BlacklistEntry account data
 */
export function deserializeBlacklistEntry(data: Buffer): BlacklistEntry {
  const offset = 8;
  let pos = offset;

  const address = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const reasonLen = data.readUInt32LE(pos);
  pos += 4;
  const reason = data.subarray(pos, pos + reasonLen).toString('utf8');
  pos += reasonLen;

  const addedAt = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const addedBy = new PublicKey(data.subarray(pos, pos + 32));
  pos += 32;

  const isActive = data.readUInt8(pos) === 1;
  pos += 1;

  const bump = data.readUInt8(pos);

  return {
    address,
    reason,
    addedAt,
    addedBy,
    isActive,
    bump,
  };
}

/**
 * Deserialize JurisdictionRule account data
 */
export function deserializeJurisdictionRule(data: Buffer): JurisdictionRule {
  const offset = 8;
  let pos = offset;

  const fromJurisdiction = new Uint8Array(data.subarray(pos, pos + 2));
  pos += 2;

  const toJurisdiction = new Uint8Array(data.subarray(pos, pos + 2));
  pos += 2;

  const isAllowed = data.readUInt8(pos) === 1;
  pos += 1;

  const hasMaxAmount = data.readUInt8(pos) === 1;
  pos += 1;
  const maxAmount = hasMaxAmount
    ? new BN(data.subarray(pos, pos + 8), 'le')
    : null;
  if (hasMaxAmount) pos += 8;

  const createdAt = new BN(data.subarray(pos, pos + 8), 'le');
  pos += 8;

  const bump = data.readUInt8(pos);

  return {
    fromJurisdiction,
    toJurisdiction,
    isAllowed,
    maxAmount,
    createdAt,
    bump,
  };
}

// =============================================================================
// Account Fetching Utilities
// =============================================================================

/**
 * Fetch and deserialize an account
 */
export async function fetchAccount<T>(
  connection: Connection,
  address: PublicKey,
  deserializer: (data: Buffer) => T,
  accountType: string
): Promise<T> {
  const accountInfo = await connection.getAccountInfo(address);

  if (!accountInfo) {
    throw new AccountNotFoundError(accountType, address);
  }

  return deserializer(accountInfo.data as Buffer);
}

/**
 * Fetch multiple accounts of the same type
 */
export async function fetchMultipleAccounts<T>(
  connection: Connection,
  addresses: PublicKey[],
  deserializer: (data: Buffer) => T
): Promise<(T | null)[]> {
  const accountInfos = await connection.getMultipleAccountsInfo(addresses);

  return accountInfos.map((info) => {
    if (!info) return null;
    return deserializer(info.data as Buffer);
  });
}

/**
 * Get all accounts for a program with optional filters
 */
export async function getProgramAccounts<T>(
  connection: Connection,
  programId: PublicKey,
  deserializer: (data: Buffer) => T,
  filters: GetProgramAccountsFilter[] = []
): Promise<{ pubkey: PublicKey; account: T }[]> {
  const accounts = await connection.getProgramAccounts(programId, {
    filters,
  });

  return accounts.map(({ pubkey, account }) => ({
    pubkey,
    account: deserializer(account.data as Buffer),
  }));
}

/**
 * Create a memcmp filter for account queries
 */
export function createMemcmpFilter(
  offset: number,
  bytes: string | PublicKey
): MemcmpFilter {
  return {
    memcmp: {
      offset,
      bytes: bytes instanceof PublicKey ? bytes.toBase58() : bytes,
    },
  };
}

/**
 * Create a data size filter for account queries
 */
export function createDataSizeFilter(dataSize: number): DataSizeFilter {
  return { dataSize };
}

/**
 * Check if an account exists
 */
export async function accountExists(
  connection: Connection,
  address: PublicKey
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(address);
  return accountInfo !== null;
}

/**
 * Get account balance in lamports
 */
export async function getAccountBalance(
  connection: Connection,
  address: PublicKey
): Promise<number> {
  return await connection.getBalance(address);
}

/**
 * Convert jurisdiction bytes to string
 */
export function jurisdictionToString(jurisdiction: Uint8Array): string {
  return String.fromCharCode(jurisdiction[0] ?? 0, jurisdiction[1] ?? 0);
}

/**
 * Convert string to jurisdiction bytes
 */
export function stringToJurisdiction(str: string): Uint8Array {
  const upper = str.toUpperCase().slice(0, 2);
  return new Uint8Array([upper.charCodeAt(0), upper.charCodeAt(1)]);
}