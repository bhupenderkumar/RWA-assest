/**
 * Civic Pass Integration - Type Definitions
 * 
 * Types for Civic Pass KYC/AML verification on Solana
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Civic Pass state
 */
export enum GatewayTokenState {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  FROZEN = 'FROZEN',
  EXPIRED = 'EXPIRED',
}

/**
 * Gateway token representing a Civic Pass
 */
export interface GatewayToken {
  /** Public key of the gateway token account */
  publicKey: PublicKey;
  /** Gatekeeper network that issued the pass */
  gatekeeperNetwork: PublicKey;
  /** Owner of the gateway token */
  owner: PublicKey;
  /** Current state of the token */
  state: GatewayTokenState;
  /** Expiration timestamp (unix seconds), 0 if no expiration */
  expiryTime?: number;
  /** Issuance timestamp (unix seconds) */
  issuanceTime: number;
  /** Gatekeeper that issued the token */
  issuingGatekeeper: PublicKey;
}

/**
 * KYC verification levels
 */
export enum VerificationLevel {
  /** Basic identity verification */
  BASIC = 'BASIC',
  /** Enhanced due diligence for accredited investors */
  ACCREDITED = 'ACCREDITED',
  /** Institutional verification */
  INSTITUTIONAL = 'INSTITUTIONAL',
}

/**
 * Verification status response
 */
export interface VerificationStatus {
  /** Whether the wallet has a valid Civic Pass */
  isVerified: boolean;
  /** The gateway token if verified */
  gatewayToken?: GatewayToken;
  /** Verification level */
  level?: VerificationLevel;
  /** Expiration date if applicable */
  expiresAt?: Date;
  /** Additional verification metadata */
  metadata?: VerificationMetadata;
}

/**
 * Verification metadata
 */
export interface VerificationMetadata {
  /** Country of residence (ISO 3166-1 alpha-2) */
  country?: string;
  /** Whether the investor is accredited */
  isAccredited?: boolean;
  /** Verification timestamp */
  verifiedAt: Date;
  /** Provider-specific data */
  providerData?: Record<string, unknown>;
}

/**
 * Gatekeeper network configuration
 */
export interface GatekeeperNetworkConfig {
  /** Network public key */
  networkKey: PublicKey;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Required verification level */
  level: VerificationLevel;
  /** Whether the network is active */
  isActive: boolean;
}

/**
 * Civic API response for verification request
 */
export interface CivicVerificationRequest {
  /** Request ID */
  requestId: string;
  /** URL for user to complete verification */
  verificationUrl: string;
  /** Status of the request */
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  /** Expiration of the request */
  expiresAt: Date;
}

/**
 * Civic webhook event types
 */
export enum CivicWebhookEventType {
  PASS_CREATED = 'pass.created',
  PASS_REVOKED = 'pass.revoked',
  PASS_EXPIRED = 'pass.expired',
  PASS_REFRESHED = 'pass.refreshed',
  VERIFICATION_COMPLETED = 'verification.completed',
  VERIFICATION_FAILED = 'verification.failed',
}

/**
 * Civic webhook payload
 */
export interface CivicWebhookPayload {
  /** Event type */
  event: CivicWebhookEventType;
  /** Timestamp of the event */
  timestamp: Date;
  /** Wallet address involved */
  walletAddress: string;
  /** Gatekeeper network */
  gatekeeperNetwork: string;
  /** Event-specific data */
  data: {
    gatewayToken?: string;
    reason?: string;
    level?: VerificationLevel;
  };
}

/**
 * Error codes for Civic integration
 */
export enum CivicErrorCode {
  WALLET_NOT_VERIFIED = 'WALLET_NOT_VERIFIED',
  PASS_EXPIRED = 'PASS_EXPIRED',
  PASS_REVOKED = 'PASS_REVOKED',
  NETWORK_NOT_FOUND = 'NETWORK_NOT_FOUND',
  API_ERROR = 'API_ERROR',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
}

/**
 * Custom error for Civic integration
 */
export class CivicError extends Error {
  constructor(
    message: string,
    public readonly code: CivicErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CivicError';
  }
}
