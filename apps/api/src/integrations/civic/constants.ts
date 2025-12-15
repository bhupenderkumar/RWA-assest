/**
 * Civic Pass Integration - Constants
 * 
 * Gatekeeper networks and configuration constants for Civic Pass
 */

import { PublicKey } from '@solana/web3.js';
import { GatekeeperNetworkConfig, VerificationLevel } from './types';

/**
 * Known Civic Gatekeeper Network addresses
 */
export const GATEKEEPER_NETWORKS = {
  // Civic Identity Verification (Uniqueness)
  UNIQUENESS: new PublicKey('uniqobk8oGh4XBLMqM68K8M2zNu3CdYX7q5go7whQiv'),
  
  // Civic Identity Verification (ID Verification)
  ID_VERIFICATION: new PublicKey('bni1ewus6aMxTxBi5SAfzEmmXLf8KcVFRmTfproJuKw'),
  
  // Civic Captcha Pass
  CAPTCHA: new PublicKey('ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6'),
  
  // Civic Liveness Pass
  LIVENESS: new PublicKey('Gc7fMDNLVDzcoGi8rqFYQmKjFyGzLiVNUdqr4w9KzGN2'),
} as const;

/**
 * Gatekeeper network configurations
 */
export const GATEKEEPER_NETWORK_CONFIGS: Record<string, GatekeeperNetworkConfig> = {
  UNIQUENESS: {
    networkKey: GATEKEEPER_NETWORKS.UNIQUENESS,
    name: 'Civic Uniqueness',
    description: 'Verifies unique human identity without revealing personal information',
    level: VerificationLevel.BASIC,
    isActive: true,
  },
  ID_VERIFICATION: {
    networkKey: GATEKEEPER_NETWORKS.ID_VERIFICATION,
    name: 'Civic ID Verification',
    description: 'Full identity verification with government ID',
    level: VerificationLevel.ACCREDITED,
    isActive: true,
  },
  CAPTCHA: {
    networkKey: GATEKEEPER_NETWORKS.CAPTCHA,
    name: 'Civic Captcha',
    description: 'Basic bot prevention verification',
    level: VerificationLevel.BASIC,
    isActive: true,
  },
  LIVENESS: {
    networkKey: GATEKEEPER_NETWORKS.LIVENESS,
    name: 'Civic Liveness',
    description: 'Liveness detection verification',
    level: VerificationLevel.BASIC,
    isActive: true,
  },
};

/**
 * Default gatekeeper network for RWA platform
 * ID Verification is required for securities compliance
 */
export const DEFAULT_GATEKEEPER_NETWORK = GATEKEEPER_NETWORKS.ID_VERIFICATION;

/**
 * Civic Gateway Program ID
 */
export const GATEWAY_PROGRAM_ID = new PublicKey('gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs');

/**
 * Civic API endpoints
 */
export const CIVIC_API = {
  PRODUCTION: 'https://api.civic.com',
  DEVELOPMENT: 'https://api.civic.com/staging',
} as const;

/**
 * Gateway token account seed
 */
export const GATEWAY_TOKEN_SEED = 'gateway';

/**
 * Default pass expiration time (365 days in seconds)
 */
export const DEFAULT_PASS_EXPIRATION = 365 * 24 * 60 * 60;

/**
 * Minimum time before expiration to trigger refresh (30 days in seconds)
 */
export const PASS_REFRESH_THRESHOLD = 30 * 24 * 60 * 60;

/**
 * Jurisdictions that require enhanced verification
 */
export const ENHANCED_VERIFICATION_JURISDICTIONS = [
  'US', // United States
  'EU', // European Union (represented as single)
  'GB', // United Kingdom
  'SG', // Singapore
  'HK', // Hong Kong
  'JP', // Japan
];

/**
 * Blocked jurisdictions for RWA platform
 */
export const BLOCKED_JURISDICTIONS = [
  'KP', // North Korea
  'IR', // Iran
  'CU', // Cuba
  'SY', // Syria
  'RU', // Russia (sanctions)
  'BY', // Belarus
];

/**
 * Verification level requirements for different asset types
 */
export const ASSET_TYPE_VERIFICATION_REQUIREMENTS: Record<string, VerificationLevel> = {
  REAL_ESTATE: VerificationLevel.ACCREDITED,
  COMMERCIAL_LOAN: VerificationLevel.ACCREDITED,
  EQUIPMENT: VerificationLevel.BASIC,
  INVOICE: VerificationLevel.BASIC,
  TREASURY: VerificationLevel.INSTITUTIONAL,
  PRIVATE_EQUITY: VerificationLevel.ACCREDITED,
};
