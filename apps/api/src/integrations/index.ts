/**
 * Integration Services
 * 
 * Central export for all third-party integrations
 */

// Civic Pass - KYC/AML verification
export * as civic from './civic';
export { civicService } from './civic/CivicService';
export { 
  requireCivicPass, 
  optionalCivicPass,
  requireAssetTypeVerification,
  checkPassRefresh,
} from './civic/middleware';

// Securitize - Tokenization platform
export * as securitize from './securitize';
export { securitizeClient } from './securitize/SecuritizeClient';
export { tokenizationService } from './securitize/TokenizationService';
export { investorService } from './securitize/InvestorService';
export { securitizeWebhookRouter } from './securitize/webhooks';

// Anchorage Digital - Institutional custody
export * as anchorage from './anchorage';
export { anchorageClient } from './anchorage/AnchorageClient';
export { custodyService } from './anchorage/CustodyService';
export { transactionService as anchorageTransactionService } from './anchorage/TransactionService';

// RedStone - Price oracles
export * as redstone from './redstone';
export { redStoneClient } from './redstone/RedStoneClient';
export { priceService } from './redstone/PriceService';

// Circle USDC - Stablecoin operations
export * as circle from './circle';
export { usdcService } from './circle/USDCService';

// Jupiter DEX - Token swaps
export * as jupiter from './dex';
export { jupiterClient } from './dex/JupiterClient';
export { swapService } from './dex/SwapService';
