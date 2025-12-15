/**
 * Redis Client Singleton
 * 
 * Creates a single instance of Redis for sessions, caching, and pub/sub
 */

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000);
  },
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (error) => {
  logger.error('Redis connection error', { error: error.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

/**
 * Session prefix for storing session tokens
 */
const SESSION_PREFIX = 'session:';
const NONCE_PREFIX = 'nonce:';
const REFRESH_PREFIX = 'refresh:';

/**
 * Store a session token
 */
export async function storeSession(
  userId: string,
  token: string,
  expiresInSeconds: number
): Promise<void> {
  await redis.setex(`${SESSION_PREFIX}${token}`, expiresInSeconds, userId);
}

/**
 * Get user ID from session token
 */
export async function getSession(token: string): Promise<string | null> {
  return redis.get(`${SESSION_PREFIX}${token}`);
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
  await redis.del(`${SESSION_PREFIX}${token}`);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  const keys = await redis.keys(`${SESSION_PREFIX}*`);
  for (const key of keys) {
    const value = await redis.get(key);
    if (value === userId) {
      await redis.del(key);
    }
  }
}

/**
 * Store a nonce for wallet signature verification
 */
export async function storeNonce(
  walletAddress: string,
  nonce: string,
  expiresInSeconds = 300 // 5 minutes
): Promise<void> {
  await redis.setex(`${NONCE_PREFIX}${walletAddress}`, expiresInSeconds, nonce);
}

/**
 * Get and delete nonce (one-time use)
 */
export async function consumeNonce(walletAddress: string): Promise<string | null> {
  const key = `${NONCE_PREFIX}${walletAddress}`;
  const nonce = await redis.get(key);
  if (nonce) {
    await redis.del(key);
  }
  return nonce;
}

/**
 * Store refresh token
 */
export async function storeRefreshToken(
  userId: string,
  refreshToken: string,
  expiresInSeconds: number
): Promise<void> {
  await redis.setex(`${REFRESH_PREFIX}${refreshToken}`, expiresInSeconds, userId);
}

/**
 * Get user ID from refresh token
 */
export async function getRefreshToken(refreshToken: string): Promise<string | null> {
  return redis.get(`${REFRESH_PREFIX}${refreshToken}`);
}

/**
 * Delete refresh token
 */
export async function deleteRefreshToken(refreshToken: string): Promise<void> {
  await redis.del(`${REFRESH_PREFIX}${refreshToken}`);
}

export default redis;