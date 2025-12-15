import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  // Database
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Solana
  solana: {
    network: process.env.SOLANA_NETWORK || 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    wsUrl: process.env.SOLANA_WS_URL || 'wss://api.devnet.solana.com',
    commitment: process.env.SOLANA_COMMITMENT || 'confirmed',
    programs: {
      assetRegistry: process.env.ASSET_REGISTRY_PROGRAM_ID,
      escrow: process.env.ESCROW_PROGRAM_ID,
      auction: process.env.AUCTION_PROGRAM_ID,
      compliance: process.env.COMPLIANCE_PROGRAM_ID,
    },
  },

  // Civic Pass
  civic: {
    gatekeeperNetwork: process.env.CIVIC_GATEKEEPER_NETWORK!,
    apiKey: process.env.CIVIC_API_KEY,
    environment: process.env.CIVIC_ENVIRONMENT || 'development',
  },

  // Securitize
  securitize: {
    baseUrl: process.env.SECURITIZE_BASE_URL!,
    apiKey: process.env.SECURITIZE_API_KEY!,
    issuerId: process.env.SECURITIZE_ISSUER_ID!,
    webhookSecret: process.env.SECURITIZE_WEBHOOK_SECRET,
  },

  // Anchorage Digital
  anchorage: {
    baseUrl: process.env.ANCHORAGE_BASE_URL!,
    apiKey: process.env.ANCHORAGE_API_KEY!,
    apiSecret: process.env.ANCHORAGE_API_SECRET!,
    vaultId: process.env.ANCHORAGE_VAULT_ID!,
  },

  // RedStone
  redstone: {
    apiKey: process.env.REDSTONE_API_KEY,
    dataServiceId: process.env.REDSTONE_DATA_SERVICE_ID || 'redstone-primary-demo',
  },

  // USDC
  usdc: {
    mint: process.env.USDC_MINT!,
  },

  // AWS
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.AWS_S3_BUCKET!,
    sesFromEmail: process.env.AWS_SES_FROM_EMAIL,
  },

  // Authentication
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },

  // Encryption
  encryptionKey: process.env.ENCRYPTION_KEY!,

  // Frontend URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3002',
};

// Validate required configuration
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
