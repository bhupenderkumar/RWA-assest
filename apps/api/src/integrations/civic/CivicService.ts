/**
 * Civic Pass Integration - Main Service
 * 
 * Service for verifying Civic Pass status and managing KYC verification
 */

import { Connection, PublicKey } from '@solana/web3.js';
import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import {
  GatewayToken,
  GatewayTokenState,
  VerificationStatus,
  VerificationLevel,
  CivicVerificationRequest,
  CivicError,
  CivicErrorCode,
} from './types';
import {
  GATEWAY_PROGRAM_ID,
  GATEWAY_TOKEN_SEED,
  CIVIC_API,
  DEFAULT_GATEKEEPER_NETWORK,
  PASS_REFRESH_THRESHOLD,
  BLOCKED_JURISDICTIONS,
} from './constants';

/**
 * CivicService handles all Civic Pass verification operations
 */
export class CivicService {
  private connection: Connection;
  private apiClient: AxiosInstance;
  private gatekeeperNetwork: PublicKey;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment as 'confirmed' | 'finalized',
    });

    this.gatekeeperNetwork = config.civic.gatekeeperNetwork
      ? new PublicKey(config.civic.gatekeeperNetwork)
      : DEFAULT_GATEKEEPER_NETWORK;

    const baseURL =
      config.civic.environment === 'production'
        ? CIVIC_API.PRODUCTION
        : CIVIC_API.DEVELOPMENT;

    this.apiClient = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(config.civic.apiKey && { 'X-API-Key': config.civic.apiKey }),
      },
      timeout: 10000,
    });
  }

  /**
   * Get the gateway token PDA for a wallet
   */
  private getGatewayTokenAddress(wallet: PublicKey): PublicKey {
    const [gatewayTokenAddress] = PublicKey.findProgramAddressSync(
      [
        wallet.toBuffer(),
        Buffer.from(GATEWAY_TOKEN_SEED),
        this.gatekeeperNetwork.toBuffer(),
      ],
      GATEWAY_PROGRAM_ID
    );
    return gatewayTokenAddress;
  }

  /**
   * Parse gateway token account data
   */
  private parseGatewayToken(
    publicKey: PublicKey,
    data: Buffer
  ): GatewayToken | null {
    try {
      // Gateway token account layout:
      // - features (u8)
      // - owner (32 bytes)
      // - issuingGatekeeper (32 bytes)
      // - gatekeeperNetwork (32 bytes)
      // - state (u8)
      // - expiryTime (i64)

      if (data.length < 106) {
        return null;
      }

      const owner = new PublicKey(data.slice(1, 33));
      const issuingGatekeeper = new PublicKey(data.slice(33, 65));
      const gatekeeperNetwork = new PublicKey(data.slice(65, 97));
      const stateValue = data[97];
      const expiryTime = data.readBigInt64LE(98);

      const stateMap: Record<number, GatewayTokenState> = {
        0: GatewayTokenState.ACTIVE,
        1: GatewayTokenState.REVOKED,
        2: GatewayTokenState.FROZEN,
      };

      return {
        publicKey,
        owner,
        issuingGatekeeper,
        gatekeeperNetwork,
        state: stateMap[stateValue] || GatewayTokenState.REVOKED,
        expiryTime: expiryTime > 0 ? Number(expiryTime) : undefined,
        issuanceTime: Date.now() / 1000, // Not stored on-chain, approximate
      };
    } catch (error) {
      logger.error('Failed to parse gateway token', { error, publicKey: publicKey.toBase58() });
      return null;
    }
  }

  /**
   * Check if a wallet has a valid Civic Pass
   */
  async verifyWallet(walletAddress: string): Promise<VerificationStatus> {
    try {
      const wallet = new PublicKey(walletAddress);
      const gatewayTokenAddress = this.getGatewayTokenAddress(wallet);

      const accountInfo = await this.connection.getAccountInfo(gatewayTokenAddress);

      if (!accountInfo) {
        return {
          isVerified: false,
        };
      }

      const gatewayToken = this.parseGatewayToken(
        gatewayTokenAddress,
        accountInfo.data
      );

      if (!gatewayToken) {
        return {
          isVerified: false,
        };
      }

      // Check if token is active
      if (gatewayToken.state !== GatewayTokenState.ACTIVE) {
        return {
          isVerified: false,
          gatewayToken,
        };
      }

      // Check expiration
      if (gatewayToken.expiryTime) {
        const now = Math.floor(Date.now() / 1000);
        if (gatewayToken.expiryTime < now) {
          return {
            isVerified: false,
            gatewayToken: {
              ...gatewayToken,
              state: GatewayTokenState.EXPIRED,
            },
          };
        }
      }

      // Determine verification level based on gatekeeper network
      const level = this.getVerificationLevel(gatewayToken.gatekeeperNetwork);

      return {
        isVerified: true,
        gatewayToken,
        level,
        expiresAt: gatewayToken.expiryTime
          ? new Date(gatewayToken.expiryTime * 1000)
          : undefined,
      };
    } catch (error) {
      logger.error('Failed to verify wallet', { error, walletAddress });
      throw new CivicError(
        'Failed to verify wallet',
        CivicErrorCode.API_ERROR,
        { walletAddress, error: String(error) }
      );
    }
  }

  /**
   * Determine verification level from gatekeeper network
   */
  private getVerificationLevel(network: PublicKey): VerificationLevel {
    const networkKey = network.toBase58();
    
    // ID Verification network = Accredited
    if (networkKey === 'bni1ewus6aMxTxBi5SAfzEmmXLf8KcVFRmTfproJuKw') {
      return VerificationLevel.ACCREDITED;
    }
    
    // Default to basic for other networks
    return VerificationLevel.BASIC;
  }

  /**
   * Check if wallet needs to refresh their pass soon
   */
  async needsRefresh(walletAddress: string): Promise<boolean> {
    const status = await this.verifyWallet(walletAddress);
    
    if (!status.isVerified || !status.expiresAt) {
      return false;
    }

    const now = Date.now();
    const expiresAt = status.expiresAt.getTime();
    const timeUntilExpiry = (expiresAt - now) / 1000;

    return timeUntilExpiry < PASS_REFRESH_THRESHOLD;
  }

  /**
   * Request a new verification for a wallet
   */
  async requestVerification(
    walletAddress: string,
    redirectUrl?: string
  ): Promise<CivicVerificationRequest> {
    try {
      const response = await this.apiClient.post('/verification/request', {
        walletAddress,
        gatekeeperNetwork: this.gatekeeperNetwork.toBase58(),
        redirectUrl: redirectUrl || `${config.frontendUrl}/kyc/callback`,
      });

      return {
        requestId: response.data.requestId,
        verificationUrl: response.data.url,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };
    } catch (error) {
      logger.error('Failed to request verification', { error, walletAddress });
      throw new CivicError(
        'Failed to request verification',
        CivicErrorCode.API_ERROR,
        { walletAddress }
      );
    }
  }

  /**
   * Check jurisdiction compliance
   */
  async checkJurisdiction(walletAddress: string): Promise<{
    allowed: boolean;
    country?: string;
    reason?: string;
  }> {
    const status = await this.verifyWallet(walletAddress);
    
    if (!status.isVerified || !status.metadata?.country) {
      return {
        allowed: false,
        reason: 'Cannot determine jurisdiction without verification',
      };
    }

    const country = status.metadata.country;
    
    if (BLOCKED_JURISDICTIONS.includes(country)) {
      return {
        allowed: false,
        country,
        reason: 'Jurisdiction is blocked due to regulatory restrictions',
      };
    }

    return {
      allowed: true,
      country,
    };
  }

  /**
   * Validate wallet for specific asset type
   */
  async validateForAssetType(
    walletAddress: string,
    assetType: string,
    requiredLevel: VerificationLevel
  ): Promise<{ valid: boolean; reason?: string }> {
    const status = await this.verifyWallet(walletAddress);

    if (!status.isVerified) {
      return {
        valid: false,
        reason: 'Wallet does not have a valid Civic Pass',
      };
    }

    // Check verification level
    const levelOrder = {
      [VerificationLevel.BASIC]: 1,
      [VerificationLevel.ACCREDITED]: 2,
      [VerificationLevel.INSTITUTIONAL]: 3,
    };

    const currentLevel = status.level || VerificationLevel.BASIC;
    
    if (levelOrder[currentLevel] < levelOrder[requiredLevel]) {
      return {
        valid: false,
        reason: `Asset type ${assetType} requires ${requiredLevel} verification, but wallet has ${currentLevel}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get all gateway tokens for a wallet across networks
   */
  async getAllPasses(walletAddress: string): Promise<GatewayToken[]> {
    try {
      const wallet = new PublicKey(walletAddress);
      
      // Query all token accounts owned by gateway program
      const accounts = await this.connection.getProgramAccounts(GATEWAY_PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 1, // Owner starts at offset 1
              bytes: wallet.toBase58(),
            },
          },
        ],
      });

      const tokens: GatewayToken[] = [];
      
      for (const { pubkey, account } of accounts) {
        const token = this.parseGatewayToken(pubkey, account.data);
        if (token) {
          tokens.push(token);
        }
      }

      return tokens;
    } catch (error) {
      logger.error('Failed to get all passes', { error, walletAddress });
      return [];
    }
  }
}

// Export singleton instance
export const civicService = new CivicService();
