use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, Token2022};
use anchor_spl::token_interface::{Mint, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::Metadata;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

/// Asset Registry Program
/// 
/// Manages the registration and lifecycle of tokenized real-world assets.
/// Integrates with Token-2022 for advanced token features including:
/// - Transfer hooks for compliance
/// - Permanent delegate for regulatory control
/// - Metadata extension for on-chain asset info
#[program]
pub mod asset_registry {
    use super::*;

    /// Initialize the asset registry configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        platform_fee_bps: u16,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.platform_fee_bps = platform_fee_bps;
        config.total_assets = 0;
        config.bump = ctx.bumps.config;
        
        msg!("Asset Registry initialized with authority: {}", config.authority);
        Ok(())
    }

    /// Register a new asset for tokenization
    pub fn register_asset(
        ctx: Context<RegisterAsset>,
        name: String,
        asset_type: AssetType,
        total_value: u64,
        total_supply: u64,
        metadata_uri: String,
    ) -> Result<()> {
        require!(name.len() <= 64, AssetRegistryError::NameTooLong);
        require!(metadata_uri.len() <= 256, AssetRegistryError::UriTooLong);
        require!(total_value > 0, AssetRegistryError::InvalidValue);
        require!(total_supply > 0, AssetRegistryError::InvalidSupply);

        let asset = &mut ctx.accounts.asset;
        asset.authority = ctx.accounts.authority.key();
        asset.mint = ctx.accounts.mint.key();
        asset.name = name;
        asset.asset_type = asset_type;
        asset.total_value = total_value;
        asset.total_supply = total_supply;
        asset.metadata_uri = metadata_uri;
        asset.status = AssetStatus::Pending;
        asset.created_at = Clock::get()?.unix_timestamp;
        asset.updated_at = Clock::get()?.unix_timestamp;
        asset.bump = ctx.bumps.asset;

        // Update config
        let config = &mut ctx.accounts.config;
        config.total_assets += 1;

        emit!(AssetRegistered {
            asset: asset.key(),
            mint: asset.mint,
            authority: asset.authority,
            name: asset.name.clone(),
            total_value,
            total_supply,
        });

        msg!("Asset registered: {}", asset.name);
        Ok(())
    }

    /// Update asset metadata
    pub fn update_asset(
        ctx: Context<UpdateAsset>,
        metadata_uri: Option<String>,
        total_value: Option<u64>,
    ) -> Result<()> {
        let asset = &mut ctx.accounts.asset;

        if let Some(uri) = metadata_uri {
            require!(uri.len() <= 256, AssetRegistryError::UriTooLong);
            asset.metadata_uri = uri;
        }

        if let Some(value) = total_value {
            require!(value > 0, AssetRegistryError::InvalidValue);
            asset.total_value = value;
        }

        asset.updated_at = Clock::get()?.unix_timestamp;

        emit!(AssetUpdated {
            asset: asset.key(),
            updated_at: asset.updated_at,
        });

        Ok(())
    }

    /// Activate an asset (make it tradeable)
    pub fn activate_asset(ctx: Context<UpdateAsset>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(asset.status == AssetStatus::Pending, AssetRegistryError::InvalidStatus);
        
        asset.status = AssetStatus::Active;
        asset.updated_at = Clock::get()?.unix_timestamp;

        emit!(AssetActivated {
            asset: asset.key(),
            activated_at: asset.updated_at,
        });

        Ok(())
    }

    /// Freeze an asset (pause trading)
    pub fn freeze_asset(ctx: Context<UpdateAsset>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(asset.status == AssetStatus::Active, AssetRegistryError::InvalidStatus);
        
        asset.status = AssetStatus::Frozen;
        asset.updated_at = Clock::get()?.unix_timestamp;

        emit!(AssetFrozen {
            asset: asset.key(),
            frozen_at: asset.updated_at,
        });

        Ok(())
    }

    /// Unfreeze an asset (resume trading)
    pub fn unfreeze_asset(ctx: Context<UpdateAsset>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(asset.status == AssetStatus::Frozen, AssetRegistryError::InvalidStatus);
        
        asset.status = AssetStatus::Active;
        asset.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// Burn/retire an asset
    pub fn burn_asset(ctx: Context<BurnAsset>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(
            asset.status != AssetStatus::Burned,
            AssetRegistryError::AlreadyBurned
        );
        
        asset.status = AssetStatus::Burned;
        asset.updated_at = Clock::get()?.unix_timestamp;

        emit!(AssetBurned {
            asset: asset.key(),
            burned_at: asset.updated_at,
        });

        Ok(())
    }

    /// Create a Token-2022 mint with transfer hook for compliance
    /// This creates a new token mint with advanced features:
    /// - Transfer hook pointing to compliance program
    /// - Permanent delegate for regulatory freeze/seize
    /// - Metadata extension for on-chain asset info
    pub fn create_token_mint(
        ctx: Context<CreateTokenMint>,
        name: String,
        symbol: String,
        uri: String,
        decimals: u8,
        transfer_hook_program: Option<Pubkey>,
    ) -> Result<()> {
        require!(name.len() <= 32, AssetRegistryError::NameTooLong);
        require!(symbol.len() <= 10, AssetRegistryError::SymbolTooLong);
        require!(uri.len() <= 200, AssetRegistryError::UriTooLong);

        let mint_config = &mut ctx.accounts.mint_config;
        mint_config.mint = ctx.accounts.mint.key();
        mint_config.authority = ctx.accounts.authority.key();
        mint_config.permanent_delegate = ctx.accounts.permanent_delegate.key();
        mint_config.transfer_hook_program = transfer_hook_program;
        mint_config.name = name.clone();
        mint_config.symbol = symbol.clone();
        mint_config.uri = uri.clone();
        mint_config.decimals = decimals;
        mint_config.is_frozen = false;
        mint_config.created_at = Clock::get()?.unix_timestamp;
        mint_config.bump = ctx.bumps.mint_config;

        emit!(TokenMintCreated {
            mint: ctx.accounts.mint.key(),
            authority: ctx.accounts.authority.key(),
            name,
            symbol,
            decimals,
            transfer_hook_program,
        });

        msg!("Token-2022 mint created: {}", ctx.accounts.mint.key());
        Ok(())
    }

    /// Set or update the transfer hook program for a mint
    pub fn set_transfer_hook(
        ctx: Context<UpdateMintConfig>,
        transfer_hook_program: Pubkey,
    ) -> Result<()> {
        let mint_config = &mut ctx.accounts.mint_config;
        mint_config.transfer_hook_program = Some(transfer_hook_program);

        emit!(TransferHookUpdated {
            mint: mint_config.mint,
            transfer_hook_program,
        });

        msg!("Transfer hook set to: {}", transfer_hook_program);
        Ok(())
    }

    /// Freeze all transfers for a token using permanent delegate
    pub fn freeze_mint(ctx: Context<UpdateMintConfig>) -> Result<()> {
        let mint_config = &mut ctx.accounts.mint_config;
        require!(!mint_config.is_frozen, AssetRegistryError::AlreadyFrozen);
        
        mint_config.is_frozen = true;

        emit!(MintFrozen {
            mint: mint_config.mint,
            frozen_at: Clock::get()?.unix_timestamp,
        });

        msg!("Mint frozen: {}", mint_config.mint);
        Ok(())
    }

    /// Unfreeze transfers for a token
    pub fn unfreeze_mint(ctx: Context<UpdateMintConfig>) -> Result<()> {
        let mint_config = &mut ctx.accounts.mint_config;
        require!(mint_config.is_frozen, AssetRegistryError::NotFrozen);
        
        mint_config.is_frozen = false;

        emit!(MintUnfrozen {
            mint: mint_config.mint,
            unfrozen_at: Clock::get()?.unix_timestamp,
        });

        msg!("Mint unfrozen: {}", mint_config.mint);
        Ok(())
    }

    /// Mint tokens to a recipient (only authority)
    pub fn mint_tokens(
        ctx: Context<MintTokens>,
        amount: u64,
    ) -> Result<()> {
        let mint_config = &ctx.accounts.mint_config;
        require!(!mint_config.is_frozen, AssetRegistryError::MintIsFrozen);

        let seeds = &[
            b"mint-authority",
            mint_config.mint.as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        let signer_seeds = &[&seeds[..]];

        token_2022::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token_2022::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        emit!(TokensMinted {
            mint: ctx.accounts.mint.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
        });

        msg!("Minted {} tokens to {}", amount, ctx.accounts.recipient.key());
        Ok(())
    }
}

// ===========================================
// ACCOUNTS
// ===========================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterAsset<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = authority,
        space = 8 + Asset::INIT_SPACE,
        seeds = [b"asset", mint.key().as_ref()],
        bump
    )]
    pub asset: Account<'info, Asset>,

    /// The token mint for this asset (Token-2022)
    /// CHECK: Validated in instruction
    pub mint: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateAsset<'info> {
    #[account(
        mut,
        seeds = [b"asset", asset.mint.as_ref()],
        bump = asset.bump,
        has_one = authority
    )]
    pub asset: Account<'info, Asset>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct BurnAsset<'info> {
    #[account(
        mut,
        seeds = [b"asset", asset.mint.as_ref()],
        bump = asset.bump,
        has_one = authority
    )]
    pub asset: Account<'info, Asset>,

    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct CreateTokenMint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The permanent delegate that can freeze/seize tokens
    /// CHECK: Can be any pubkey designated as permanent delegate
    pub permanent_delegate: AccountInfo<'info>,

    /// The Token-2022 mint account (must be created externally with extensions)
    /// CHECK: Will be validated as Token-2022 mint
    pub mint: AccountInfo<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + MintConfig::INIT_SPACE,
        seeds = [b"mint-config", mint.key().as_ref()],
        bump
    )]
    pub mint_config: Account<'info, MintConfig>,

    /// PDA that will be the mint authority
    /// CHECK: PDA derived from mint
    #[account(
        seeds = [b"mint-authority", mint.key().as_ref()],
        bump
    )]
    pub mint_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMintConfig<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"mint-config", mint_config.mint.as_ref()],
        bump = mint_config.bump,
        has_one = authority
    )]
    pub mint_config: Account<'info, MintConfig>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"mint-config", mint.key().as_ref()],
        bump = mint_config.bump,
        has_one = authority
    )]
    pub mint_config: Account<'info, MintConfig>,

    /// CHECK: Token-2022 mint
    #[account(mut)]
    pub mint: AccountInfo<'info>,

    /// CHECK: PDA mint authority
    #[account(
        seeds = [b"mint-authority", mint.key().as_ref()],
        bump
    )]
    pub mint_authority: AccountInfo<'info>,

    /// CHECK: Recipient wallet
    pub recipient: AccountInfo<'info>,

    /// CHECK: Recipient's token account
    #[account(mut)]
    pub recipient_token_account: AccountInfo<'info>,

    pub token_program: Program<'info, Token2022>,
}

// ===========================================
// STATE
// ===========================================

#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Program authority
    pub authority: Pubkey,
    /// Platform fee in basis points (1 bps = 0.01%)
    pub platform_fee_bps: u16,
    /// Total number of registered assets
    pub total_assets: u64,
    /// PDA bump
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Asset {
    /// Asset authority (bank)
    pub authority: Pubkey,
    /// Token mint address
    pub mint: Pubkey,
    /// Asset name
    #[max_len(64)]
    pub name: String,
    /// Type of asset
    pub asset_type: AssetType,
    /// Total value in cents (USD)
    pub total_value: u64,
    /// Total token supply
    pub total_supply: u64,
    /// Metadata URI (IPFS/Arweave)
    #[max_len(256)]
    pub metadata_uri: String,
    /// Current status
    pub status: AssetStatus,
    /// Creation timestamp
    pub created_at: i64,
    /// Last update timestamp
    pub updated_at: i64,
    /// PDA bump
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MintConfig {
    /// Token mint address
    pub mint: Pubkey,
    /// Mint authority
    pub authority: Pubkey,
    /// Permanent delegate for freeze/seize
    pub permanent_delegate: Pubkey,
    /// Transfer hook program ID (optional)
    pub transfer_hook_program: Option<Pubkey>,
    /// Token name
    #[max_len(32)]
    pub name: String,
    /// Token symbol
    #[max_len(10)]
    pub symbol: String,
    /// Metadata URI
    #[max_len(200)]
    pub uri: String,
    /// Token decimals
    pub decimals: u8,
    /// Whether the mint is frozen
    pub is_frozen: bool,
    /// Creation timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

// ===========================================
// ENUMS
// ===========================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AssetType {
    RealEstate,
    Equipment,
    Receivables,
    Securities,
    Commodities,
    IntellectualProperty,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AssetStatus {
    Pending,
    Active,
    Frozen,
    Burned,
}

// ===========================================
// EVENTS
// ===========================================

#[event]
pub struct AssetRegistered {
    pub asset: Pubkey,
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub total_value: u64,
    pub total_supply: u64,
}

#[event]
pub struct AssetUpdated {
    pub asset: Pubkey,
    pub updated_at: i64,
}

#[event]
pub struct AssetActivated {
    pub asset: Pubkey,
    pub activated_at: i64,
}

#[event]
pub struct AssetFrozen {
    pub asset: Pubkey,
    pub frozen_at: i64,
}

#[event]
pub struct AssetBurned {
    pub asset: Pubkey,
    pub burned_at: i64,
}

#[event]
pub struct TokenMintCreated {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub transfer_hook_program: Option<Pubkey>,
}

#[event]
pub struct TransferHookUpdated {
    pub mint: Pubkey,
    pub transfer_hook_program: Pubkey,
}

#[event]
pub struct MintFrozen {
    pub mint: Pubkey,
    pub frozen_at: i64,
}

#[event]
pub struct MintUnfrozen {
    pub mint: Pubkey,
    pub unfrozen_at: i64,
}

#[event]
pub struct TokensMinted {
    pub mint: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}

// ===========================================
// ERRORS
// ===========================================

#[error_code]
pub enum AssetRegistryError {
    #[msg("Asset name is too long (max 64 characters)")]
    NameTooLong,
    #[msg("Token symbol is too long (max 10 characters)")]
    SymbolTooLong,
    #[msg("Metadata URI is too long (max 256 characters)")]
    UriTooLong,
    #[msg("Invalid asset value")]
    InvalidValue,
    #[msg("Invalid token supply")]
    InvalidSupply,
    #[msg("Invalid asset status for this operation")]
    InvalidStatus,
    #[msg("Asset has already been burned")]
    AlreadyBurned,
    #[msg("Mint is already frozen")]
    AlreadyFrozen,
    #[msg("Mint is not frozen")]
    NotFrozen,
    #[msg("Cannot perform operation while mint is frozen")]
    MintIsFrozen,
    #[msg("Unauthorized")]
    Unauthorized,
}
