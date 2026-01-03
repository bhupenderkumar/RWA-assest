/**
 * Authentication Middleware
 *
 * JWT verification and user context injection
 */

import { Request, Response, NextFunction } from "express";
import { authService, TokenPayload, AuthError } from "../services/AuthService";
import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";

// Define types locally until Prisma client is generated
type UserRole =
  | "PLATFORM_ADMIN"
  | "BANK_ADMIN"
  | "BANK_VIEWER"
  | "INVESTOR"
  | "AUDITOR";
type KycStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

/**
 * Extended user info attached to request
 */
export interface AuthUser {
  id: string;
  walletAddress: string;
  email: string | null;
  role: UserRole;
  kycStatus: KycStatus;
}

/**
 * Extend Express Request type
 */
declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    token?: string;
  }
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Authentication middleware - requires valid JWT
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "NO_TOKEN",
      });
      return;
    }

    // Verify token
    const payload = authService.verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      id: payload.userId,
      walletAddress: payload.walletAddress,
      email: null, // Will be fetched if needed
      role: payload.role as UserRole,
      kycStatus: payload.kycStatus as KycStatus,
    };
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
      return;
    }

    logger.error("Authentication error", { error });
    res.status(401).json({
      success: false,
      error: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
}

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = authService.verifyAccessToken(token);
      req.user = {
        id: payload.userId,
        walletAddress: payload.walletAddress,
        email: null,
        role: payload.role as UserRole,
        kycStatus: payload.kycStatus as KycStatus,
      };
      req.token = token;
    }

    next();
  } catch {
    // Token invalid but optional, continue without user
    next();
  }
}

/**
 * Role-based access control middleware
 * @param roles - Array of allowed roles
 */
export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "NO_USER",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        code: "FORBIDDEN",
      });
      return;
    }

    next();
  };
}

/**
 * Require verified KYC status
 */
export function requireKYC(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
      code: "NO_USER",
    });
    return;
  }

  if (req.user.kycStatus !== "VERIFIED") {
    res.status(403).json({
      success: false,
      error: "KYC verification required",
      code: "KYC_REQUIRED",
      kycStatus: req.user.kycStatus,
    });
    return;
  }

  next();
}

/**
 * Middleware to fetch full user from database
 */
export async function fetchFullUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        investorProfile: true,
        bank: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: "Account disabled",
        code: "ACCOUNT_DISABLED",
      });
      return;
    }

    req.user.email = user.email;

    next();
  } catch (error) {
    logger.error("Error fetching user", { error, userId: req.user.id });
    next(error);
  }
}

/**
 * Require specific permissions - bank admin access
 */
export function requireBankAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
      code: "NO_USER",
    });
    return;
  }

  const allowedRoles: UserRole[] = ["PLATFORM_ADMIN", "BANK_ADMIN"];
  if (!allowedRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: "Bank admin access required",
      code: "FORBIDDEN",
    });
    return;
  }

  next();
}

/**
 * Require platform admin access
 */
export function requirePlatformAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
      code: "NO_USER",
    });
    return;
  }

  if (req.user.role !== "PLATFORM_ADMIN") {
    res.status(403).json({
      success: false,
      error: "Platform admin access required",
      code: "FORBIDDEN",
    });
    return;
  }

  next();
}
