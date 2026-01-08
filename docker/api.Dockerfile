# =============================================================================
# RWA Platform API - Production Dockerfile
# Multi-stage build for optimized production image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:25-bullseye AS deps

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including devDependencies for build)
RUN npm config set strict-ssl false && npm ci --ignore-scripts --workspace=@rwa-asset/api

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:25-bullseye AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source code
COPY package.json package-lock.json ./
COPY apps/api ./apps/api

# Generate Prisma client
WORKDIR /app/apps/api
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

# Build TypeScript
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production dependencies
# -----------------------------------------------------------------------------
FROM node:25-bullseye AS prod-deps

RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN npm config set strict-ssl false && npm ci --ignore-scripts --workspace=@rwa-asset/api --omit=dev

# Generate Prisma client for production
COPY apps/api/prisma ./apps/api/prisma
WORKDIR /app/apps/api
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

# -----------------------------------------------------------------------------
# Stage 4: Production runner
# -----------------------------------------------------------------------------
FROM node:25-bullseye AS runner

# Install security updates and required packages
RUN apt-get update && apt-get install -y \
    dumb-init \
    curl \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Update certificates to fix trust issues
RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates

# Replace unavailable packages with alternatives
RUN apt-get install -y bash curl && apt-get upgrade -y

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 rwa

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000

# Copy production dependencies
COPY --from=prod-deps --chown=rwa:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=rwa:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# Copy built application
COPY --from=builder --chown=rwa:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=rwa:nodejs /app/apps/api/prisma ./apps/api/prisma

# Copy package files for runtime
COPY --chown=rwa:nodejs package.json ./
COPY --chown=rwa:nodejs apps/api/package.json ./apps/api/

# Set working directory
WORKDIR /app/apps/api

# Switch to non-root user
USER rwa

# Expose API port
EXPOSE 4000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/api/v1/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]