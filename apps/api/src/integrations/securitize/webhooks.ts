/**
 * Securitize Integration - Webhook Handlers
 * 
 * Handle incoming webhooks from Securitize for async events
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import {
  SecuritizeWebhookEvent,
  SecuritizeWebhookPayload,
} from './types';

const router = Router();

/**
 * Verify webhook signature from Securitize
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!config.securitize.webhookSecret) {
    logger.warn('Webhook secret not configured, skipping verification');
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.securitize.webhookSecret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Webhook handler registry
 */
const webhookHandlers: Record<SecuritizeWebhookEvent, (data: Record<string, unknown>) => Promise<void>> = {
  [SecuritizeWebhookEvent.INVESTOR_VERIFIED]: async (data) => {
    logger.info('Investor verified', { investorId: data.investorId });
    // TODO: Update local database, trigger notifications
  },

  [SecuritizeWebhookEvent.INVESTOR_REJECTED]: async (data) => {
    logger.info('Investor verification rejected', { 
      investorId: data.investorId,
      reason: data.reason,
    });
    // TODO: Update local database, notify investor
  },

  [SecuritizeWebhookEvent.INVESTOR_UPDATED]: async (data) => {
    logger.info('Investor profile updated', { investorId: data.investorId });
    // TODO: Sync local database
  },

  [SecuritizeWebhookEvent.INVESTMENT_CREATED]: async (data) => {
    logger.info('New investment created', {
      investmentId: data.investmentId,
      investorId: data.investorId,
      offeringId: data.offeringId,
    });
    // TODO: Update local records, notify admin
  },

  [SecuritizeWebhookEvent.INVESTMENT_PAID]: async (data) => {
    logger.info('Investment payment confirmed', {
      investmentId: data.investmentId,
    });
    // TODO: Trigger token issuance process
  },

  [SecuritizeWebhookEvent.INVESTMENT_SETTLED]: async (data) => {
    logger.info('Investment settled', {
      investmentId: data.investmentId,
      transactionHash: data.transactionHash,
    });
    // TODO: Update local records, notify investor
  },

  [SecuritizeWebhookEvent.INVESTMENT_CANCELLED]: async (data) => {
    logger.info('Investment cancelled', {
      investmentId: data.investmentId,
      reason: data.reason,
    });
    // TODO: Update local records, process refund if needed
  },

  [SecuritizeWebhookEvent.TRANSFER_APPROVED]: async (data) => {
    logger.info('Transfer approved', {
      transferId: data.transferId,
    });
    // TODO: Execute on-chain transfer
  },

  [SecuritizeWebhookEvent.TRANSFER_REJECTED]: async (data) => {
    logger.info('Transfer rejected', {
      transferId: data.transferId,
      reason: data.reason,
    });
    // TODO: Notify parties involved
  },

  [SecuritizeWebhookEvent.TRANSFER_COMPLETED]: async (data) => {
    logger.info('Transfer completed', {
      transferId: data.transferId,
      transactionHash: data.transactionHash,
    });
    // TODO: Update local records
  },

  [SecuritizeWebhookEvent.OFFERING_OPENED]: async (data) => {
    logger.info('Offering opened', { offeringId: data.offeringId });
    // TODO: Enable investments in local system
  },

  [SecuritizeWebhookEvent.OFFERING_CLOSED]: async (data) => {
    logger.info('Offering closed', { offeringId: data.offeringId });
    // TODO: Disable investments in local system
  },
};

/**
 * Main webhook endpoint
 */
router.post('/securitize', async (req: Request, res: Response) => {
  const signature = req.headers['x-securitize-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  // Verify signature
  if (signature && !verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload: SecuritizeWebhookPayload = {
    event: req.body.event,
    timestamp: new Date(req.body.timestamp),
    data: req.body.data,
  };

  logger.info('Received Securitize webhook', { event: payload.event });

  // Get handler for event
  const handler = webhookHandlers[payload.event];

  if (!handler) {
    logger.warn('Unknown webhook event', { event: payload.event });
    return res.status(200).json({ received: true, handled: false });
  }

  try {
    await handler(payload.data);
    res.status(200).json({ received: true, handled: true });
  } catch (error) {
    logger.error('Webhook handler error', { error, event: payload.event });
    // Return 200 to acknowledge receipt, even on processing errors
    // This prevents retries for errors we can't fix
    res.status(200).json({ received: true, handled: false, error: 'Processing failed' });
  }
});

/**
 * Webhook status endpoint
 */
router.get('/securitize/status', (_req: Request, res: Response) => {
  res.json({
    active: true,
    events: Object.values(SecuritizeWebhookEvent),
  });
});

export const securitizeWebhookRouter = router;

/**
 * Type-safe webhook event emitter for testing
 */
export class SecuritizeWebhookEmitter {
  /**
   * Emit a webhook event (for testing purposes)
   */
  async emit(event: SecuritizeWebhookEvent, data: Record<string, unknown>): Promise<void> {
    const handler = webhookHandlers[event];
    if (handler) {
      await handler(data);
    }
  }
}

export const webhookEmitter = new SecuritizeWebhookEmitter();
