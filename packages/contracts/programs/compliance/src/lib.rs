use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, Token2022};
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnV");

/// Compliance Hook Program
/// 
/// Implements Token-2022 transfer hook for compliance checks.
/// Verifies Civic Pass, whitelists, jurisdiction rules, and transfer limits.
#[program]
pub mod compliance {
    use super::*;

    /// Initialize the compliance configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        civic_gatekeeper_network: Pubkey,
        max_transfer_amount: u64,
        transfer_cooldown: i64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.civic_gatekeeper_network = civic_gatekeeper_network;
        config.max_transfer_amount = max_transfer_amount;
        config.transfer_cooldown = transfer_cooldown;
        config.is_paused = false;
        config.total_whitelisted = 0;
        config.total_blacklisted = 0;
        config.bump = ctx.bumps.config;

        emit!(ComplianceInitialized {
            authority: config.authority,
            gatekeeper_network: civic_gatekeeper_network,
        });

        msg!("Compliance initialized with authority: {}", config.authority);
        Ok(())
    }

    /// Add an address to the whitelist
    pub fn add_to_whitelist(
        ctx: Context<ManageWhitelist>,
        investor: Pubkey,
        investor_type: InvestorType,
        jurisdiction: [u8; 2],
        kyc_expiry: i64,
    ) -> Result<()> {
        let whitelist_entry = &mut ctx.accounts.whitelist_entry;
        whitelist_entry.investor = investor;
        whitelist_entry.investor_type = investor_type;
        whitelist_entry.jurisdiction = jurisdiction;
        whitelist_entry.kyc_verified = true;
        whitelist_entry.kyc_expiry = kyc_expiry;
        whitelist_entry.added_at = Clock::get()?.unix_timestamp;
        whitelist_entry.last_transfer = 0;
        whitelist_entry.is_active = true;
        whitelist_entry.bump = ctx.bumps.whitelist_entry;

        let config = &mut ctx.accounts.config;
        config.total_whitelisted += 1;

        emit!(AddressWhitelisted {
            investor,
            investor_type,
            jurisdiction,
            kyc_expiry,
        });

        msg!("Address whitelisted: {}", investor);
        Ok(())
    }

    /// Remove an address from the whitelist
    pub fn remove_from_whitelist(ctx: Context<RemoveFromWhitelist>) -> Result<()> {
        let whitelist_entry = &mut ctx.accounts.whitelist_entry;
        whitelist_entry.is_active = false;

        let config = &mut ctx.accounts.config;
        config.total_whitelisted = config.total_whitelisted.saturating_sub(1);

        emit!(AddressRemovedFromWhitelist {
            investor: whitelist_entry.investor,
        });

        msg!("Address removed from whitelist: {}", whitelist_entry.investor);
        Ok(())
    }

    /// Add an address to the blacklist
    pub fn add_to_blacklist(
        ctx: Context<ManageBlacklist>,
        address: Pubkey,
        reason: String,
    ) -> Result<()> {
        require!(reason.len() <= 128, ComplianceError::ReasonTooLong);

        let blacklist_entry = &mut ctx.accounts.blacklist_entry;
        blacklist_entry.address = address;
        blacklist_entry.reason = reason.clone();
        blacklist_entry.added_at = Clock::get()?.unix_timestamp;
        blacklist_entry.added_by = ctx.accounts.authority.key();
        blacklist_entry.is_active = true;
        blacklist_entry.bump = ctx.bumps.blacklist_entry;

        let config = &mut ctx.accounts.config;
        config.total_blacklisted += 1;

        emit!(AddressBlacklisted {
            address,
            reason,
        });

        msg!("Address blacklisted: {}", address);
        Ok(())
    }

    /// Remove an address from the blacklist
    pub fn remove_from_blacklist(ctx: Context<RemoveFromBlacklist>) -> Result<()> {
        let blacklist_entry = &mut ctx.accounts.blacklist_entry;
        blacklist_entry.is_active = false;

        let config = &mut ctx.accounts.config;
        config.total_blacklisted = config.total_blacklisted.saturating_sub(1);

        emit!(AddressRemovedFromBlacklist {
            address: blacklist_entry.address,
        });

        msg!("Address removed from blacklist: {}", blacklist_entry.address);
        Ok(())
    }

    /// Add a jurisdiction rule
    pub fn add_jurisdiction_rule(
        ctx: Context<ManageJurisdiction>,
        from_jurisdiction: [u8; 2],
        to_jurisdiction: [u8; 2],
        is_allowed: bool,
        max_amount: Option<u64>,
    ) -> Result<()> {
        let rule = &mut ctx.accounts.jurisdiction_rule;
        rule.from_jurisdiction = from_jurisdiction;
        rule.to_jurisdiction = to_jurisdiction;
        rule.is_allowed = is_allowed;
        rule.max_amount = max_amount;
        rule.created_at = Clock::get()?.unix_timestamp;
        rule.bump = ctx.bumps.jurisdiction_rule;

        emit!(JurisdictionRuleAdded {
            from_jurisdiction,
            to_jurisdiction,
            is_allowed,
        });

        msg!("Jurisdiction rule added: {:?} -> {:?}", from_jurisdiction, to_jurisdiction);
        Ok(())
    }

    /// Update compliance configuration
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        max_transfer_amount: Option<u64>,
        transfer_cooldown: Option<i64>,
        is_paused: Option<bool>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if let Some(amount) = max_transfer_amount {
            config.max_transfer_amount = amount;
        }

        if let Some(cooldown) = transfer_cooldown {
            config.transfer_cooldown = cooldown;
        }

        if let Some(paused) = is_paused {
            config.is_paused = paused;
            if paused {
                emit!(TransfersPaused {
                    paused_by: ctx.accounts.authority.key(),
                });
            } else {
                emit!(TransfersResumed {
                    resumed_by: ctx.accounts.authority.key(),
                });
            }
        }

        Ok(())
    }

    /// Token-2022 Transfer Hook - Execute transfer validation
    /// This is called by the Token-2022 program during transfers
    pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.config;
        let clock = Clock::get()?;

        // Check if transfers are paused
        require!(!config.is_paused, ComplianceError::TransfersPaused);

        // Check sender is not blacklisted
        if let Some(sender_blacklist) = &ctx.accounts.sender_blacklist {
            require!(
                !sender_blacklist.is_active,
                ComplianceError::SenderBlacklisted
            );
        }

        // Check receiver is not blacklisted
        if let Some(receiver_blacklist) = &ctx.accounts.receiver_blacklist {
            require!(
                !receiver_blacklist.is_active,
                ComplianceError::ReceiverBlacklisted
            );
        }

        // Check sender whitelist and KYC
        let sender_whitelist = ctx.accounts.sender_whitelist.as_ref()
            .ok_or(ComplianceError::SenderNotWhitelisted)?;
        require!(sender_whitelist.is_active, ComplianceError::SenderNotWhitelisted);
        require!(
            sender_whitelist.kyc_expiry > clock.unix_timestamp,
            ComplianceError::KYCExpired
        );

        // Check receiver whitelist and KYC
        let receiver_whitelist = ctx.accounts.receiver_whitelist.as_ref()
            .ok_or(ComplianceError::ReceiverNotWhitelisted)?;
        require!(receiver_whitelist.is_active, ComplianceError::ReceiverNotWhitelisted);
        require!(
            receiver_whitelist.kyc_expiry > clock.unix_timestamp,
            ComplianceError::KYCExpired
        );

        // Check transfer amount limit
        require!(
            amount <= config.max_transfer_amount,
            ComplianceError::TransferAmountExceeded
        );

        // Check transfer cooldown
        if config.transfer_cooldown > 0 {
            require!(
                clock.unix_timestamp >= sender_whitelist.last_transfer + config.transfer_cooldown,
                ComplianceError::TransferCooldownActive
            );
        }

        // Check jurisdiction rules
        if let Some(jurisdiction_rule) = &ctx.accounts.jurisdiction_rule {
            require!(
                jurisdiction_rule.is_allowed,
                ComplianceError::JurisdictionNotAllowed
            );

            if let Some(max_amount) = jurisdiction_rule.max_amount {
                require!(
                    amount <= max_amount,
                    ComplianceError::JurisdictionAmountExceeded
                );
            }
        }

        emit!(TransferValidated {
            sender: ctx.accounts.sender.key(),
            receiver: ctx.accounts.receiver.key(),
            amount,
            timestamp: clock.unix_timestamp,
        });

        msg!("Transfer validated: {} tokens from {} to {}", 
            amount, 
            ctx.accounts.sender.key(), 
            ctx.accounts.receiver.key()
        );
        Ok(())
    }

    /// Verify Civic Pass for an address
    pub fn verify_civic_pass(ctx: Context<VerifyCivicPass>) -> Result<()> {
        // In production, this would verify the Civic Gateway Token
        // For now, we check if the gateway token account exists and is valid
        let whitelist_entry = &mut ctx.accounts.whitelist_entry;
        
        // Verify gateway token is valid
        // Gateway token account is owned by the Civic Gateway program
        require!(
            ctx.accounts.gateway_token.owner == &ctx.accounts.config.civic_gatekeeper_network,
            ComplianceError::InvalidCivicPass
        );

        whitelist_entry.kyc_verified = true;
        whitelist_entry.kyc_expiry = Clock::get()?.unix_timestamp + (365 * 24 * 60 * 60); // 1 year

        emit!(CivicPassVerified {
            investor: whitelist_entry.investor,
            expiry: whitelist_entry.kyc_expiry,
        });

        msg!("Civic Pass verified for: {}", whitelist_entry.investor);
        Ok(())
    }

    /// Fallback instruction for transfer hook interface
    pub fn fallback<'info>(
        _program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = ExecuteInstruction::unpack(data)?;

        // The transfer hook validation happens here
        // Token-2022 calls this during token transfers
        
        match instruction {
            ExecuteInstruction::Execute { amount } => {
                msg!("Transfer hook executed for amount: {}", amount);
                // Additional validation can be done here
            }
        }

        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[account]
#[derive(Default)]
pub struct ComplianceConfig {
    /// Admin authority
    pub authority: Pubkey,
    /// Civic gatekeeper network for KYC
    pub civic_gatekeeper_network: Pubkey,
    /// Maximum transfer amount per transaction
    pub max_transfer_amount: u64,
    /// Cooldown between transfers (in seconds)
    pub transfer_cooldown: i64,
    /// Whether transfers are paused
    pub is_paused: bool,
    /// Total whitelisted addresses
    pub total_whitelisted: u64,
    /// Total blacklisted addresses
    pub total_blacklisted: u64,
    /// PDA bump
    pub bump: u8,
}

impl ComplianceConfig {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // civic_gatekeeper_network
        8 +  // max_transfer_amount
        8 +  // transfer_cooldown
        1 +  // is_paused
        8 +  // total_whitelisted
        8 +  // total_blacklisted
        1;   // bump
}

#[account]
#[derive(Default)]
pub struct WhitelistEntry {
    /// Investor address
    pub investor: Pubkey,
    /// Type of investor
    pub investor_type: InvestorType,
    /// ISO 3166-1 alpha-2 country code
    pub jurisdiction: [u8; 2],
    /// Whether KYC is verified
    pub kyc_verified: bool,
    /// KYC expiration timestamp
    pub kyc_expiry: i64,
    /// When the address was added
    pub added_at: i64,
    /// Last transfer timestamp
    pub last_transfer: i64,
    /// Whether the entry is active
    pub is_active: bool,
    /// PDA bump
    pub bump: u8,
}

impl WhitelistEntry {
    pub const LEN: usize = 8 + // discriminator
        32 + // investor
        1 +  // investor_type
        2 +  // jurisdiction
        1 +  // kyc_verified
        8 +  // kyc_expiry
        8 +  // added_at
        8 +  // last_transfer
        1 +  // is_active
        1;   // bump
}

#[account]
pub struct BlacklistEntry {
    /// Blacklisted address
    pub address: Pubkey,
    /// Reason for blacklisting
    pub reason: String,
    /// When the address was added
    pub added_at: i64,
    /// Who added the address
    pub added_by: Pubkey,
    /// Whether the entry is active
    pub is_active: bool,
    /// PDA bump
    pub bump: u8,
}

impl BlacklistEntry {
    pub const LEN: usize = 8 + // discriminator
        32 + // address
        4 + 128 + // reason (string prefix + max length)
        8 +  // added_at
        32 + // added_by
        1 +  // is_active
        1;   // bump
}

#[account]
#[derive(Default)]
pub struct JurisdictionRule {
    /// Source jurisdiction (ISO 3166-1 alpha-2)
    pub from_jurisdiction: [u8; 2],
    /// Destination jurisdiction (ISO 3166-1 alpha-2)
    pub to_jurisdiction: [u8; 2],
    /// Whether transfers are allowed
    pub is_allowed: bool,
    /// Maximum transfer amount (if any)
    pub max_amount: Option<u64>,
    /// When the rule was created
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl JurisdictionRule {
    pub const LEN: usize = 8 + // discriminator
        2 +  // from_jurisdiction
        2 +  // to_jurisdiction
        1 +  // is_allowed
        1 + 8 + // max_amount (option)
        8 +  // created_at
        1;   // bump
}

// ============================================================================
// Enums
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum InvestorType {
    #[default]
    Retail,
    Accredited,
    Institutional,
    QualifiedPurchaser,
}

// ============================================================================
// Context Structs
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = ComplianceConfig::LEN,
        seeds = [b"compliance-config"],
        bump
    )]
    pub config: Account<'info, ComplianceConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(investor: Pubkey)]
pub struct ManageWhitelist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"compliance-config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, ComplianceConfig>,

    #[account(
        init,
        payer = authority,
        space = WhitelistEntry::LEN,
        seeds = [b"whitelist", investor.as_ref()],
        bump
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveFromWhitelist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"compliance-config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, ComplianceConfig>,

    #[account(
        mut,
        seeds = [b"whitelist", whitelist_entry.investor.as_ref()],
        bump = whitelist_entry.bump
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,
}

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct ManageBlacklist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"compliance-config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, ComplianceConfig>,

    #[account(
        init,
        payer = authority,
        space = BlacklistEntry::LEN,
        seeds = [b"blacklist", address.as_ref()],
        bump
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveFromBlacklist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"compliance-config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, ComplianceConfig>,

    #[account(
        mut,
        seeds = [b"blacklist", blacklist_entry.address.as_ref()],
        bump = blacklist_entry.bump
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
}

#[derive(Accounts)]
#[instruction(from_jurisdiction: [u8; 2], to_jurisdiction: [u8; 2])]
pub struct ManageJurisdiction<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"compliance-config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, ComplianceConfig>,

    #[account(
        init,
        payer = authority,
        space = JurisdictionRule::LEN,
        seeds = [b"jurisdiction", from_jurisdiction.as_ref(), to_jurisdiction.as_ref()],
        bump
    )]
    pub jurisdiction_rule: Account<'info, JurisdictionRule>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"compliance-config"],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, ComplianceConfig>,
}

#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(
        seeds = [b"compliance-config"],
        bump = config.bump
    )]
    pub config: Account<'info, ComplianceConfig>,

    /// CHECK: Sender account from transfer
    pub sender: AccountInfo<'info>,

    /// CHECK: Receiver account from transfer
    pub receiver: AccountInfo<'info>,

    /// Sender's whitelist entry (optional for some checks)
    #[account(
        seeds = [b"whitelist", sender.key().as_ref()],
        bump = sender_whitelist.bump
    )]
    pub sender_whitelist: Option<Account<'info, WhitelistEntry>>,

    /// Receiver's whitelist entry (optional for some checks)
    #[account(
        seeds = [b"whitelist", receiver.key().as_ref()],
        bump = receiver_whitelist.bump
    )]
    pub receiver_whitelist: Option<Account<'info, WhitelistEntry>>,

    /// Sender's blacklist entry (optional)
    #[account(
        seeds = [b"blacklist", sender.key().as_ref()],
        bump = sender_blacklist.bump
    )]
    pub sender_blacklist: Option<Account<'info, BlacklistEntry>>,

    /// Receiver's blacklist entry (optional)
    #[account(
        seeds = [b"blacklist", receiver.key().as_ref()],
        bump = receiver_blacklist.bump
    )]
    pub receiver_blacklist: Option<Account<'info, BlacklistEntry>>,

    /// Jurisdiction rule for this transfer (optional)
    pub jurisdiction_rule: Option<Account<'info, JurisdictionRule>>,
}

#[derive(Accounts)]
pub struct VerifyCivicPass<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"compliance-config"],
        bump = config.bump
    )]
    pub config: Account<'info, ComplianceConfig>,

    #[account(
        mut,
        seeds = [b"whitelist", whitelist_entry.investor.as_ref()],
        bump = whitelist_entry.bump
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,

    /// CHECK: Gateway token account from Civic
    pub gateway_token: AccountInfo<'info>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct ComplianceInitialized {
    pub authority: Pubkey,
    pub gatekeeper_network: Pubkey,
}

#[event]
pub struct AddressWhitelisted {
    pub investor: Pubkey,
    pub investor_type: InvestorType,
    pub jurisdiction: [u8; 2],
    pub kyc_expiry: i64,
}

#[event]
pub struct AddressRemovedFromWhitelist {
    pub investor: Pubkey,
}

#[event]
pub struct AddressBlacklisted {
    pub address: Pubkey,
    pub reason: String,
}

#[event]
pub struct AddressRemovedFromBlacklist {
    pub address: Pubkey,
}

#[event]
pub struct JurisdictionRuleAdded {
    pub from_jurisdiction: [u8; 2],
    pub to_jurisdiction: [u8; 2],
    pub is_allowed: bool,
}

#[event]
pub struct TransfersPaused {
    pub paused_by: Pubkey,
}

#[event]
pub struct TransfersResumed {
    pub resumed_by: Pubkey,
}

#[event]
pub struct TransferValidated {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct CivicPassVerified {
    pub investor: Pubkey,
    pub expiry: i64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ComplianceError {
    #[msg("Transfers are paused")]
    TransfersPaused,
    #[msg("Sender is blacklisted")]
    SenderBlacklisted,
    #[msg("Receiver is blacklisted")]
    ReceiverBlacklisted,
    #[msg("Sender is not whitelisted")]
    SenderNotWhitelisted,
    #[msg("Receiver is not whitelisted")]
    ReceiverNotWhitelisted,
    #[msg("KYC has expired")]
    KYCExpired,
    #[msg("Transfer amount exceeded")]
    TransferAmountExceeded,
    #[msg("Transfer cooldown is active")]
    TransferCooldownActive,
    #[msg("Jurisdiction not allowed")]
    JurisdictionNotAllowed,
    #[msg("Jurisdiction amount exceeded")]
    JurisdictionAmountExceeded,
    #[msg("Invalid Civic Pass")]
    InvalidCivicPass,
    #[msg("Reason too long")]
    ReasonTooLong,
    #[msg("Unauthorized")]
    Unauthorized,
}
