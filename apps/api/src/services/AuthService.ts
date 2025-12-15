/**
 * Authentication Service
 *
 * Handles JWT token generation, wallet signature verification, and session management
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { config } from '../config';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import {
  storeNonce,
  consumeNonce,
  storeSession,
  deleteSession,
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  deleteUserSessions,
} from '../lib/redis';

// Define types locally until Prisma client is generated
type UserRole = 'PLATFORM_ADMIN' | 'BANK_ADMIN' | 'BANK_VIEWER' | 'INVESTOR' | 'AUDITOR';
type KycStatus = 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

interface User {
  id: string;
  email: string | null;
  passwordHash: string | null;
  role: UserRole;
  walletAddress: string | null;
  civicPassToken: string | null;
  kycStatus: KycStatus;
  kycVerifiedAt: Date | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Token payload structure
 */
export interface TokenPayload {
  userId: string;
  walletAddress: string;
  role: UserRole;
  kycStatus: KycStatus;
}

/**
 * Authentication result
 */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    walletAddress: string;
    email: string | null;
    role: UserRole;
    kycStatus: KycStatus;
  };
}

/**
 * Custom authentication errors
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * AuthService handles all authentication operations
 */
export class AuthService {
  private readonly jwtSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.jwtSecret = config.jwt.secret;
    this.accessTokenExpiry = config.jwt.expiresIn;
    this.refreshTokenExpiry = config.jwt.refreshExpiresIn;
  }

  /**
   * Generate a nonce for wallet signature verification
   */
  async generateNonce(walletAddress: string): Promise<string> {
    // Validate wallet address
    try {
      new PublicKey(walletAddress);
    } catch {
      throw new AuthError('Invalid wallet address', 'INVALID_WALLET', 400);
    }

    // Generate a unique nonce
    const timestamp = Date.now();
    const nonce = `Sign this message to authenticate with RWA Platform.\n\nNonce: ${uuidv4()}\nTimestamp: ${timestamp}\nWallet: ${walletAddress}`;

    // Store nonce in Redis (expires in 5 minutes)
    await storeNonce(walletAddress, nonce, 300);

    logger.info('Generated nonce for wallet', { walletAddress });

    return nonce;
  }

  /**
   * Verify wallet signature and authenticate user
   */
  async authenticateWithWallet(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<AuthResult> {
    // Validate wallet address
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch {
      throw new AuthError('Invalid wallet address', 'INVALID_WALLET', 400);
    }

    // Get and consume the stored nonce
    const storedNonce = await consumeNonce(walletAddress);
    if (!storedNonce) {
      throw new AuthError(
        'Nonce not found or expired. Please request a new nonce.',
        'NONCE_EXPIRED',
        400
      );
    }

    // Verify the message matches the stored nonce
    if (message !== storedNonce) {
      throw new AuthError('Message does not match the expected nonce', 'INVALID_MESSAGE', 400);
    }

    // Verify the signature
    const isValid = this.verifySignature(walletAddress, signature, message);
    if (!isValid) {
      throw new AuthError('Invalid signature', 'INVALID_SIGNATURE', 401);
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      // Create new user with wallet
      user = await prisma.user.create({
        data: {
          walletAddress,
          role: 'INVESTOR' as UserRole,
          kycStatus: 'PENDING' as KycStatus,
        },
      });
      logger.info('Created new user via wallet auth', { userId: user.id, walletAddress });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    logger.info('User authenticated via wallet', { userId: user.id, walletAddress });

    return {
      ...tokens,
      user: {
        id: user.id,
        walletAddress: user.walletAddress!,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus,
      },
    };
  }

  /**
   * Verify a Solana wallet signature
   */
  private verifySignature(
    walletAddress: string,
    signature: string,
    message: string
  ): boolean {
    try {
      const publicKeyBytes = new PublicKey(walletAddress).toBytes();
      const messageBytes = new TextEncoder().encode(message);
      // Decode base58 signature (frontend encodes with bs58)
      const signatureBytes = bs58.decode(signature);

      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
      logger.error('Signature verification failed', { error, walletAddress });
      return false;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const payload: TokenPayload = {
      userId: user.id,
      walletAddress: user.walletAddress || '',
      role: user.role,
      kycStatus: user.kycStatus,
    };

    // Parse expiry times to seconds
    const accessExpiresIn = this.parseExpiry(this.accessTokenExpiry);
    const refreshExpiresIn = this.parseExpiry(this.refreshTokenExpiry);

    // Generate access token
    const signOptions: SignOptions = {
      expiresIn: accessExpiresIn,
    };
    const accessToken = jwt.sign(payload, this.jwtSecret, signOptions);

    // Generate refresh token
    const refreshToken = uuidv4();

    // Store tokens in Redis
    await storeSession(user.id, accessToken, accessExpiresIn);
    await storeRefreshToken(user.id, refreshToken, refreshExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }

  /**
   * Parse expiry string (e.g., '7d', '1h') to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60; // Default to 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResult> {
    // Verify refresh token exists in Redis
    const userId = await getRefreshToken(refreshToken);
    if (!userId) {
      throw new AuthError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN', 401);
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 401);
    }

    if (!user.isActive) {
      throw new AuthError('User account is disabled', 'ACCOUNT_DISABLED', 403);
    }

    // Delete old refresh token
    await deleteRefreshToken(refreshToken);

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    logger.info('Access token refreshed', { userId: user.id });

    return {
      ...tokens,
      user: {
        id: user.id,
        walletAddress: user.walletAddress!,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus,
      },
    };
  }

  /**
   * Verify JWT access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Access token expired', 'TOKEN_EXPIRED', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid access token', 'INVALID_TOKEN', 401);
      }
      throw new AuthError('Token verification failed', 'TOKEN_ERROR', 401);
    }
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    // Delete access token session
    await deleteSession(accessToken);

    // Delete refresh token if provided
    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }

    logger.info('User logged out');
  }

  /**
   * Logout user from all sessions
   */
  async logoutAll(userId: string): Promise<void> {
    await deleteUserSessions(userId);
    logger.info('User logged out from all sessions', { userId });
  }

  /**
   * Authenticate with email/password (for admin users)
   */
  async authenticateWithPassword(
    email: string,
    password: string
  ): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    // Import bcrypt dynamically to avoid issues
    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    if (!user.isActive) {
      throw new AuthError('User account is disabled', 'ACCOUNT_DISABLED', 403);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    logger.info('User authenticated via password', { userId: user.id, email });

    return {
      ...tokens,
      user: {
        id: user.id,
        walletAddress: user.walletAddress || '',
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus,
      },
    };
  }
}

// Export singleton instance
export const authService = new AuthService();