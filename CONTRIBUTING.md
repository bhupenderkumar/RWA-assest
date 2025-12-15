# Contributing to RWA Asset Tokenization Platform

First off, thank you for considering contributing to the RWA Asset Tokenization Platform! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

1. **Node.js 20+** - JavaScript runtime
2. **Rust** - For Solana smart contracts
3. **Solana CLI** - For local development
4. **Anchor Framework** - For smart contract development
5. **PostgreSQL** - Database
6. **Redis** - Caching

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/rwa-asset.git
cd rwa-asset

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development database
docker-compose up -d postgres redis

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## Development Process

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

Example: `feature/civic-pass-integration`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Testing
- `chore` - Maintenance

Example:
```
feat(auth): add Civic Pass verification

Integrate Civic Pass for KYC verification on investor registration.

Closes #123
```

## Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following coding standards
3. **Write/update tests** for your changes
4. **Update documentation** as needed
5. **Run the test suite** locally
6. **Submit a PR** with a clear description

### PR Requirements

- [ ] Tests pass (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] Documentation updated
- [ ] Smart contracts compile (`anchor build`)
- [ ] No security vulnerabilities

### Review Process

1. Automated checks must pass
2. At least one maintainer approval required
3. All comments must be resolved
4. Branch must be up-to-date with `main`

## Coding Standards

### TypeScript

```typescript
// Use explicit types
const processAsset = async (assetId: string): Promise<Asset> => {
  // Implementation
};

// Use interfaces for objects
interface AssetData {
  name: string;
  value: number;
  type: AssetType;
}

// Handle errors properly
try {
  const result = await someOperation();
} catch (error) {
  logger.error({ error }, 'Operation failed');
  throw new AppError('Operation failed', 500);
}
```

### Rust (Smart Contracts)

```rust
// Use descriptive names
pub fn register_asset(
    ctx: Context<RegisterAsset>,
    name: String,
    asset_type: AssetType,
) -> Result<()> {
    // Validate inputs
    require!(name.len() <= MAX_NAME_LENGTH, ErrorCode::NameTooLong);
    
    // Emit events for important state changes
    emit!(AssetRegistered {
        asset: ctx.accounts.asset.key(),
        name: name.clone(),
    });
    
    Ok(())
}
```

### React/Next.js

```tsx
// Use functional components with hooks
export const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Use custom hooks for complex logic
  const { data, error } = useAssetData(asset.id);
  
  // Handle loading and error states
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <Card>
      {/* Component content */}
    </Card>
  );
};
```

## Testing Guidelines

### Unit Tests

```typescript
describe('AssetService', () => {
  describe('createAsset', () => {
    it('should create an asset with valid data', async () => {
      const result = await assetService.createAsset(validData);
      expect(result.id).toBeDefined();
      expect(result.name).toBe(validData.name);
    });

    it('should throw error for invalid value', async () => {
      await expect(
        assetService.createAsset({ ...validData, value: -1 })
      ).rejects.toThrow('Invalid asset value');
    });
  });
});
```

### Integration Tests

```typescript
describe('Asset API', () => {
  it('should create and retrieve an asset', async () => {
    const createResponse = await request(app)
      .post('/api/v1/assets')
      .send(assetData)
      .expect(201);

    const getResponse = await request(app)
      .get(`/api/v1/assets/${createResponse.body.id}`)
      .expect(200);

    expect(getResponse.body.name).toBe(assetData.name);
  });
});
```

### Smart Contract Tests

```typescript
describe('Asset Registry', () => {
  it('should register a new asset', async () => {
    const tx = await program.methods
      .registerAsset(name, assetType, totalValue, totalSupply, metadataUri)
      .accounts({
        config: configPda,
        asset: assetPda,
        mint: mintKeypair.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const asset = await program.account.asset.fetch(assetPda);
    expect(asset.name).toBe(name);
    expect(asset.status).toEqual({ pending: {} });
  });
});
```

## Documentation

### Code Documentation

- Document all public APIs
- Include JSDoc/rustdoc comments
- Explain complex logic with comments

### README Updates

When adding new features:
- Update feature list
- Add configuration options
- Include usage examples

### Architecture Documentation

For significant changes:
- Update architecture diagrams
- Document integration points
- Explain design decisions

## Questions?

- Open an issue for bugs or feature requests
- Join our Discord for discussions
- Email maintainers for sensitive issues

Thank you for contributing! 🙏
