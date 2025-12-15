/**
 * Request Validation Middleware
 * 
 * Uses Zod schemas to validate request body, query, and params
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Validation targets
 */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Format Zod errors into user-friendly messages
 */
function formatZodErrors(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Create validation middleware for a specific target
 */
function createValidator(schema: ZodSchema, target: ValidationTarget) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[target];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = formatZodErrors(result.error);
        logger.debug('Validation failed', { target, errors });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        });
        return;
      }

      // Replace with parsed/transformed data
      req[target] = result.data;
      next();
    } catch (error) {
      logger.error('Validation error', { error, target });
      res.status(500).json({
        success: false,
        error: 'Validation processing error',
        code: 'VALIDATION_PROCESSING_ERROR',
      });
    }
  };
}

/**
 * Validate request body
 */
export function validateBody(schema: ZodSchema) {
  return createValidator(schema, 'body');
}

/**
 * Validate request query parameters
 */
export function validateQuery(schema: ZodSchema) {
  return createValidator(schema, 'query');
}

/**
 * Validate request URL parameters
 */
export function validateParams(schema: ZodSchema) {
  return createValidator(schema, 'params');
}

/**
 * Combine multiple validators
 */
export function validate(options: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  const middlewares: ((req: Request, res: Response, next: NextFunction) => void)[] = [];

  if (options.params) {
    middlewares.push(createValidator(options.params, 'params'));
  }
  if (options.query) {
    middlewares.push(createValidator(options.query, 'query'));
  }
  if (options.body) {
    middlewares.push(createValidator(options.body, 'body'));
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const runMiddlewares = (index: number): void => {
      if (index >= middlewares.length) {
        next();
        return;
      }

      const middleware = middlewares[index];
      middleware(req, res, (error?: Error | string) => {
        if (error) {
          next(error);
          return;
        }
        // Check if response was sent (validation failed)
        if (res.headersSent) {
          return;
        }
        runMiddlewares(index + 1);
      });
    };

    runMiddlewares(0);
  };
}

/**
 * UUID parameter schema
 */
import { z } from 'zod';

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export type UuidParams = z.infer<typeof uuidParamSchema>;