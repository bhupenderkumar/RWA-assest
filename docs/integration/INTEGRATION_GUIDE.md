# 🔌 Integration Guide

This guide provides detailed instructions for integrating with the third-party infrastructure providers that power the Solana Bank Asset Tokenization Platform.

## Table of Contents

- [Overview](#overview)
- [1. Civic Pass Integration](#1-civic-pass-integration)
- [2. Securitize Integration](#2-securitize-integration)
- [3. Anchorage Digital Integration](#3-anchorage-digital-integration)
- [4. RedStone Oracle Integration](#4-redstone-oracle-integration)
- [5. Wormhole Integration](#5-wormhole-integration)
- [6. DEX Integration](#6-dex-integration)
- [7. Circle USDC Integration](#7-circle-usdc-integration)

---

## Overview

### Integration Priority

| Priority | Provider | Purpose | Required |
|----------|----------|---------|----------|
| 🔴 P0 | Civic Pass | KYC/AML Compliance | Yes |
| 🔴 P0 | Securitize | Asset Tokenization | Yes |
| 🔴 P0 | Anchorage Digital | Institutional Custody | Yes |
| 🟡 P1 | RedStone | RWA Price Oracles | Recommended |
| 🟢 P2 | Wormhole | Cross-chain Transfers | Optional |
| 🟢 P2 | Jupiter/Raydium | DEX Liquidity | Optional |
| 🟡 P1 | Circle | USDC Payments | Recommended |

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR APPLICATION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 Integration Service Layer                │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │  Civic   │ │Securitize│ │ Anchorage│ │ RedStone │   │    │
│  │  │ Adapter  │ │ Adapter  │ │ Adapter  │ │ Adapter  │   │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │    │
│  │       │            │            │            │          │    │
│  └───────┼────────────┼────────────┼────────────┼──────────┘    │
│          │            │            │            │               │
└──────────┼────────────┼────────────┼────────────┼───────────────┘
           │            │            │            │
           ▼            ▼            ▼            ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
     │  Civic   │ │Securitize│ │ Anchorage│ │ RedStone │
     │   API    │ │   API    │ │   API    │ │   SDK    │
     └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## 1. Civic Pass Integration

Civic Pass provides blockchain-based identity verification through non-transferable attestation tokens. This integration enables KYC/AML compliance for all platform users.

### 1.1 Prerequisites

- Civic Pass Developer Account
- Gatekeeper Network ID
- API Key (for backend operations)

### 1.2 Frontend Integration (React)

#### Installation

```bash
npm install @civic/solana-gateway-react @solana/wallet-adapter-react
```

#### Basic Setup

```tsx
// src/providers/CivicProvider.tsx
import { GatewayProvider } from '@civic/solana-gateway-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

// Civic Gatekeeper Networks
export const CIVIC_NETWORKS = {
  // Production Networks
  UNIQUENESS: 'uniqobk8oGh4XBLMqM68K8M2zNu3CdYX7q5go7whQiv',
  ID_VERIFICATION: 'bni1ewus6aMxTxBi5SAfzEmmXLf8KcVFRmTfproJuKw',
  CAPTCHA: 'ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6',
  
  // Test Network
  TESTNET: 'tgnuXXNMDLK8dy7Xm1TdeGyc95MDym4bvAQCwcW21Bf',
};

interface CivicProviderProps {
  children: React.ReactNode;
  network?: string;
}

export const CivicProvider: React.FC<CivicProviderProps> = ({ 
  children, 
  network = CIVIC_NETWORKS.ID_VERIFICATION 
}) => {
  const { connection } = useConnection();
  const wallet = useWallet();

  return (
    <GatewayProvider
      wallet={wallet}
      gatekeeperNetwork={new PublicKey(network)}
      connection={connection}
      options={{
        autoShowModal: false,
      }}
    >
      {children}
    </GatewayProvider>
  );
};
```

#### KYC Component

```tsx
// src/components/KYCVerification.tsx
import { useGateway } from '@civic/solana-gateway-react';
import { Button, Card, Badge, Spinner } from '@/components/ui';

export const KYCVerification: React.FC = () => {
  const { 
    requestGatewayToken, 
    gatewayToken, 
    gatewayStatus 
  } = useGateway();

  const getStatusBadge = () => {
    switch (gatewayStatus) {
      case 'active':
        return <Badge variant="success">Verified</Badge>;
      case 'checking':
        return <Badge variant="warning">Checking...</Badge>;
      case 'not_requested':
        return <Badge variant="secondary">Not Verified</Badge>;
      default:
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const handleVerify = async () => {
    try {
      await requestGatewayToken();
    } catch (error) {
      console.error('KYC verification failed:', error);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Identity Verification</h3>
        {getStatusBadge()}
      </div>
      
      {gatewayStatus === 'active' ? (
        <div className="space-y-2">
          <p className="text-green-600">✓ Your identity has been verified</p>
          <p className="text-sm text-gray-500">
            Token: {gatewayToken?.publicKey.toBase58().slice(0, 16)}...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">
            Complete identity verification to access investment features.
          </p>
          <Button 
            onClick={handleVerify}
            disabled={gatewayStatus === 'checking'}
          >
            {gatewayStatus === 'checking' ? (
              <>
                <Spinner className="mr-2" /> Verifying...
              </>
            ) : (
              'Start Verification'
            )}
          </Button>
        </div>
      )}
    </Card>
  );
};
```

### 1.3 Backend Verification

```typescript
// src/integrations/civic/CivicService.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { findGatewayToken } from '@identity.com/solana-gateway-ts';

export interface CivicVerificationResult {
  isValid: boolean;
  tokenAddress?: string;
  expirationTime?: Date;
  state?: string;
}

export class CivicService {
  private connection: Connection;
  private gatekeeperNetwork: PublicKey;

  constructor(
    rpcUrl: string,
    gatekeeperNetwork: string
  ) {
    this.connection = new Connection(rpcUrl);
    this.gatekeeperNetwork = new PublicKey(gatekeeperNetwork);
  }

  async verifyUser(walletAddress: string): Promise<CivicVerificationResult> {
    try {
      const wallet = new PublicKey(walletAddress);
      
      const gatewayToken = await findGatewayToken(
        this.connection,
        wallet,
        this.gatekeeperNetwork
      );

      if (!gatewayToken) {
        return { isValid: false };
      }

      const isValid = gatewayToken.state === 'ACTIVE';
      
      return {
        isValid,
        tokenAddress: gatewayToken.publicKey.toBase58(),
        expirationTime: gatewayToken.expiryTime 
          ? new Date(gatewayToken.expiryTime * 1000) 
          : undefined,
        state: gatewayToken.state,
      };
    } catch (error) {
      console.error('Civic verification error:', error);
      return { isValid: false };
    }
  }

  async requireVerification(walletAddress: string): Promise<void> {
    const result = await this.verifyUser(walletAddress);
    
    if (!result.isValid) {
      throw new Error('User is not KYC verified');
    }

    if (result.expirationTime && result.expirationTime < new Date()) {
      throw new Error('KYC verification has expired');
    }
  }
}
```

### 1.4 Smart Contract Integration

```rust
// programs/compliance/src/lib.rs
use anchor_lang::prelude::*;
use solana_gateway::Gateway;

declare_id!("YourComplianceProgramId");

#[program]
pub mod compliance_hook {
    use super::*;

    pub fn verify_and_transfer(
        ctx: Context<VerifyAndTransfer>,
        amount: u64,
    ) -> Result<()> {
        // Verify Civic Pass for sender
        Gateway::verify_gateway_token_account_info(
            &ctx.accounts.gateway_token,
            &ctx.accounts.sender.key(),
            &ctx.accounts.gatekeeper_network.key(),
            None, // Optional features
        ).map_err(|_| ErrorCode::InvalidGatewayToken)?;

        // Verify Civic Pass for receiver
        Gateway::verify_gateway_token_account_info(
            &ctx.accounts.receiver_gateway_token,
            &ctx.accounts.receiver.key(),
            &ctx.accounts.gatekeeper_network.key(),
            None,
        ).map_err(|_| ErrorCode::InvalidReceiverGatewayToken)?;

        // Proceed with transfer
        // ... transfer logic
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct VerifyAndTransfer<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    /// CHECK: Gateway token account
    pub gateway_token: AccountInfo<'info>,
    /// CHECK: Receiver's gateway token
    pub receiver_gateway_token: AccountInfo<'info>,
    /// CHECK: Receiver address
    pub receiver: AccountInfo<'info>,
    /// CHECK: Gatekeeper network
    pub gatekeeper_network: AccountInfo<'info>,
    // ... other accounts
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid gateway token for sender")]
    InvalidGatewayToken,
    #[msg("Invalid gateway token for receiver")]
    InvalidReceiverGatewayToken,
}
```

---

## 2. Securitize Integration

Securitize provides the tokenization infrastructure including transfer agent services, compliance automation, and investor management.

### 2.1 Prerequisites

- Securitize Issuer Account
- API Credentials
- Signed Partnership Agreement

### 2.2 API Client Setup

```typescript
// src/integrations/securitize/SecuritizeClient.ts
import axios, { AxiosInstance } from 'axios';

interface SecuritizeConfig {
  baseUrl: string;
  apiKey: string;
  issuerId: string;
}

interface TokenizationRequest {
  assetName: string;
  assetType: string;
  totalValue: number;
  totalSupply: number;
  documents: string[];
  metadata: Record<string, any>;
}

interface TokenizationResponse {
  tokenId: string;
  mintAddress: string;
  status: string;
  transactionHash?: string;
}

interface InvestorRegistration {
  email: string;
  walletAddress: string;
  firstName: string;
  lastName: string;
  country: string;
  accreditationStatus?: string;
}

export class SecuritizeClient {
  private client: AxiosInstance;
  private issuerId: string;

  constructor(config: SecuritizeConfig) {
    this.issuerId = config.issuerId;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Asset Tokenization
  async createToken(request: TokenizationRequest): Promise<TokenizationResponse> {
    const response = await this.client.post(
      `/issuers/${this.issuerId}/tokens`,
      {
        name: request.assetName,
        type: request.assetType,
        totalValue: request.totalValue,
        totalSupply: request.totalSupply,
        documents: request.documents,
        metadata: request.metadata,
        blockchain: 'solana',
        tokenStandard: 'token-2022',
      }
    );
    return response.data;
  }

  async getTokenStatus(tokenId: string): Promise<TokenizationResponse> {
    const response = await this.client.get(
      `/issuers/${this.issuerId}/tokens/${tokenId}`
    );
    return response.data;
  }

  async mintTokens(tokenId: string, amount: number, recipient: string): Promise<string> {
    const response = await this.client.post(
      `/issuers/${this.issuerId}/tokens/${tokenId}/mint`,
      {
        amount,
        recipient,
      }
    );
    return response.data.transactionHash;
  }

  // Investor Management
  async registerInvestor(investor: InvestorRegistration): Promise<string> {
    const response = await this.client.post(
      `/issuers/${this.issuerId}/investors`,
      investor
    );
    return response.data.investorId;
  }

  async getInvestor(investorId: string): Promise<any> {
    const response = await this.client.get(
      `/issuers/${this.issuerId}/investors/${investorId}`
    );
    return response.data;
  }

  async checkInvestorEligibility(
    investorId: string, 
    tokenId: string
  ): Promise<boolean> {
    const response = await this.client.get(
      `/issuers/${this.issuerId}/investors/${investorId}/eligibility/${tokenId}`
    );
    return response.data.eligible;
  }

  // Compliance
  async getTransferRestrictions(tokenId: string): Promise<any> {
    const response = await this.client.get(
      `/issuers/${this.issuerId}/tokens/${tokenId}/restrictions`
    );
    return response.data;
  }

  async validateTransfer(
    tokenId: string,
    from: string,
    to: string,
    amount: number
  ): Promise<{ valid: boolean; reason?: string }> {
    const response = await this.client.post(
      `/issuers/${this.issuerId}/tokens/${tokenId}/validate-transfer`,
      { from, to, amount }
    );
    return response.data;
  }

  // Document Management
  async uploadDocument(tokenId: string, document: Buffer, type: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', new Blob([document]));
    formData.append('type', type);

    const response = await this.client.post(
      `/issuers/${this.issuerId}/tokens/${tokenId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.documentId;
  }
}
```

### 2.3 Tokenization Service

```typescript
// src/services/TokenizationService.ts
import { SecuritizeClient } from '../integrations/securitize/SecuritizeClient';
import { AssetRepository } from '../repositories/AssetRepository';
import { DocumentService } from './DocumentService';

interface TokenizationParams {
  assetId: string;
  name: string;
  description: string;
  totalValue: number;
  fractionCount: number;
  documentIds: string[];
}

export class TokenizationService {
  constructor(
    private securitize: SecuritizeClient,
    private assetRepo: AssetRepository,
    private documentService: DocumentService
  ) {}

  async initiateTokenization(params: TokenizationParams): Promise<string> {
    // Get asset from database
    const asset = await this.assetRepo.findById(params.assetId);
    if (!asset) throw new Error('Asset not found');

    // Prepare documents
    const documentUrls = await Promise.all(
      params.documentIds.map(id => this.documentService.getUrl(id))
    );

    // Create token with Securitize
    const response = await this.securitize.createToken({
      assetName: params.name,
      assetType: asset.type,
      totalValue: params.totalValue,
      totalSupply: params.fractionCount,
      documents: documentUrls,
      metadata: {
        description: params.description,
        assetId: params.assetId,
        bankId: asset.bankId,
        createdAt: new Date().toISOString(),
      },
    });

    // Update asset with token info
    await this.assetRepo.update(params.assetId, {
      securitizeTokenId: response.tokenId,
      tokenizationStatus: 'pending',
    });

    // Start polling for completion
    this.pollTokenizationStatus(params.assetId, response.tokenId);

    return response.tokenId;
  }

  private async pollTokenizationStatus(assetId: string, tokenId: string): Promise<void> {
    const checkStatus = async () => {
      const status = await this.securitize.getTokenStatus(tokenId);
      
      if (status.status === 'completed') {
        await this.assetRepo.update(assetId, {
          mintAddress: status.mintAddress,
          tokenizationStatus: 'completed',
        });
        return;
      }
      
      if (status.status === 'failed') {
        await this.assetRepo.update(assetId, {
          tokenizationStatus: 'failed',
        });
        return;
      }

      // Continue polling
      setTimeout(checkStatus, 30000); // Check every 30 seconds
    };

    checkStatus();
  }
}
```

### 2.4 Transfer Validation Middleware

```typescript
// src/middleware/transferValidation.ts
import { Request, Response, NextFunction } from 'express';
import { SecuritizeClient } from '../integrations/securitize/SecuritizeClient';

export const validateTransfer = (securitize: SecuritizeClient) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { tokenId, from, to, amount } = req.body;

    try {
      const validation = await securitize.validateTransfer(tokenId, from, to, amount);

      if (!validation.valid) {
        return res.status(403).json({
          error: 'Transfer not allowed',
          reason: validation.reason,
        });
      }

      next();
    } catch (error) {
      console.error('Transfer validation error:', error);
      return res.status(500).json({ error: 'Transfer validation failed' });
    }
  };
};
```

---

## 3. Anchorage Digital Integration

Anchorage Digital provides institutional-grade custody services with OCC federal banking charter.

### 3.1 Prerequisites

- Enterprise Custody Account
- API Credentials
- Vault Configuration

### 3.2 Custody Client

```typescript
// src/integrations/anchorage/AnchorageClient.ts
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

interface AnchorageConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  vaultId: string;
}

interface WalletInfo {
  address: string;
  type: string;
  balance: string;
  network: string;
}

interface TransactionRequest {
  to: string;
  amount: string;
  asset: string;
  memo?: string;
}

interface TransactionResponse {
  transactionId: string;
  status: string;
  signature?: string;
}

export class AnchorageClient {
  private client: AxiosInstance;
  private vaultId: string;
  private apiSecret: string;

  constructor(config: AnchorageConfig) {
    this.vaultId = config.vaultId;
    this.apiSecret = config.apiSecret;

    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    // Add request signing interceptor
    this.client.interceptors.request.use((request) => {
      const timestamp = Date.now().toString();
      const signature = this.signRequest(
        request.method!.toUpperCase(),
        request.url!,
        timestamp,
        JSON.stringify(request.data || {})
      );
      
      request.headers['X-Timestamp'] = timestamp;
      request.headers['X-Signature'] = signature;
      
      return request;
    });
  }

  private signRequest(
    method: string, 
    path: string, 
    timestamp: string, 
    body: string
  ): string {
    const message = `${method}\n${path}\n${timestamp}\n${body}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  // Vault Management
  async getVaultInfo(): Promise<any> {
    const response = await this.client.get(`/vaults/${this.vaultId}`);
    return response.data;
  }

  async getVaultWallets(): Promise<WalletInfo[]> {
    const response = await this.client.get(`/vaults/${this.vaultId}/wallets`);
    return response.data.wallets;
  }

  async createWallet(name: string, network: string = 'solana'): Promise<WalletInfo> {
    const response = await this.client.post(`/vaults/${this.vaultId}/wallets`, {
      name,
      network,
    });
    return response.data;
  }

  // Transaction Management
  async initiateTransfer(
    walletId: string, 
    request: TransactionRequest
  ): Promise<TransactionResponse> {
    const response = await this.client.post(
      `/vaults/${this.vaultId}/wallets/${walletId}/transfers`,
      request
    );
    return response.data;
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionResponse> {
    const response = await this.client.get(
      `/vaults/${this.vaultId}/transactions/${transactionId}`
    );
    return response.data;
  }

  // Balance Management
  async getWalletBalance(walletId: string): Promise<any> {
    const response = await this.client.get(
      `/vaults/${this.vaultId}/wallets/${walletId}/balances`
    );
    return response.data;
  }

  // Staking (for SOL)
  async stakeSOL(walletId: string, amount: string, validator: string): Promise<string> {
    const response = await this.client.post(
      `/vaults/${this.vaultId}/wallets/${walletId}/stake`,
      {
        amount,
        validator,
        network: 'solana',
      }
    );
    return response.data.transactionId;
  }

  async unstakeSOL(walletId: string, stakeAccount: string): Promise<string> {
    const response = await this.client.post(
      `/vaults/${this.vaultId}/wallets/${walletId}/unstake`,
      {
        stakeAccount,
        network: 'solana',
      }
    );
    return response.data.transactionId;
  }
}
```

### 3.3 Custody Service

```typescript
// src/services/CustodyService.ts
import { AnchorageClient } from '../integrations/anchorage/AnchorageClient';

interface CustodyAccount {
  id: string;
  address: string;
  type: 'investor' | 'platform' | 'escrow';
  userId?: string;
}

export class CustodyService {
  private accounts: Map<string, CustodyAccount> = new Map();

  constructor(private anchorage: AnchorageClient) {}

  async createInvestorCustodyAccount(userId: string): Promise<CustodyAccount> {
    const wallet = await this.anchorage.createWallet(
      `investor-${userId}`,
      'solana'
    );

    const account: CustodyAccount = {
      id: wallet.address,
      address: wallet.address,
      type: 'investor',
      userId,
    };

    this.accounts.set(userId, account);
    return account;
  }

  async createEscrowAccount(transactionId: string): Promise<CustodyAccount> {
    const wallet = await this.anchorage.createWallet(
      `escrow-${transactionId}`,
      'solana'
    );

    return {
      id: wallet.address,
      address: wallet.address,
      type: 'escrow',
    };
  }

  async transferToEscrow(
    fromWalletId: string,
    escrowAddress: string,
    amount: string,
    asset: string
  ): Promise<string> {
    const response = await this.anchorage.initiateTransfer(fromWalletId, {
      to: escrowAddress,
      amount,
      asset,
      memo: 'Escrow deposit',
    });
    return response.transactionId;
  }

  async releaseFromEscrow(
    escrowWalletId: string,
    toAddress: string,
    amount: string,
    asset: string
  ): Promise<string> {
    const response = await this.anchorage.initiateTransfer(escrowWalletId, {
      to: toAddress,
      amount,
      asset,
      memo: 'Escrow release',
    });
    return response.transactionId;
  }

  async getBalance(walletId: string): Promise<any> {
    return this.anchorage.getWalletBalance(walletId);
  }
}
```

---

## 4. RedStone Oracle Integration

RedStone provides RWA-specific price feeds for tokenized assets.

### 4.1 Prerequisites

- RedStone API Key
- Data Feed Access

### 4.2 Oracle Client

```typescript
// src/integrations/redstone/RedStoneClient.ts
import { WrapperBuilder } from '@redstone-finance/evm-connector';
import { RedstonePayload, DataPackage } from '@redstone-finance/protocol';

interface PriceData {
  symbol: string;
  value: number;
  timestamp: number;
  source: string;
}

export class RedStoneClient {
  private dataServiceId: string;
  private apiKey: string;

  constructor(dataServiceId: string, apiKey: string) {
    this.dataServiceId = dataServiceId;
    this.apiKey = apiKey;
  }

  async getPrice(symbol: string): Promise<PriceData> {
    const response = await fetch(
      `https://api.redstone.finance/prices?symbol=${symbol}&provider=${this.dataServiceId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    const data = await response.json();
    
    return {
      symbol,
      value: data.value,
      timestamp: data.timestamp,
      source: 'redstone',
    };
  }

  async getRWAPrice(tokenId: string): Promise<PriceData> {
    // Get price for RWA tokens (tokenized treasuries, credit, etc.)
    const response = await fetch(
      `https://api.redstone.finance/rwa/${tokenId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    const data = await response.json();
    
    return {
      symbol: tokenId,
      value: data.price,
      timestamp: data.timestamp,
      source: 'redstone-rwa',
    };
  }

  async getMultiplePrices(symbols: string[]): Promise<Map<string, PriceData>> {
    const prices = new Map<string, PriceData>();
    
    const response = await fetch(
      `https://api.redstone.finance/prices?symbols=${symbols.join(',')}&provider=${this.dataServiceId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    const data = await response.json();
    
    for (const symbol of symbols) {
      if (data[symbol]) {
        prices.set(symbol, {
          symbol,
          value: data[symbol].value,
          timestamp: data[symbol].timestamp,
          source: 'redstone',
        });
      }
    }

    return prices;
  }

  // Generate signed data for on-chain verification
  async getSignedPriceData(symbols: string[]): Promise<RedstonePayload> {
    const response = await fetch(
      `https://api.redstone.finance/data-packages/latest/${this.dataServiceId}?symbols=${symbols.join(',')}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    return response.json();
  }
}
```

### 4.3 Price Service

```typescript
// src/services/PriceService.ts
import { RedStoneClient } from '../integrations/redstone/RedStoneClient';
import { Cache } from '../utils/cache';

export class PriceService {
  private cache: Cache;
  private cacheTTL = 60000; // 1 minute

  constructor(private redstone: RedStoneClient) {
    this.cache = new Cache();
  }

  async getAssetPrice(tokenId: string): Promise<number> {
    const cacheKey = `price:${tokenId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) return cached as number;

    const priceData = await this.redstone.getRWAPrice(tokenId);
    this.cache.set(cacheKey, priceData.value, this.cacheTTL);
    
    return priceData.value;
  }

  async calculateNAV(
    tokenId: string, 
    totalSupply: number
  ): Promise<{ nav: number; pricePerToken: number }> {
    const price = await this.getAssetPrice(tokenId);
    const nav = price;
    const pricePerToken = nav / totalSupply;
    
    return { nav, pricePerToken };
  }

  async getPortfolioValue(
    holdings: Array<{ tokenId: string; amount: number }>
  ): Promise<number> {
    let totalValue = 0;

    for (const holding of holdings) {
      const price = await this.getAssetPrice(holding.tokenId);
      totalValue += price * holding.amount;
    }

    return totalValue;
  }
}
```

---

## 5. Wormhole Integration

Wormhole enables cross-chain token transfers for multi-chain support.

### 5.1 Prerequisites

- Wormhole SDK
- Supported chain configurations

### 5.2 Bridge Client

```typescript
// src/integrations/wormhole/WormholeClient.ts
import {
  ChainId,
  CHAIN_ID_SOLANA,
  CHAIN_ID_ETH,
  getEmitterAddressSolana,
  parseSequenceFromLogSolana,
  getSignedVAAWithRetry,
} from '@certusone/wormhole-sdk';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

interface BridgeTransfer {
  sourceChain: ChainId;
  targetChain: ChainId;
  amount: string;
  tokenAddress: string;
  recipient: string;
}

interface VAA {
  bytes: Uint8Array;
  sequence: string;
}

export class WormholeClient {
  private connection: Connection;
  private bridgeAddress: PublicKey;
  private tokenBridgeAddress: PublicKey;

  constructor(
    connection: Connection,
    bridgeAddress: string,
    tokenBridgeAddress: string
  ) {
    this.connection = connection;
    this.bridgeAddress = new PublicKey(bridgeAddress);
    this.tokenBridgeAddress = new PublicKey(tokenBridgeAddress);
  }

  async initiateTransfer(
    transfer: BridgeTransfer,
    signer: any
  ): Promise<{ txSignature: string; sequence: string }> {
    // Implementation depends on specific Wormhole SDK version
    // This is a simplified example
    
    const transaction = new Transaction();
    // Add transfer instruction
    // ...

    const txSignature = await this.connection.sendTransaction(
      transaction,
      [signer]
    );

    // Parse sequence from transaction logs
    const txInfo = await this.connection.getTransaction(txSignature);
    const sequence = parseSequenceFromLogSolana(txInfo!);

    return { txSignature, sequence };
  }

  async getVAA(
    emitterChain: ChainId,
    emitterAddress: string,
    sequence: string
  ): Promise<VAA> {
    const { vaaBytes } = await getSignedVAAWithRetry(
      ['https://wormhole-v2-mainnet-api.certus.one'],
      emitterChain,
      emitterAddress,
      sequence
    );

    return {
      bytes: vaaBytes,
      sequence,
    };
  }

  async redeemOnTarget(
    vaa: VAA,
    targetChain: ChainId,
    signer: any
  ): Promise<string> {
    // Redeem tokens on target chain
    // Implementation varies by target chain
    // ...
    return 'tx_signature';
  }

  getSupportedChains(): ChainId[] {
    return [
      CHAIN_ID_SOLANA,
      CHAIN_ID_ETH,
      // Add more chains as needed
    ];
  }
}
```

---

## 6. DEX Integration

Integrate with Solana DEXs for secondary market liquidity.

### 6.1 Jupiter Aggregator

```typescript
// src/integrations/dex/JupiterClient.ts
import { Jupiter, RouteInfo } from '@jup-ag/core';
import { Connection, PublicKey } from '@solana/web3.js';

export class JupiterClient {
  private jupiter: Jupiter;

  constructor(connection: Connection) {
    // Jupiter initialization
  }

  async findBestRoute(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number,
    slippage: number = 0.5
  ): Promise<RouteInfo | null> {
    const routes = await this.jupiter.computeRoutes({
      inputMint,
      outputMint,
      amount,
      slippageBps: slippage * 100,
    });

    return routes.routesInfos[0] || null;
  }

  async executeSwap(
    route: RouteInfo,
    wallet: any
  ): Promise<string> {
    const { execute } = await this.jupiter.exchange({ routeInfo: route });
    const result = await execute();
    
    if ('txid' in result) {
      return result.txid;
    }
    
    throw new Error('Swap failed');
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number
  ): Promise<{
    inputAmount: number;
    outputAmount: number;
    priceImpact: number;
  }> {
    const route = await this.findBestRoute(
      new PublicKey(inputMint),
      new PublicKey(outputMint),
      amount
    );

    if (!route) {
      throw new Error('No route found');
    }

    return {
      inputAmount: Number(route.inAmount),
      outputAmount: Number(route.outAmount),
      priceImpact: route.priceImpactPct,
    };
  }
}
```

---

## 7. Circle USDC Integration

Circle provides USDC for fiat on/off ramp functionality.

### 7.1 USDC Configuration

```typescript
// src/integrations/circle/USDCConfig.ts
export const USDC_CONFIG = {
  // Solana Mainnet USDC
  mainnet: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
  // Solana Devnet USDC
  devnet: {
    mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    decimals: 6,
  },
};
```

### 7.2 Payment Service

```typescript
// src/services/PaymentService.ts
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction 
} from '@solana/spl-token';
import { USDC_CONFIG } from '../integrations/circle/USDCConfig';

export class PaymentService {
  private connection: Connection;
  private usdcMint: PublicKey;

  constructor(connection: Connection, network: 'mainnet' | 'devnet' = 'mainnet') {
    this.connection = connection;
    this.usdcMint = new PublicKey(USDC_CONFIG[network].mint);
  }

  async createPaymentTransaction(
    from: PublicKey,
    to: PublicKey,
    amount: number // Amount in USDC (e.g., 100.50)
  ): Promise<Transaction> {
    const fromATA = await getAssociatedTokenAddress(this.usdcMint, from);
    const toATA = await getAssociatedTokenAddress(this.usdcMint, to);

    const amountLamports = Math.floor(amount * 1e6); // Convert to 6 decimals

    const transaction = new Transaction().add(
      createTransferInstruction(
        fromATA,
        toATA,
        from,
        amountLamports
      )
    );

    return transaction;
  }

  async getUSDCBalance(wallet: PublicKey): Promise<number> {
    const ata = await getAssociatedTokenAddress(this.usdcMint, wallet);
    
    try {
      const balance = await this.connection.getTokenAccountBalance(ata);
      return Number(balance.value.uiAmount);
    } catch {
      return 0;
    }
  }
}
```

---

## Environment Configuration

### Complete Environment Variables

```env
# ===========================================
# SOLANA CONFIGURATION
# ===========================================
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com
SOLANA_COMMITMENT=confirmed

# ===========================================
# CIVIC PASS CONFIGURATION
# ===========================================
CIVIC_GATEKEEPER_NETWORK=bni1ewus6aMxTxBi5SAfzEmmXLf8KcVFRmTfproJuKw
CIVIC_API_KEY=your_civic_api_key
CIVIC_ENVIRONMENT=production

# ===========================================
# SECURITIZE CONFIGURATION
# ===========================================
SECURITIZE_BASE_URL=https://api.securitize.io/v1
SECURITIZE_API_KEY=your_securitize_api_key
SECURITIZE_ISSUER_ID=your_issuer_id
SECURITIZE_WEBHOOK_SECRET=your_webhook_secret

# ===========================================
# ANCHORAGE DIGITAL CONFIGURATION
# ===========================================
ANCHORAGE_BASE_URL=https://api.anchorage.com/v1
ANCHORAGE_API_KEY=your_anchorage_api_key
ANCHORAGE_API_SECRET=your_anchorage_api_secret
ANCHORAGE_VAULT_ID=your_vault_id

# ===========================================
# REDSTONE CONFIGURATION
# ===========================================
REDSTONE_API_KEY=your_redstone_api_key
REDSTONE_DATA_SERVICE_ID=redstone-primary-prod

# ===========================================
# WORMHOLE CONFIGURATION
# ===========================================
WORMHOLE_BRIDGE_ADDRESS=worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth
WORMHOLE_TOKEN_BRIDGE_ADDRESS=wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb

# ===========================================
# CIRCLE/USDC CONFIGURATION
# ===========================================
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# ===========================================
# DEX CONFIGURATION
# ===========================================
JUPITER_API_URL=https://quote-api.jup.ag/v6
```

---

## Testing Integrations

### Integration Test Suite

```typescript
// tests/integrations/integration.test.ts
import { CivicService } from '../src/integrations/civic/CivicService';
import { SecuritizeClient } from '../src/integrations/securitize/SecuritizeClient';
import { AnchorageClient } from '../src/integrations/anchorage/AnchorageClient';

describe('Integration Tests', () => {
  describe('Civic Pass', () => {
    it('should verify a valid Civic Pass', async () => {
      const civic = new CivicService(
        process.env.SOLANA_RPC_URL!,
        process.env.CIVIC_GATEKEEPER_NETWORK!
      );
      
      const result = await civic.verifyUser('test_wallet_address');
      expect(result).toBeDefined();
    });
  });

  describe('Securitize', () => {
    it('should fetch token status', async () => {
      const securitize = new SecuritizeClient({
        baseUrl: process.env.SECURITIZE_BASE_URL!,
        apiKey: process.env.SECURITIZE_API_KEY!,
        issuerId: process.env.SECURITIZE_ISSUER_ID!,
      });
      
      const status = await securitize.getTokenStatus('test_token_id');
      expect(status).toBeDefined();
    });
  });

  describe('Anchorage', () => {
    it('should get vault info', async () => {
      const anchorage = new AnchorageClient({
        baseUrl: process.env.ANCHORAGE_BASE_URL!,
        apiKey: process.env.ANCHORAGE_API_KEY!,
        apiSecret: process.env.ANCHORAGE_API_SECRET!,
        vaultId: process.env.ANCHORAGE_VAULT_ID!,
      });
      
      const info = await anchorage.getVaultInfo();
      expect(info).toBeDefined();
    });
  });
});
```

---

## Troubleshooting

### Common Issues

#### Civic Pass

| Issue | Solution |
|-------|----------|
| Token not found | Ensure user has completed KYC flow |
| Token expired | User needs to refresh their Civic Pass |
| Wrong network | Verify gatekeeper network ID matches environment |

#### Securitize

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check API key and issuer ID |
| Tokenization pending | Wait for compliance review |
| Transfer rejected | Check investor eligibility |

#### Anchorage

| Issue | Solution |
|-------|----------|
| Signature invalid | Verify timestamp sync and secret |
| Wallet not found | Ensure wallet was created in correct vault |
| Transaction pending | Allow time for multi-sig approval |

---

## Next Steps

1. **Get API Access**: Contact each provider for enterprise credentials
2. **Set Up Dev Environment**: Configure test/staging environments
3. **Build Adapters**: Implement the integration adapters shown above
4. **Test End-to-End**: Run through complete user flows
5. **Security Review**: Have integrations audited before production

---

*Last Updated: December 2024*
