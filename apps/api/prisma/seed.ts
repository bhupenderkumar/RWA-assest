/**
 * Database Seed Script
 * 
 * Populates the database with sample data for development
 * Run with: npm run seed
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ===========================================
  // Create Platform Admin
  // ===========================================
  const adminPasswordHash = await hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rwa-platform.com' },
    update: {},
    create: {
      email: 'admin@rwa-platform.com',
      passwordHash: adminPasswordHash,
      role: 'PLATFORM_ADMIN',
      kycStatus: 'VERIFIED',
      kycVerifiedAt: new Date(),
      isActive: true,
    },
  });
  console.log('✅ Created platform admin:', admin.email);

  // ===========================================
  // Create Sample Banks
  // ===========================================
  const bankAdmin1Hash = await hash('bank123', 10);
  
  const bankAdmin1 = await prisma.user.upsert({
    where: { email: 'bank1@example.com' },
    update: {},
    create: {
      email: 'bank1@example.com',
      passwordHash: bankAdmin1Hash,
      role: 'BANK_ADMIN',
      kycStatus: 'VERIFIED',
      kycVerifiedAt: new Date(),
      isActive: true,
    },
  });

  const bank1 = await prisma.bank.upsert({
    where: { adminUserId: bankAdmin1.id },
    update: {},
    create: {
      name: 'First National Bank',
      registrationNumber: 'FNB-12345',
      jurisdiction: 'US',
      adminUserId: bankAdmin1.id,
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
  });
  console.log('✅ Created bank:', bank1.name);

  const bankAdmin2Hash = await hash('bank123', 10);
  
  const bankAdmin2 = await prisma.user.upsert({
    where: { email: 'bank2@example.com' },
    update: {},
    create: {
      email: 'bank2@example.com',
      passwordHash: bankAdmin2Hash,
      role: 'BANK_ADMIN',
      kycStatus: 'VERIFIED',
      kycVerifiedAt: new Date(),
      isActive: true,
    },
  });

  const bank2 = await prisma.bank.upsert({
    where: { adminUserId: bankAdmin2.id },
    update: {},
    create: {
      name: 'Global Investment Bank',
      registrationNumber: 'GIB-67890',
      jurisdiction: 'UK',
      adminUserId: bankAdmin2.id,
      status: 'VERIFIED',
      verifiedAt: new Date(),
    },
  });
  console.log('✅ Created bank:', bank2.name);

  // ===========================================
  // Create Sample Investors
  // ===========================================
  const investor1 = await prisma.user.upsert({
    where: { email: 'investor1@example.com' },
    update: {},
    create: {
      email: 'investor1@example.com',
      walletAddress: 'DemoWallet1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      role: 'INVESTOR',
      kycStatus: 'VERIFIED',
      kycVerifiedAt: new Date(),
      isActive: true,
    },
  });

  await prisma.investorProfile.upsert({
    where: { userId: investor1.id },
    update: {},
    create: {
      userId: investor1.id,
      firstName: 'John',
      lastName: 'Doe',
      country: 'US',
      investorType: 'INDIVIDUAL',
      accreditationStatus: 'VERIFIED',
      accreditedAt: new Date(),
      riskTolerance: 'MEDIUM',
    },
  });
  console.log('✅ Created investor:', investor1.email);

  const investor2 = await prisma.user.upsert({
    where: { email: 'investor2@example.com' },
    update: {},
    create: {
      email: 'investor2@example.com',
      walletAddress: 'DemoWallet2xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      role: 'INVESTOR',
      kycStatus: 'VERIFIED',
      kycVerifiedAt: new Date(),
      isActive: true,
    },
  });

  await prisma.investorProfile.upsert({
    where: { userId: investor2.id },
    update: {},
    create: {
      userId: investor2.id,
      firstName: 'Jane',
      lastName: 'Smith',
      country: 'UK',
      investorType: 'INSTITUTIONAL',
      accreditationStatus: 'VERIFIED',
      accreditedAt: new Date(),
      riskTolerance: 'HIGH',
    },
  });
  console.log('✅ Created investor:', investor2.email);

  // ===========================================
  // Create Sample Assets
  // ===========================================
  const asset1 = await prisma.asset.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      bankId: bank1.id,
      name: 'Manhattan Commercial Building',
      description: 'Premium Class A office building in Midtown Manhattan. 50 floors, fully leased to Fortune 500 tenants.',
      assetType: 'REAL_ESTATE',
      totalValue: 150000000, // $150M
      totalSupply: BigInt(1000000),
      pricePerToken: 150,
      tokenizationStatus: 'TOKENIZED',
      listingStatus: 'LISTED',
      tokenizedAt: new Date(),
      listedAt: new Date(),
      mintAddress: 'DemoMint1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  });
  console.log('✅ Created asset:', asset1.name);

  const asset2 = await prisma.asset.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      bankId: bank1.id,
      name: 'Silicon Valley Tech Campus',
      description: 'Modern tech campus in Palo Alto with multiple buildings, amenities, and green spaces. Leased to major tech companies.',
      assetType: 'REAL_ESTATE',
      totalValue: 85000000, // $85M
      totalSupply: BigInt(850000),
      pricePerToken: 100,
      tokenizationStatus: 'TOKENIZED',
      listingStatus: 'LISTED',
      tokenizedAt: new Date(),
      listedAt: new Date(),
      mintAddress: 'DemoMint2xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  });
  console.log('✅ Created asset:', asset2.name);

  const asset3 = await prisma.asset.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      bankId: bank2.id,
      name: 'London Office Complex',
      description: 'Prime office space in the City of London financial district. Fully modernized with sustainability certifications.',
      assetType: 'REAL_ESTATE',
      totalValue: 120000000, // $120M
      totalSupply: BigInt(600000),
      pricePerToken: 200,
      tokenizationStatus: 'TOKENIZED',
      listingStatus: 'LISTED',
      tokenizedAt: new Date(),
      listedAt: new Date(),
      mintAddress: 'DemoMint3xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  });
  console.log('✅ Created asset:', asset3.name);

  const asset4 = await prisma.asset.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      bankId: bank2.id,
      name: 'Industrial Equipment Fleet',
      description: 'Portfolio of construction and industrial equipment leased to major contractors. Diversified across multiple industries.',
      assetType: 'EQUIPMENT',
      totalValue: 25000000, // $25M
      totalSupply: BigInt(500000),
      pricePerToken: 50,
      tokenizationStatus: 'PENDING_TOKENIZATION',
      listingStatus: 'UNLISTED',
    },
  });
  console.log('✅ Created asset:', asset4.name);

  const asset5 = await prisma.asset.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      bankId: bank1.id,
      name: 'Trade Receivables Pool',
      description: 'Diversified pool of trade receivables from blue-chip companies. Average maturity 90 days.',
      assetType: 'RECEIVABLES',
      totalValue: 50000000, // $50M
      totalSupply: BigInt(1000000),
      pricePerToken: 50,
      tokenizationStatus: 'DRAFT',
      listingStatus: 'UNLISTED',
    },
  });
  console.log('✅ Created asset:', asset5.name);

  // ===========================================
  // Create Sample Documents
  // ===========================================
  await prisma.document.createMany({
    data: [
      {
        assetId: asset1.id,
        type: 'APPRAISAL',
        name: 'Property Appraisal Report 2024.pdf',
        s3Key: 'documents/asset1/appraisal.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2500000,
        uploadedBy: bankAdmin1.id,
      },
      {
        assetId: asset1.id,
        type: 'LEGAL_OPINION',
        name: 'Legal Opinion - Title Review.pdf',
        s3Key: 'documents/asset1/legal.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1200000,
        uploadedBy: bankAdmin1.id,
      },
      {
        assetId: asset1.id,
        type: 'PROSPECTUS',
        name: 'Investment Prospectus.pdf',
        s3Key: 'documents/asset1/prospectus.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 5000000,
        uploadedBy: bankAdmin1.id,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Created sample documents');

  // ===========================================
  // Create Sample Transactions
  // ===========================================
  const investorProfile1 = await prisma.investorProfile.findUnique({
    where: { userId: investor1.id },
  });

  const investorProfile2 = await prisma.investorProfile.findUnique({
    where: { userId: investor2.id },
  });

  if (investorProfile1 && investorProfile2) {
    // Create some completed transactions
    await prisma.transaction.createMany({
      data: [
        {
          assetId: asset1.id,
          buyerId: investor1.id,
          type: 'PRIMARY_SALE',
          amount: 15000,
          tokenAmount: 100,
          status: 'COMPLETED',
          completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          txSignature: 'tx_demo_1',
        },
        {
          assetId: asset2.id,
          buyerId: investor1.id,
          type: 'PRIMARY_SALE',
          amount: 10000,
          tokenAmount: 100,
          status: 'COMPLETED',
          completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          txSignature: 'tx_demo_2',
        },
        {
          assetId: asset3.id,
          buyerId: investor2.id,
          type: 'PRIMARY_SALE',
          amount: 40000,
          tokenAmount: 200,
          status: 'COMPLETED',
          completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          txSignature: 'tx_demo_3',
        },
      ],
      skipDuplicates: true,
    });

    // Create portfolio holdings
    await prisma.portfolioHolding.upsert({
      where: {
        investorId_assetId: {
          investorId: investorProfile1.id,
          assetId: asset1.id,
        },
      },
      update: {},
      create: {
        investorId: investorProfile1.id,
        assetId: asset1.id,
        tokenAmount: 100,
        costBasis: 15000,
      },
    });

    await prisma.portfolioHolding.upsert({
      where: {
        investorId_assetId: {
          investorId: investorProfile1.id,
          assetId: asset2.id,
        },
      },
      update: {},
      create: {
        investorId: investorProfile1.id,
        assetId: asset2.id,
        tokenAmount: 100,
        costBasis: 10000,
      },
    });

    await prisma.portfolioHolding.upsert({
      where: {
        investorId_assetId: {
          investorId: investorProfile2.id,
          assetId: asset3.id,
        },
      },
      update: {},
      create: {
        investorId: investorProfile2.id,
        assetId: asset3.id,
        tokenAmount: 200,
        costBasis: 40000,
      },
    });

    console.log('✅ Created sample transactions and portfolio holdings');
  }

  // ===========================================
  // Create Sample Auction
  // ===========================================
  const auction = await prisma.auction.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      assetId: asset1.id,
      reservePrice: 14000,
      tokenAmount: 100,
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      status: 'ACTIVE',
      currentBid: 15500,
      currentBidder: investor2.walletAddress,
      onChainAddress: 'DemoAuction1xxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
  });

  // Add bids to auction
  await prisma.bid.createMany({
    data: [
      {
        auctionId: auction.id,
        bidder: investor1.walletAddress!,
        amount: 14500,
        txSignature: 'bid_tx_1',
        isWinning: false,
      },
      {
        auctionId: auction.id,
        bidder: investor2.walletAddress!,
        amount: 15000,
        txSignature: 'bid_tx_2',
        isWinning: false,
      },
      {
        auctionId: auction.id,
        bidder: investor1.walletAddress!,
        amount: 15200,
        txSignature: 'bid_tx_3',
        isWinning: false,
      },
      {
        auctionId: auction.id,
        bidder: investor2.walletAddress!,
        amount: 15500,
        txSignature: 'bid_tx_4',
        isWinning: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Created sample auction with bids');

  console.log('\n🎉 Database seeding complete!');
  console.log('\n📋 Test Credentials:');
  console.log('   Admin: admin@rwa-platform.com / admin123');
  console.log('   Bank 1: bank1@example.com / bank123');
  console.log('   Bank 2: bank2@example.com / bank123');
  console.log('   Investors: Use wallet login');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });