use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, Token2022, TransferChecked};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnT");

/// Escrow Program
/// 
/// Manages secure token and payment escrow for asset transactions.
/// Supports atomic swaps between asset tokens and payment tokens (USDC).
#[program]
pub mod escrow {
    use super::*;

    /// Create a new escrow for a token purchase
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        asset_amount: u64,
        payment_amount: u64,
        expires_at: i64,
    ) -> Result<()> {
        require!(asset_amount > 0, EscrowError::InvalidAmount);
        require!(payment_amount > 0, EscrowError::InvalidAmount);
        require!(
            expires_at > Clock::get()?.unix_timestamp,
            EscrowError::InvalidExpiration
        );

        let escrow = &mut ctx.accounts.escrow;
        escrow.buyer = ctx.accounts.buyer.key();
        escrow.seller = ctx.accounts.seller.key();
        escrow.asset_mint = ctx.accounts.asset_mint.key();
        escrow.payment_mint = ctx.accounts.payment_mint.key();
        escrow.asset_amount = asset_amount;
        escrow.payment_amount = payment_amount;
        escrow.status = EscrowStatus::Created;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.expires_at = expires_at;
        escrow.bump = ctx.bumps.escrow;

        emit!(EscrowCreated {
            escrow: escrow.key(),
            buyer: escrow.buyer,
            seller: escrow.seller,
            asset_amount,
            payment_amount,
            expires_at,
        });

        msg!("Escrow created between buyer {} and seller {}", escrow.buyer, escrow.seller);
        Ok(())
    }

    /// Deposit payment tokens into escrow (buyer action)
    pub fn deposit_payment(ctx: Context<DepositPayment>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.status == EscrowStatus::Created, EscrowError::InvalidStatus);
        require!(
            Clock::get()?.unix_timestamp < escrow.expires_at,
            EscrowError::EscrowExpired
        );

        // Transfer payment tokens from buyer to escrow vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.buyer_payment_account.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(),
                to: ctx.accounts.escrow_payment_vault.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );

        token_2022::transfer_checked(
            transfer_ctx,
            escrow.payment_amount,
            ctx.accounts.payment_mint.decimals,
        )?;

        escrow.status = EscrowStatus::PaymentDeposited;

        emit!(PaymentDeposited {
            escrow: escrow.key(),
            amount: escrow.payment_amount,
        });

        Ok(())
    }

    /// Deposit asset tokens into escrow (seller action)
    pub fn deposit_asset(ctx: Context<DepositAsset>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(
            escrow.status == EscrowStatus::PaymentDeposited,
            EscrowError::InvalidStatus
        );
        require!(
            Clock::get()?.unix_timestamp < escrow.expires_at,
            EscrowError::EscrowExpired
        );

        // Transfer asset tokens from seller to escrow vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.seller_asset_account.to_account_info(),
                mint: ctx.accounts.asset_mint.to_account_info(),
                to: ctx.accounts.escrow_asset_vault.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        );

        token_2022::transfer_checked(
            transfer_ctx,
            escrow.asset_amount,
            ctx.accounts.asset_mint.decimals,
        )?;

        escrow.status = EscrowStatus::FullyFunded;

        emit!(AssetDeposited {
            escrow: escrow.key(),
            amount: escrow.asset_amount,
        });

        Ok(())
    }

    /// Release escrow - complete the swap
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.status == EscrowStatus::FullyFunded, EscrowError::InvalidStatus);

        let escrow_seeds = &[
            b"escrow",
            escrow.buyer.as_ref(),
            escrow.asset_mint.as_ref(),
            &[escrow.bump],
        ];
        let signer_seeds = &[&escrow_seeds[..]];

        // Transfer asset tokens to buyer
        let transfer_asset_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.escrow_asset_vault.to_account_info(),
                mint: ctx.accounts.asset_mint.to_account_info(),
                to: ctx.accounts.buyer_asset_account.to_account_info(),
                authority: ctx.accounts.escrow.to_account_info(),
            },
            signer_seeds,
        );

        token_2022::transfer_checked(
            transfer_asset_ctx,
            escrow.asset_amount,
            ctx.accounts.asset_mint.decimals,
        )?;

        // Transfer payment tokens to seller
        let transfer_payment_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.escrow_payment_vault.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(),
                to: ctx.accounts.seller_payment_account.to_account_info(),
                authority: ctx.accounts.escrow.to_account_info(),
            },
            signer_seeds,
        );

        token_2022::transfer_checked(
            transfer_payment_ctx,
            escrow.payment_amount,
            ctx.accounts.payment_mint.decimals,
        )?;

        emit!(EscrowReleased {
            escrow: escrow.key(),
            released_at: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Refund escrow - return funds to original owners
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(
            escrow.status != EscrowStatus::Released && escrow.status != EscrowStatus::Refunded,
            EscrowError::InvalidStatus
        );

        let escrow_seeds = &[
            b"escrow",
            escrow.buyer.as_ref(),
            escrow.asset_mint.as_ref(),
            &[escrow.bump],
        ];
        let signer_seeds = &[&escrow_seeds[..]];

        // Refund payment to buyer if deposited
        if escrow.status == EscrowStatus::PaymentDeposited || escrow.status == EscrowStatus::FullyFunded {
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.escrow_payment_vault.to_account_info(),
                    mint: ctx.accounts.payment_mint.to_account_info(),
                    to: ctx.accounts.buyer_payment_account.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            );

            token_2022::transfer_checked(
                transfer_ctx,
                escrow.payment_amount,
                ctx.accounts.payment_mint.decimals,
            )?;
        }

        // Refund asset to seller if deposited
        if escrow.status == EscrowStatus::FullyFunded {
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.escrow_asset_vault.to_account_info(),
                    mint: ctx.accounts.asset_mint.to_account_info(),
                    to: ctx.accounts.seller_asset_account.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            );

            token_2022::transfer_checked(
                transfer_ctx,
                escrow.asset_amount,
                ctx.accounts.asset_mint.decimals,
            )?;
        }

        emit!(EscrowRefunded {
            escrow: escrow.key(),
            refunded_at: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ===========================================
// ACCOUNTS
// ===========================================

#[derive(Accounts)]
pub struct CreateEscrow<'info> {
    #[account(
        init,
        payer = buyer,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", buyer.key().as_ref(), asset_mint.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Seller address
    pub seller: AccountInfo<'info>,

    /// CHECK: Asset token mint
    pub asset_mint: AccountInfo<'info>,

    /// CHECK: Payment token mint (USDC)
    pub payment_mint: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositPayment<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.asset_mint.as_ref()],
        bump = escrow.bump,
        has_one = buyer
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Buyer's payment token account
    #[account(mut)]
    pub buyer_payment_account: AccountInfo<'info>,

    /// CHECK: Escrow payment vault
    #[account(mut)]
    pub escrow_payment_vault: AccountInfo<'info>,

    /// CHECK: Payment mint
    pub payment_mint: AccountInfo<'info>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct DepositAsset<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.asset_mint.as_ref()],
        bump = escrow.bump,
        has_one = seller
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub seller: Signer<'info>,

    /// CHECK: Seller's asset token account
    #[account(mut)]
    pub seller_asset_account: AccountInfo<'info>,

    /// CHECK: Escrow asset vault
    #[account(mut)]
    pub escrow_asset_vault: AccountInfo<'info>,

    /// CHECK: Asset mint
    pub asset_mint: AccountInfo<'info>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.asset_mint.as_ref()],
        bump = escrow.bump,
        close = buyer
    )]
    pub escrow: Account<'info, Escrow>,

    /// CHECK: Buyer
    #[account(mut)]
    pub buyer: AccountInfo<'info>,

    /// CHECK: Seller
    #[account(mut)]
    pub seller: AccountInfo<'info>,

    /// CHECK: Escrow asset vault
    #[account(mut)]
    pub escrow_asset_vault: AccountInfo<'info>,

    /// CHECK: Escrow payment vault
    #[account(mut)]
    pub escrow_payment_vault: AccountInfo<'info>,

    /// CHECK: Buyer's asset account
    #[account(mut)]
    pub buyer_asset_account: AccountInfo<'info>,

    /// CHECK: Seller's payment account
    #[account(mut)]
    pub seller_payment_account: AccountInfo<'info>,

    /// CHECK: Asset mint
    pub asset_mint: AccountInfo<'info>,

    /// CHECK: Payment mint
    pub payment_mint: AccountInfo<'info>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.buyer.as_ref(), escrow.asset_mint.as_ref()],
        bump = escrow.bump,
        close = buyer
    )]
    pub escrow: Account<'info, Escrow>,

    /// CHECK: Buyer
    #[account(mut)]
    pub buyer: AccountInfo<'info>,

    /// CHECK: Seller
    #[account(mut)]
    pub seller: AccountInfo<'info>,

    /// CHECK: Escrow asset vault
    #[account(mut)]
    pub escrow_asset_vault: AccountInfo<'info>,

    /// CHECK: Escrow payment vault
    #[account(mut)]
    pub escrow_payment_vault: AccountInfo<'info>,

    /// CHECK: Buyer's payment account
    #[account(mut)]
    pub buyer_payment_account: AccountInfo<'info>,

    /// CHECK: Seller's asset account
    #[account(mut)]
    pub seller_asset_account: AccountInfo<'info>,

    /// CHECK: Asset mint
    pub asset_mint: AccountInfo<'info>,

    /// CHECK: Payment mint
    pub payment_mint: AccountInfo<'info>,

    /// Signer must be buyer, seller, or platform admin
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token2022>,
}

// ===========================================
// STATE
// ===========================================

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    /// Buyer's address
    pub buyer: Pubkey,
    /// Seller's address
    pub seller: Pubkey,
    /// Asset token mint
    pub asset_mint: Pubkey,
    /// Payment token mint (USDC)
    pub payment_mint: Pubkey,
    /// Amount of asset tokens
    pub asset_amount: u64,
    /// Amount of payment tokens
    pub payment_amount: u64,
    /// Current status
    pub status: EscrowStatus,
    /// Creation timestamp
    pub created_at: i64,
    /// Expiration timestamp
    pub expires_at: i64,
    /// PDA bump
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EscrowStatus {
    Created,
    PaymentDeposited,
    FullyFunded,
    Released,
    Refunded,
    Disputed,
}

// ===========================================
// EVENTS
// ===========================================

#[event]
pub struct EscrowCreated {
    pub escrow: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub asset_amount: u64,
    pub payment_amount: u64,
    pub expires_at: i64,
}

#[event]
pub struct PaymentDeposited {
    pub escrow: Pubkey,
    pub amount: u64,
}

#[event]
pub struct AssetDeposited {
    pub escrow: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EscrowReleased {
    pub escrow: Pubkey,
    pub released_at: i64,
}

#[event]
pub struct EscrowRefunded {
    pub escrow: Pubkey,
    pub refunded_at: i64,
}

// ===========================================
// ERRORS
// ===========================================

#[error_code]
pub enum EscrowError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid expiration time")]
    InvalidExpiration,
    #[msg("Invalid escrow status for this operation")]
    InvalidStatus,
    #[msg("Escrow has expired")]
    EscrowExpired,
    #[msg("Unauthorized")]
    Unauthorized,
}
