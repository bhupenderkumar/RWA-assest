/**
 * Prisma Client Singleton
 * 
 * Creates a single instance of Prisma Client for the application
 */

import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientOptions = {
  log:
    config.nodeEnv === 'development'
      ? [
          { emit: 'event', level: 'query' } as const,
          { emit: 'event', level: 'error' } as const,
          { emit: 'event', level: 'warn' } as const,
        ]
      : [{ emit: 'event', level: 'error' } as const],
};

export const prisma = global.prisma || new PrismaClient(prismaClientOptions);

if (config.nodeEnv !== 'production') {
  global.prisma = prisma;
}

// Log queries in development
if (config.nodeEnv === 'development') {
  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    logger.debug('Prisma Query', { query: e.query, duration: `${e.duration}ms` });
  });
}

// Log errors
prisma.$on('error' as never, (e: { message: string }) => {
  logger.error('Prisma Error', { error: e.message });
});

export default prisma;