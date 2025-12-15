/**
 * Securitize Integration - Type Definitions
 * 
 * Types for Securitize tokenization and investor management platform
 */

/**
 * Investor verification status
 */
export enum InvestorStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

/**
 * Investor accreditation type
 */
export enum AccreditationType {
  INDIVIDUAL = 'INDIVIDUAL',
  ENTITY = 'ENTITY',
  QIB = 'QUALIFIED_INSTITUTIONAL_BUYER',
  FOREIGN = 'FOREIGN_INVESTOR',
}

/**
 * Securitize investor profile
 */
export interface SecuritizeInvestor {
  /** Securitize investor ID */
  id: string;
  /** Email address */
  email: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Wallet addresses linked to investor */
  walletAddresses: string[];
  /** Verification status */
  status: InvestorStatus;
  /** Accreditation type */
  accreditationType?: AccreditationType;
  /** Country of residence (ISO 3166-1 alpha-2) */
  country: string;
  /** State/Province if applicable */
  state?: string;
  /** Verification expiration */
  verificationExpiresAt?: Date;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Token security type
 */
export enum SecurityType {
  EQUITY = 'EQUITY',
  DEBT = 'DEBT',
  FUND = 'FUND',
  REIT = 'REIT',
  CONVERTIBLE = 'CONVERTIBLE',
  PREFERRED = 'PREFERRED',
  ASSET_BACKED = 'ASSET_BACKED',
}

/**
 * Token offering status
 */
export enum OfferingStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/**
 * Token offering configuration
 */
export interface TokenOffering {
  /** Offering ID */
  id: string;
  /** Issuer ID */
  issuerId: string;
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Security type */
  securityType: SecurityType;
  /** Offering status */
  status: OfferingStatus;
  /** Total supply of tokens */
  totalSupply: number;
  /** Price per token in cents */
  pricePerToken: number;
  /** Currency (USD, EUR, etc.) */
  currency: string;
  /** Minimum investment amount */
  minimumInvestment: number;
  /** Maximum investment amount */
  maximumInvestment?: number;
  /** Offering start date */
  startDate: Date;
  /** Offering end date */
  endDate?: Date;
  /** Blockchain network */
  blockchain: 'SOLANA' | 'ETHEREUM' | 'POLYGON';
  /** Smart contract address */
  contractAddress?: string;
  /** Metadata */
  metadata?: OfferingMetadata;
}

/**
 * Offering metadata
 */
export interface OfferingMetadata {
  /** Description */
  description: string;
  /** Asset documentation URL */
  documentationUrl?: string;
  /** Legal terms URL */
  legalTermsUrl?: string;
  /** Underlying asset details */
  underlyingAsset?: {
    type: string;
    value: number;
    location?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Investment/Subscription record
 */
export interface Investment {
  /** Investment ID */
  id: string;
  /** Investor ID */
  investorId: string;
  /** Offering ID */
  offeringId: string;
  /** Number of tokens */
  tokenAmount: number;
  /** Total investment amount (in cents) */
  investmentAmount: number;
  /** Status */
  status: InvestmentStatus;
  /** Payment method */
  paymentMethod: PaymentMethod;
  /** Transaction hash if on-chain */
  transactionHash?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Settlement timestamp */
  settledAt?: Date;
}

/**
 * Investment status
 */
export enum InvestmentStatus {
  PENDING = 'PENDING',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAID = 'PAID',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * Payment method
 */
export enum PaymentMethod {
  WIRE = 'WIRE',
  ACH = 'ACH',
  CRYPTO = 'CRYPTO',
  USDC = 'USDC',
}

/**
 * Transfer request for secondary trading
 */
export interface TransferRequest {
  /** Request ID */
  id: string;
  /** Offering ID */
  offeringId: string;
  /** From investor ID */
  fromInvestorId: string;
  /** To investor ID */
  toInvestorId: string;
  /** Number of tokens */
  amount: number;
  /** Transfer status */
  status: TransferStatus;
  /** Compliance check result */
  complianceResult?: ComplianceResult;
  /** Created timestamp */
  createdAt: Date;
  /** Completed timestamp */
  completedAt?: Date;
}

/**
 * Transfer status
 */
export enum TransferStatus {
  PENDING = 'PENDING',
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

/**
 * Compliance check result
 */
export interface ComplianceResult {
  /** Is the transfer allowed */
  allowed: boolean;
  /** Reason if rejected */
  reason?: string;
  /** Checks performed */
  checks: ComplianceCheck[];
}

/**
 * Individual compliance check
 */
export interface ComplianceCheck {
  /** Check type */
  type: string;
  /** Passed or failed */
  passed: boolean;
  /** Details */
  details?: string;
}

/**
 * Webhook event types from Securitize
 */
export enum SecuritizeWebhookEvent {
  INVESTOR_VERIFIED = 'investor.verified',
  INVESTOR_REJECTED = 'investor.rejected',
  INVESTOR_UPDATED = 'investor.updated',
  INVESTMENT_CREATED = 'investment.created',
  INVESTMENT_PAID = 'investment.paid',
  INVESTMENT_SETTLED = 'investment.settled',
  INVESTMENT_CANCELLED = 'investment.cancelled',
  TRANSFER_APPROVED = 'transfer.approved',
  TRANSFER_REJECTED = 'transfer.rejected',
  TRANSFER_COMPLETED = 'transfer.completed',
  OFFERING_OPENED = 'offering.opened',
  OFFERING_CLOSED = 'offering.closed',
}

/**
 * Webhook payload
 */
export interface SecuritizeWebhookPayload {
  /** Event type */
  event: SecuritizeWebhookEvent;
  /** Event timestamp */
  timestamp: Date;
  /** Payload data */
  data: Record<string, unknown>;
  /** Signature for verification */
  signature?: string;
}

/**
 * API error
 */
export class SecuritizeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SecuritizeError';
  }
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
