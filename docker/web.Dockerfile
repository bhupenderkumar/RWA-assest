# =============================================================================
# RWA Platform Web - Production Dockerfile
# Multi-stage build for optimized Next.js production image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-bullseye AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
        libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm config set strict-ssl false && npm ci --ignore-scripts --workspace=@rwa-asset/web

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-bullseye AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source code
COPY package.json package-lock.json ./
COPY apps/web ./apps/web

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ARG NODE_ENV=production

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
WORKDIR /app/apps/web
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production runner
# -----------------------------------------------------------------------------
FROM node:20-bullseye AS runner

# Install security updates
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        dumb-init \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built application with correct permissions
# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Create public directory (may be empty)
RUN mkdir -p ./apps/web/public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "apps/web/server.js"]