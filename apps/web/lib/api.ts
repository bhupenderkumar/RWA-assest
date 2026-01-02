/**
 * API Client for RWA Asset Platform
 * 
 * Provides typed HTTP client for all backend endpoints with
 * automatic token refresh and error handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ===========================================
// Types matching backend response format
// ===========================================

export type UserRole = 'PLATFORM_ADMIN' | 'BANK_ADMIN' | 'BANK_VIEWER' | 'INVESTOR' | 'AUDITOR';
export type KYCStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type AssetType = 'REAL_ESTATE' | 'EQUIPMENT' | 'RECEIVABLES' | 'COMMODITIES' | 'SECURITIES' | 'OTHER';
export type TokenizationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PENDING_TOKENIZATION' | 'TOKENIZED' | 'FAILED';
export type ListingStatus = 'UNLISTED' | 'LISTED' | 'PAUSED' | 'DELISTED';
export type TransactionType = 'PRIMARY_SALE' | 'SECONDARY_SALE' | 'REDEMPTION' | 'DIVIDEND';
export type TransactionStatus = 'PENDING' | 'ESCROW_FUNDED' | 'TOKENS_TRANSFERRED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type AuctionStatus = 'PENDING' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED';

export interface User {
  id: string;
  walletAddress: string | null;
  email: string | null;
  role: UserRole;
  kycStatus: KYCStatus;
  kycVerifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  investorProfile?: InvestorProfile;
  bank?: Bank;
}

export interface InvestorProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  country: string;
  investorType: 'INDIVIDUAL' | 'INSTITUTIONAL';
  accreditationStatus: 'NONE' | 'PENDING' | 'VERIFIED' | 'EXPIRED';
  accreditedAt: string | null;
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt: string;
}

export interface Bank {
  id: string;
  name: string;
  registrationNumber: string;
  jurisdiction: string;
  adminUserId: string;
  status: 'PENDING' | 'VERIFIED' | 'SUSPENDED';
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  bankId: string;
  name: string;
  description: string;
  assetType: AssetType;
  totalValue: number;
  totalSupply: string; // BigInt as string
  pricePerToken: number;
  tokenizationStatus: TokenizationStatus;
  listingStatus: ListingStatus;
  tokenizedAt: string | null;
  listedAt: string | null;
  mintAddress: string | null;
  metadataUri: string | null;
  createdAt: string;
  updatedAt: string;
  bank?: Bank;
  documents?: Document[];
  _count?: {
    transactions: number;
    holdings: number;
  };
}

export interface Document {
  id: string;
  assetId: string;
  type: 'PROSPECTUS' | 'LEGAL_OPINION' | 'APPRAISAL' | 'AUDIT' | 'OTHER';
  name: string;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  assetId: string;
  buyerId: string;
  sellerId: string | null;
  type: TransactionType;
  amount: number;
  tokenAmount: number;
  status: TransactionStatus;
  escrowAddress: string | null;
  txSignature: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: Asset;
}

export interface PortfolioHolding {
  id: string;
  investorId: string;
  assetId: string;
  tokenAmount: number;
  costBasis: number;
  createdAt: string;
  updatedAt: string;
  asset?: Asset;
  currentValue?: number;
  pnl?: number;
  pnlPercentage?: number;
}

export interface Portfolio {
  holdings: PortfolioHolding[];
  totalValue: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPercentage: number;
}

export interface Auction {
  id: string;
  assetId: string;
  reservePrice: number;
  tokenAmount: number;
  startTime: string;
  endTime: string;
  status: AuctionStatus;
  currentBid: number | null;
  currentBidder: string | null;
  winningBid: number | null;
  winningBidder: string | null;
  settledAt: string | null;
  onChainAddress: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: Asset;
  bids?: Bid[];
  _count?: {
    bids: number;
  };
}

export interface Bid {
  id: string;
  auctionId: string;
  bidder: string;
  amount: number;
  txSignature: string;
  isWinning: boolean;
  createdAt: string;
}

export interface AssetStats {
  totalHolders: number;
  totalTransactions: number;
  totalVolume: number;
  averageHolding: number;
  largestHolder?: string;
  largestHolding?: number;
}

export interface AssetHolder {
  id: string;
  userId: string;
  walletAddress: string;
  tokenAmount: number;
  percentage: number;
  costBasis: number;
  acquiredAt: string;
  user?: {
    email?: string;
    investorProfile?: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface BankInvestor {
  id: string;
  email: string | null;
  walletAddress: string | null;
  kycStatus: string;
  kycVerifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
  investorProfile: {
    firstName: string;
    lastName: string;
    country: string;
    accreditationStatus: string;
    investorType: string;
  } | null;
  totalInvested: number;
  assetsHeld: number;
  holdings: Array<{
    assetId: string;
    assetName: string;
    assetSymbol: string;
    tokenAmount: string;
    costBasis: string;
  }>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  // Alias for backward compatibility
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ===========================================
// Token Storage
// ===========================================

const TOKEN_KEY = 'rwa_access_token';
const REFRESH_TOKEN_KEY = 'rwa_refresh_token';

export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  
  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// ===========================================
// API Client
// ===========================================

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const createApiClient = (): AxiosInstance => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  // Request interceptor - add auth token
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor - handle token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiResponse<unknown>>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      
      // Handle 401 - try to refresh token
      if (error.response?.status === 401 && !originalRequest._retry) {
        const refreshToken = tokenStorage.getRefreshToken();
        
        if (refreshToken) {
          if (isRefreshing) {
            // Wait for token refresh
            return new Promise((resolve) => {
              subscribeTokenRefresh((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const { data } = await axios.post<ApiResponse<AuthTokens>>(
              `${baseURL}/auth/refresh`,
              { refreshToken }
            );

            if (data.success && data.data) {
              tokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
              onTokenRefreshed(data.data.accessToken);
              originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
              return client(originalRequest);
            }
          } catch {
            tokenStorage.clearTokens();
            window.dispatchEvent(new CustomEvent('auth:logout'));
          } finally {
            isRefreshing = false;
          }
        }
      }

      const message = error.response?.data?.error || error.message || 'An error occurred';
      return Promise.reject(new Error(message));
    }
  );

  return client;
};

export const apiClient = createApiClient();

// ===========================================
// API Endpoints
// ===========================================

export const api = {
  // =========================================
  // Auth
  // =========================================
  auth: {
    getNonce: async (walletAddress: string): Promise<{ nonce: string; message: string }> => {
      const { data } = await apiClient.get<ApiResponse<{ nonce: string; expiresIn: number }>>(
        `/auth/nonce/${walletAddress}`
      );
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to get nonce');
      // The nonce IS the message to sign
      return { nonce: data.data.nonce, message: data.data.nonce };
    },

    login: async (walletAddress: string, signature: string, message: string): Promise<{ user: User; tokens: AuthTokens }> => {
      const { data } = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string; expiresIn: number; user: User }>>(
        '/auth/login',
        { walletAddress, signature, message }
      );
      if (!data.success || !data.data) throw new Error(data.error || 'Login failed');
      
      // Store tokens - API returns accessToken/refreshToken directly, not nested under tokens
      tokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
      
      // Return in expected format
      return {
        user: data.data.user,
        tokens: {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          expiresIn: data.data.expiresIn
        }
      };
    },

    logout: async (): Promise<void> => {
      try {
        await apiClient.post('/auth/logout');
      } finally {
        tokenStorage.clearTokens();
      }
    },

    refresh: async (refreshToken: string): Promise<AuthTokens> => {
      const { data } = await apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken });
      if (!data.success || !data.data) throw new Error(data.error || 'Token refresh failed');
      
      tokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
      return data.data;
    },

    me: async (): Promise<User> => {
      const { data } = await apiClient.get<ApiResponse<User>>('/auth/me');
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to get user');
      return data.data;
    },
  },

  // =========================================
  // Users
  // =========================================
  users: {
    getProfile: async (): Promise<User> => {
      const { data } = await apiClient.get<ApiResponse<User>>('/users/profile');
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to get profile');
      return data.data;
    },

    updateProfile: async (profile: Partial<InvestorProfile>): Promise<User> => {
      const { data } = await apiClient.put<ApiResponse<User>>('/users/profile', profile);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to update profile');
      return data.data;
    },

    startKYC: async (): Promise<{ verificationUrl: string }> => {
      const { data } = await apiClient.post<ApiResponse<{ verificationUrl: string }>>('/users/kyc/start');
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to start KYC');
      return data.data;
    },

    getKYCStatus: async (): Promise<{ status: KYCStatus; gatewayToken?: string }> => {
      const { data } = await apiClient.get<ApiResponse<{ status: KYCStatus; gatewayToken?: string }>>('/users/kyc/status');
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to get KYC status');
      return data.data;
    },

    getPortfolio: async (): Promise<Portfolio> => {
      const { data } = await apiClient.get<ApiResponse<Portfolio>>('/users/portfolio');
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to get portfolio');
      return data.data;
    },

    getTransactionHistory: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Transaction>> => {
      const { data } = await apiClient.get<PaginatedResponse<Transaction>>('/users/transactions', { params });
      return data;
    },

    getBankInvestors: async (params?: {
      page?: number;
      limit?: number;
      kycStatus?: string;
      search?: string;
    }): Promise<PaginatedResponse<BankInvestor>> => {
      const { data } = await apiClient.get<PaginatedResponse<BankInvestor>>('/users/bank-investors', { params });
      return data;
    },
  },

  // =========================================
  // Assets
  // =========================================
  assets: {
    list: async (params?: {
      type?: AssetType;
      status?: ListingStatus;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Asset>> => {
      const { data } = await apiClient.get<PaginatedResponse<Asset>>('/assets', { params });
      return data;
    },

    marketplace: async (params?: {
      type?: AssetType;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Asset>> => {
      const { data } = await apiClient.get<PaginatedResponse<Asset>>('/assets/marketplace', { params });
      return data;
    },

    get: async (id: string): Promise<Asset> => {
      const { data } = await apiClient.get<ApiResponse<Asset>>(`/assets/${id}`);
      if (!data.success || !data.data) throw new Error(data.error || 'Asset not found');
      return data.data;
    },

    getDocuments: async (id: string): Promise<Document[]> => {
      const { data } = await apiClient.get<ApiResponse<Document[]>>(`/assets/${id}/documents`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to get documents');
      return data.data;
    },

    // Bank admin endpoints
    create: async (asset: {
      name: string;
      description?: string;
      assetType: AssetType;
      totalValue: number;
      totalSupply: number;
      pricePerToken?: number;
    }): Promise<Asset> => {
      const { data } = await apiClient.post<ApiResponse<Asset>>('/assets', asset);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to create asset');
      return data.data;
    },

    update: async (id: string, updates: Partial<Asset>): Promise<Asset> => {
      const { data } = await apiClient.put<ApiResponse<Asset>>(`/assets/${id}`, updates);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to update asset');
      return data.data;
    },

    uploadDocument: async (id: string, file: File, type: Document['type']): Promise<Document> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const { data } = await apiClient.post<ApiResponse<Document>>(
        `/assets/${id}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to upload document');
      return data.data;
    },

    submitForApproval: async (id: string): Promise<Asset> => {
      const { data } = await apiClient.post<ApiResponse<Asset>>(`/assets/${id}/submit`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to submit asset');
      return data.data;
    },

    tokenize: async (id: string, params?: {
      symbol?: string;
      minimumInvestment?: number;
      maximumInvestment?: number;
      startDate?: string;
      endDate?: string;
    }): Promise<Asset> => {
      const { data } = await apiClient.post<ApiResponse<Asset>>(`/assets/${id}/tokenize`, params || {});
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to tokenize asset');
      return data.data;
    },

    list_asset: async (id: string): Promise<Asset> => {
      const { data } = await apiClient.post<ApiResponse<Asset>>(`/assets/${id}/list`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to list asset');
      return data.data;
    },

    delist_asset: async (id: string): Promise<Asset> => {
      const { data } = await apiClient.post<ApiResponse<Asset>>(`/assets/${id}/delist`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to delist asset');
      return data.data;
    },

    delete: async (id: string): Promise<void> => {
      const { data } = await apiClient.delete<ApiResponse<void>>(`/assets/${id}`);
      if (!data.success) throw new Error(data.error || 'Failed to delete asset');
    },

    submitForReview: async (id: string): Promise<Asset> => {
      const { data } = await apiClient.post<ApiResponse<Asset>>(`/assets/${id}/submit-review`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to submit for review');
      return data.data;
    },

    // Platform admin endpoint - approve asset for tokenization
    approve: async (id: string): Promise<Asset> => {
      const { data } = await apiClient.post<ApiResponse<Asset>>(`/assets/${id}/approve`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to approve asset');
      return data.data;
    },

    getStats: async (id: string): Promise<AssetStats> => {
      const { data } = await apiClient.get<ApiResponse<AssetStats>>(`/assets/${id}/stats`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to get asset stats');
      return data.data;
    },

    getHolders: async (id: string): Promise<AssetHolder[]> => {
      const { data } = await apiClient.get<ApiResponse<AssetHolder[]>>(`/assets/${id}/holders`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to get holders');
      return data.data;
    },

    getTransactions: async (id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Transaction>> => {
      const { data } = await apiClient.get<PaginatedResponse<Transaction>>(`/assets/${id}/transactions`, { params });
      return data;
    },

    downloadDocument: async (assetId: string, documentId: string): Promise<string> => {
      const { data } = await apiClient.get<ApiResponse<{ url: string }>>(`/assets/${assetId}/documents/${documentId}/download`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to get download URL');
      return data.data.url;
    },

    deleteDocument: async (assetId: string, documentId: string): Promise<void> => {
      const { data } = await apiClient.delete<ApiResponse<void>>(`/assets/${assetId}/documents/${documentId}`);
      if (!data.success) throw new Error(data.error || 'Failed to delete document');
    },
  },

  // =========================================
  // Transactions
  // =========================================
  transactions: {
    purchase: async (assetId: string, amount: number, tokenAmount: number): Promise<Transaction> => {
      const { data } = await apiClient.post<ApiResponse<Transaction>>('/transactions/purchase', {
        assetId,
        amount,
        tokenAmount,
      });
      if (!data.success || !data.data) throw new Error(data.error || 'Purchase failed');
      return data.data;
    },

    confirmEscrow: async (transactionId: string, txSignature: string): Promise<Transaction> => {
      const { data } = await apiClient.post<ApiResponse<Transaction>>(
        `/transactions/${transactionId}/confirm-escrow`,
        { txSignature }
      );
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to confirm escrow');
      return data.data;
    },

    get: async (id: string): Promise<Transaction> => {
      const { data } = await apiClient.get<ApiResponse<Transaction>>(`/transactions/${id}`);
      if (!data.success || !data.data) throw new Error(data.error || 'Transaction not found');
      return data.data;
    },

    cancel: async (id: string): Promise<Transaction> => {
      const { data } = await apiClient.post<ApiResponse<Transaction>>(`/transactions/${id}/cancel`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to cancel transaction');
      return data.data;
    },
  },

  // =========================================
  // Auctions
  // =========================================
  auctions: {
    list: async (params?: {
      status?: AuctionStatus;
      assetId?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Auction>> => {
      const { data } = await apiClient.get<PaginatedResponse<Auction>>('/auctions', { params });
      return data;
    },

    get: async (id: string): Promise<Auction> => {
      const { data } = await apiClient.get<ApiResponse<Auction>>(`/auctions/${id}`);
      if (!data.success || !data.data) throw new Error(data.error || 'Auction not found');
      return data.data;
    },

    getBids: async (id: string): Promise<Bid[]> => {
      const { data } = await apiClient.get<ApiResponse<Bid[]>>(`/auctions/${id}/bids`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to get bids');
      return data.data;
    },

    placeBid: async (auctionId: string, amount: number, txSignature: string): Promise<Bid> => {
      const { data } = await apiClient.post<ApiResponse<Bid>>(`/auctions/${auctionId}/bid`, {
        amount,
        txSignature,
      });
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to place bid');
      return data.data;
    },

    // Bank admin endpoints
    create: async (auction: {
      assetId: string;
      reservePrice: number;
      tokenAmount: number;
      startTime: string;
      endTime: string;
    }): Promise<Auction> => {
      const { data } = await apiClient.post<ApiResponse<Auction>>('/auctions', auction);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to create auction');
      return data.data;
    },

    cancel: async (id: string): Promise<Auction> => {
      const { data } = await apiClient.post<ApiResponse<Auction>>(`/auctions/${id}/cancel`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to cancel auction');
      return data.data;
    },

    settle: async (id: string): Promise<Auction> => {
      const { data } = await apiClient.post<ApiResponse<Auction>>(`/auctions/${id}/settle`);
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to settle auction');
      return data.data;
    },
  },

  // =========================================
  // Health
  // =========================================
  health: {
    check: async (): Promise<{ status: string; timestamp: string }> => {
      const { data } = await apiClient.get<ApiResponse<{ status: string; timestamp: string }>>('/health');
      if (!data.success || !data.data) throw new Error('Health check failed');
      return data.data;
    },

    getStats: async (): Promise<PlatformStats> => {
      const { data } = await apiClient.get<ApiResponse<PlatformStats>>('/health/stats');
      if (!data.success || !data.data) throw new Error('Failed to get platform stats');
      return data.data;
    },
  },
};

export interface PlatformStats {
  totalValueLocked: number;
  totalAssets: number;
  listedAssets: number;
  verifiedInvestors: number;
  totalUsers: number;
  completedTransactions: number;
  recentVolume: number;
  settlementTime: string;
  updatedAt: string;
}

export default api;
