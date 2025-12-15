-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'BANK_ADMIN', 'BANK_VIEWER', 'INVESTOR', 'AUDITOR');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AccreditationStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvestorType" AS ENUM ('INDIVIDUAL', 'INSTITUTIONAL', 'QUALIFIED_PURCHASER');

-- CreateEnum
CREATE TYPE "RiskTolerance" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BankStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('REAL_ESTATE', 'EQUIPMENT', 'RECEIVABLES', 'SECURITIES', 'COMMODITIES', 'INTELLECTUAL_PROPERTY', 'OTHER');

-- CreateEnum
CREATE TYPE "TokenizationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PENDING_TOKENIZATION', 'TOKENIZED', 'FAILED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('UNLISTED', 'PENDING', 'LISTED', 'SOLD_OUT', 'DELISTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('APPRAISAL', 'LEGAL_OPINION', 'FINANCIAL_STATEMENT', 'TITLE_DEED', 'INSURANCE', 'PROSPECTUS', 'TERM_SHEET', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PRIMARY_SALE', 'SECONDARY_SALE', 'AUCTION_SETTLEMENT', 'REDEMPTION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'ESCROW_CREATED', 'PAYMENT_RECEIVED', 'TOKENS_TRANSFERRED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('TOKENIZATION', 'KYC_VERIFICATION', 'DOCUMENT_PROCESSING', 'NOTIFICATION', 'PRICE_UPDATE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL,
    "wallet_address" TEXT,
    "civic_pass_token" TEXT,
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "kyc_verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "accreditation_status" "AccreditationStatus" NOT NULL DEFAULT 'NONE',
    "accredited_at" TIMESTAMP(3),
    "investor_type" "InvestorType" NOT NULL DEFAULT 'INDIVIDUAL',
    "risk_tolerance" "RiskTolerance",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registration_number" TEXT,
    "jurisdiction" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "securitize_issuer_id" TEXT,
    "anchorage_vault_id" TEXT,
    "status" "BankStatus" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "asset_type" "AssetType" NOT NULL,
    "total_value" DECIMAL(18,2) NOT NULL,
    "total_supply" BIGINT NOT NULL,
    "price_per_token" DECIMAL(18,8),
    "mint_address" TEXT,
    "metadata_uri" TEXT,
    "securitize_token_id" TEXT,
    "tokenization_status" "TokenizationStatus" NOT NULL DEFAULT 'DRAFT',
    "listing_status" "ListingStatus" NOT NULL DEFAULT 'UNLISTED',
    "tokenized_at" TIMESTAMP(3),
    "listed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "ipfs_hash" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "token_amount" DECIMAL(18,8) NOT NULL,
    "tx_signature" TEXT,
    "escrow_address" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "failure_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "reserve_price" DECIMAL(18,2) NOT NULL,
    "current_bid" DECIMAL(18,2),
    "current_bidder" TEXT,
    "token_amount" DECIMAL(18,8) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "on_chain_address" TEXT,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "bidder" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "tx_signature" TEXT,
    "is_winning" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_holdings" (
    "id" TEXT NOT NULL,
    "investor_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "token_amount" DECIMAL(18,8) NOT NULL,
    "cost_basis" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "investor_profiles_user_id_key" ON "investor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "banks_admin_user_id_key" ON "banks"("admin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_mint_address_key" ON "assets"("mint_address");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_holdings_investor_id_asset_id_key" ON "portfolio_holdings"("investor_id", "asset_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "jobs_type_status_idx" ON "jobs"("type", "status");

-- AddForeignKey
ALTER TABLE "investor_profiles" ADD CONSTRAINT "investor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banks" ADD CONSTRAINT "banks_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
