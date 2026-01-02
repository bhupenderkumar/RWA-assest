# 🛠️ Development Setup Guide

This guide will help you set up the RWA Asset Tokenization Platform for local development.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20.x LTS | Runtime for API and Web |
| npm/pnpm | Latest | Package management |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Caching and sessions |
| Docker | Latest | Container runtime |
| Rust | Latest | Smart contract development |
| Solana CLI | 1.17+ | Blockchain interaction |
| Anchor | Latest | Solana program framework |

### Installation Commands

```bash
# macOS (using Homebrew)
brew install node@20 postgresql@15 redis docker

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest
avm use latest
```

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/lab49/rwa.git
cd rwa
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# For the web app
cp apps/web/.env.example apps/web/.env.local

# For the API
cp apps/api/.env.example apps/api/.env

# For Docker deployments
cp docker/.env.example docker/.env
```

### 4. Database Setup

Using Docker (recommended):

```bash
docker-compose up -d postgres redis
```

Or manually:

```bash
# Start PostgreSQL
brew services start postgresql@15

# Start Redis
brew services start redis

# Create the database
createdb rwa_asset_dev
```

### 5. Run Database Migrations

```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed
```

### 6. Start Development Servers

```bash
# From the root directory, start all services
npm run dev

# Or start individually:
npm run dev:api   # API server on http://localhost:3001
npm run dev:web   # Web app on http://localhost:3000
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/rwa_asset_dev` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `your-secret-key-here` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_CIVIC_DISABLED` | Disable Civic integration | `false` |
| `PORT` | API server port | `3001` |
| `LOG_LEVEL` | Logging verbosity | `debug` |

See [.env.example](../.env.example) for the complete list of environment variables.

## Project Structure

```
rwa/
├── apps/
│   ├── api/              # Express.js backend API
│   │   ├── prisma/       # Database schema & migrations
│   │   └── src/          # Source code
│   └── web/              # Next.js frontend
│       ├── app/          # App router pages
│       ├── components/   # React components
│       └── providers/    # Context providers
├── packages/
│   ├── contracts/        # Solana smart contracts (Anchor)
│   └── sdk/              # TypeScript SDK
├── docker/               # Docker configurations
├── docs/                 # Documentation
└── infrastructure/       # Kubernetes & monitoring configs
```

## Common Tasks

### Running Tests

```bash
# Run all tests
npm run test

# Run API tests
npm run test:api

# Run web tests
npm run test:web

# Run contract tests
npm run test:contracts
```

### Building for Production

```bash
# Build all packages
npm run build

# Build specific package
npm run build:api
npm run build:web
```

### Database Operations

```bash
# Generate Prisma client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database (caution: deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### Smart Contract Development

```bash
cd packages/contracts

# Build contracts
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Docker Development

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

### Production Docker Build

```bash
cd docker
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find and kill process on port 3001
lsof -ti :3001 | xargs kill -9
```

#### Prisma Client Not Generated

```bash
cd apps/api
npx prisma generate
```

#### Node Modules Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install
```

#### Solana CLI Not Found

```bash
# Add to your shell profile (.zshrc or .bashrc)
export PATH="/Users/$USER/.local/share/solana/install/active_release/bin:$PATH"
```

## IDE Setup

### VS Code Extensions

Recommended extensions for this project:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Prisma
- rust-analyzer
- Solana (by Solana Labs)

### Settings

The project includes recommended VS Code settings in `.vscode/settings.json` (if present).

## Getting Help

- Check the [Architecture Guide](./architecture/ARCHITECTURE.md) for system design
- See [Integration Guide](./integration/INTEGRATION_GUIDE.md) for third-party integrations
- Review [Project Status](./PROJECT_STATUS.md) for current development state
- Open an issue on GitHub for bugs or feature requests

## Contributing

Please read our [Contributing Guide](../CONTRIBUTING.md) before submitting pull requests.
