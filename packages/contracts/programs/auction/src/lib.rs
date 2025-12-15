use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, Token2022, TransferChecked};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnU");

/// Auction Program
/// 
/// Enables auction-based sales of tokenized real-world assets.
/// Supports English auctions with bidding, settlement, and cancellation.
#[program]
pub mod auction {
    use super::*;

    /// Create a new auction for asset tokens
    pub fn create_auction(
        ctx: Context<CreateAuction>,
        asset_amount: u64,
        starting_price: u64,
        reserve_price: u64,
        min_bid_increment: u64,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        require!(asset_amount > 0, AuctionError::InvalidAmount);
        require!(starting_price > 0, AuctionError::InvalidPrice);
        require!(reserve_price >= starting_price, AuctionError::InvalidReservePrice);
        require!(min_bid_increment > 0, AuctionError::InvalidIncrement);
        
        let clock = Clock::get()?;
        require!(start_time >= clock.unix_timestamp, AuctionError::InvalidStartTime);
        require!(end_time > start_time, AuctionError::InvalidEndTime);
        require!(end_time - start_time >= 3600, AuctionError::AuctionTooShort); // Min 1 hour

        let auction = &mut ctx.accounts.auction;
        auction.seller = ctx.accounts.seller.key();
        auction.asset_mint = ctx.accounts.asset_mint.key();
        auction.payment_mint = ctx.accounts.payment_mint.key();
        auction.asset_amount = asset_amount;
        auction.starting_price = starting_price;
        auction.reserve_price = reserve_price;
        auction.min_bid_increment = min_bid_increment;
        auction.current_bid = 0;
        auction.current_bidder = Pubkey::default();
        auction.start_time = start_time;
        auction.end_time = end_time;
        auction.status = AuctionStatus::Created;
        auction.total_bids = 0;
        auction.created_at = clock.unix_timestamp;
        auction.bump = ctx.bumps.auction;

        // Transfer asset tokens from seller to auction vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.seller_asset_account.to_account_info(),
                mint: ctx.accounts.asset_mint.to_account_info(),
                to: ctx.accounts.auction_asset_vault.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        );

        token_2022::transfer_checked(
            transfer_ctx,
            asset_amount,
            ctx.accounts.asset_mint.decimals,
        )?;

        auction.status = AuctionStatus::Active;

        emit!(AuctionCreated {
            auction: auction.key(),
            seller: auction.seller,
            asset_mint: auction.asset_mint,
            asset_amount,
            starting_price,
            reserve_price,
            start_time,
            end_time,
        });

        msg!("Auction created by seller: {}", auction.seller);
        Ok(())
    }

    /// Place a bid on an auction
    pub fn place_bid(ctx: Context<PlaceBid>, bid_amount: u64) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(auction.status == AuctionStatus::Active, AuctionError::AuctionNotActive);
        require!(clock.unix_timestamp >= auction.start_time, AuctionError::AuctionNotStarted);
        require!(clock.unix_timestamp < auction.end_time, AuctionError::AuctionEnded);
        require!(
            ctx.accounts.bidder.key() != auction.seller,
            AuctionError::SellerCannotBid
        );

        // Check bid is valid
        if auction.current_bid == 0 {
            require!(bid_amount >= auction.starting_price, AuctionError::BidTooLow);
        } else {
            require!(
                bid_amount >= auction.current_bid + auction.min_bid_increment,
                AuctionError::BidTooLow
            );
        }

        // Refund previous bidder if exists
        if auction.current_bidder != Pubkey::default() && auction.current_bid > 0 {
            let auction_seeds = &[
                b"auction",
                auction.seller.as_ref(),
                auction.asset_mint.as_ref(),
                &auction.created_at.to_le_bytes(),
                &[auction.bump],
            ];
            let signer_seeds = &[&auction_seeds[..]];

            let refund_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.auction_payment_vault.to_account_info(),
                    mint: ctx.accounts.payment_mint.to_account_info(),
                    to: ctx.accounts.previous_bidder_payment_account.to_account_info(),
                    authority: auction.to_account_info(),
                },
                signer_seeds,
            );

            token_2022::transfer_checked(
                refund_ctx,
                auction.current_bid,
                ctx.accounts.payment_mint.decimals,
            )?;

            emit!(BidRefunded {
                auction: auction.key(),
                bidder: auction.current_bidder,
                amount: auction.current_bid,
            });
        }

        // Transfer new bid to auction vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.bidder_payment_account.to_account_info(),
                mint: ctx.accounts.payment_mint.to_account_info(),
                to: ctx.accounts.auction_payment_vault.to_account_info(),
                authority: ctx.accounts.bidder.to_account_info(),
            },
        );

        token_2022::transfer_checked(
            transfer_ctx,
            bid_amount,
            ctx.accounts.payment_mint.decimals,
        )?;

        // Record bid
        let bid = &mut ctx.accounts.bid;
        bid.auction = auction.key();
        bid.bidder = ctx.accounts.bidder.key();
        bid.amount = bid_amount;
        bid.timestamp = clock.unix_timestamp;
        bid.status = BidStatus::Active;
        bid.bump = ctx.bumps.bid;

        // Update auction state
        auction.current_bid = bid_amount;
        auction.current_bidder = ctx.accounts.bidder.key();
        auction.total_bids += 1;

        // Extend auction if bid placed in last 10 minutes
        let extension_threshold = 600; // 10 minutes
        if auction.end_time - clock.unix_timestamp < extension_threshold {
            auction.end_time = clock.unix_timestamp + extension_threshold;
            
            emit!(AuctionExtended {
                auction: auction.key(),
                new_end_time: auction.end_time,
            });
        }

        emit!(BidPlaced {
            auction: auction.key(),
            bidder: bid.bidder,
            amount: bid_amount,
            timestamp: bid.timestamp,
        });

        msg!("Bid placed: {} by {}", bid_amount, bid.bidder);
        Ok(())
    }

    /// Cancel a bid (only if outbid or auction cancelled)
    pub fn cancel_bid(ctx: Context<CancelBid>) -> Result<()> {
        let bid = &mut ctx.accounts.bid;
        let auction = &ctx.accounts.auction;

        require!(bid.bidder == ctx.accounts.bidder.key(), AuctionError::Unauthorized);
        require!(bid.status == BidStatus::Active, AuctionError::BidNotActive);
        
        // Can only cancel if not the current highest bidder or auction is cancelled
        require!(
            auction.current_bidder != bid.bidder || auction.status == AuctionStatus::Cancelled,
            AuctionError::CannotCancelWinningBid
        );

        bid.status = BidStatus::Cancelled;

        emit!(BidCancelled {
            auction: auction.key(),
            bidder: bid.bidder,
            amount: bid.amount,
        });

        Ok(())
    }

    /// Settle an auction after it ends
    pub fn settle_auction(ctx: Context<SettleAuction>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(auction.status == AuctionStatus::Active, AuctionError::AuctionNotActive);
        require!(clock.unix_timestamp >= auction.end_time, AuctionError::AuctionNotEnded);

        let auction_seeds = &[
            b"auction",
            auction.seller.as_ref(),
            auction.asset_mint.as_ref(),
            &auction.created_at.to_le_bytes(),
            &[auction.bump],
        ];
        let signer_seeds = &[&auction_seeds[..]];

        // Check if reserve price was met
        if auction.current_bid >= auction.reserve_price && auction.current_bidder != Pubkey::default() {
            // Successful auction - transfer assets to winner, payment to seller
            
            // Transfer asset tokens to winning bidder
            let transfer_asset_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.auction_asset_vault.to_account_info(),
                    mint: ctx.accounts.asset_mint.to_account_info(),
                    to: ctx.accounts.winner_asset_account.to_account_info(),
                    authority: auction.to_account_info(),
                },
                signer_seeds,
            );

            token_2022::transfer_checked(
                transfer_asset_ctx,
                auction.asset_amount,
                ctx.accounts.asset_mint.decimals,
            )?;

            // Transfer payment to seller
            let transfer_payment_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.auction_payment_vault.to_account_info(),
                    mint: ctx.accounts.payment_mint.to_account_info(),
                    to: ctx.accounts.seller_payment_account.to_account_info(),
                    authority: auction.to_account_info(),
                },
                signer_seeds,
            );

            token_2022::transfer_checked(
                transfer_payment_ctx,
                auction.current_bid,
                ctx.accounts.payment_mint.decimals,
            )?;

            auction.status = AuctionStatus::Settled;

            emit!(AuctionSettled {
                auction: auction.key(),
                winner: auction.current_bidder,
                winning_bid: auction.current_bid,
                seller: auction.seller,
            });

            msg!("Auction settled. Winner: {} with bid: {}", auction.current_bidder, auction.current_bid);
        } else {
            // Reserve not met - return assets to seller
            let transfer_asset_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.auction_asset_vault.to_account_info(),
                    mint: ctx.accounts.asset_mint.to_account_info(),
                    to: ctx.accounts.seller_asset_account.to_account_info(),
                    authority: auction.to_account_info(),
                },
                signer_seeds,
            );

            token_2022::transfer_checked(
                transfer_asset_ctx,
                auction.asset_amount,
                ctx.accounts.asset_mint.decimals,
            )?;

            // Refund highest bidder if exists
            if auction.current_bidder != Pubkey::default() && auction.current_bid > 0 {
                let refund_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.auction_payment_vault.to_account_info(),
                        mint: ctx.accounts.payment_mint.to_account_info(),
                        to: ctx.accounts.winner_payment_account.to_account_info(),
                        authority: auction.to_account_info(),
                    },
                    signer_seeds,
                );

                token_2022::transfer_checked(
                    refund_ctx,
                    auction.current_bid,
                    ctx.accounts.payment_mint.decimals,
                )?;
            }

            auction.status = AuctionStatus::Failed;

            emit!(AuctionFailed {
                auction: auction.key(),
                highest_bid: auction.current_bid,
                reserve_price: auction.reserve_price,
            });

            msg!("Auction failed - reserve price not met");
        }

        Ok(())
    }

    /// Cancel an auction (only by seller before any bids or by admin)
    pub fn cancel_auction(ctx: Context<CancelAuction>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        
        require!(
            auction.status == AuctionStatus::Created || auction.status == AuctionStatus::Active,
            AuctionError::CannotCancelAuction
        );
        require!(
            auction.seller == ctx.accounts.authority.key() || ctx.accounts.authority.key() == auction.seller,
            AuctionError::Unauthorized
        );

        // If there are bids, only admin can cancel
        if auction.total_bids > 0 {
            require!(auction.current_bid == 0, AuctionError::HasActiveBids);
        }

        let auction_seeds = &[
            b"auction",
            auction.seller.as_ref(),
            auction.asset_mint.as_ref(),
            &auction.created_at.to_le_bytes(),
            &[auction.bump],
        ];
        let signer_seeds = &[&auction_seeds[..]];

        // Return assets to seller
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.auction_asset_vault.to_account_info(),
                mint: ctx.accounts.asset_mint.to_account_info(),
                to: ctx.accounts.seller_asset_account.to_account_info(),
                authority: auction.to_account_info(),
            },
            signer_seeds,
        );

        token_2022::transfer_checked(
            transfer_ctx,
            auction.asset_amount,
            ctx.accounts.asset_mint.decimals,
        )?;

        auction.status = AuctionStatus::Cancelled;

        emit!(AuctionCancelled {
            auction: auction.key(),
            cancelled_by: ctx.accounts.authority.key(),
        });

        msg!("Auction cancelled");
        Ok(())
    }

    /// Extend an auction end time (only by seller)
    pub fn extend_auction(ctx: Context<ExtendAuction>, new_end_time: i64) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(auction.status == AuctionStatus::Active, AuctionError::AuctionNotActive);
        require!(auction.seller == ctx.accounts.seller.key(), AuctionError::Unauthorized);
        require!(new_end_time > auction.end_time, AuctionError::InvalidEndTime);
        require!(clock.unix_timestamp < auction.end_time, AuctionError::AuctionEnded);

        let old_end_time = auction.end_time;
        auction.end_time = new_end_time;

        emit!(AuctionExtended {
            auction: auction.key(),
            new_end_time,
        });

        msg!("Auction extended from {} to {}", old_end_time, new_end_time);
        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[account]
#[derive(Default)]
pub struct Auction {
    /// Seller who created the auction
    pub seller: Pubkey,
    /// Asset token mint
    pub asset_mint: Pubkey,
    /// Payment token mint (e.g., USDC)
    pub payment_mint: Pubkey,
    /// Amount of asset tokens being auctioned
    pub asset_amount: u64,
    /// Starting price
    pub starting_price: u64,
    /// Reserve price (minimum to sell)
    pub reserve_price: u64,
    /// Minimum bid increment
    pub min_bid_increment: u64,
    /// Current highest bid
    pub current_bid: u64,
    /// Current highest bidder
    pub current_bidder: Pubkey,
    /// Auction start time
    pub start_time: i64,
    /// Auction end time
    pub end_time: i64,
    /// Auction status
    pub status: AuctionStatus,
    /// Total number of bids
    pub total_bids: u64,
    /// Creation timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl Auction {
    pub const LEN: usize = 8 + // discriminator
        32 + // seller
        32 + // asset_mint
        32 + // payment_mint
        8 +  // asset_amount
        8 +  // starting_price
        8 +  // reserve_price
        8 +  // min_bid_increment
        8 +  // current_bid
        32 + // current_bidder
        8 +  // start_time
        8 +  // end_time
        1 +  // status
        8 +  // total_bids
        8 +  // created_at
        1;   // bump
}

#[account]
#[derive(Default)]
pub struct Bid {
    /// Auction this bid is for
    pub auction: Pubkey,
    /// Bidder
    pub bidder: Pubkey,
    /// Bid amount
    pub amount: u64,
    /// Bid timestamp
    pub timestamp: i64,
    /// Bid status
    pub status: BidStatus,
    /// PDA bump
    pub bump: u8,
}

impl Bid {
    pub const LEN: usize = 8 + // discriminator
        32 + // auction
        32 + // bidder
        8 +  // amount
        8 +  // timestamp
        1 +  // status
        1;   // bump
}

// ============================================================================
// Enums
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum AuctionStatus {
    #[default]
    Created,
    Active,
    Settled,
    Cancelled,
    Failed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum BidStatus {
    #[default]
    Active,
    Outbid,
    Won,
    Refunded,
    Cancelled,
}

// ============================================================================
// Context Structs
// ============================================================================

#[derive(Accounts)]
pub struct CreateAuction<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        init,
        payer = seller,
        space = Auction::LEN,
        seeds = [b"auction", seller.key().as_ref(), asset_mint.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub auction: Account<'info, Auction>,

    pub asset_mint: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Mint>>,
    
    pub payment_mint: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Mint>>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = seller,
        associated_token::token_program = token_program,
    )]
    pub seller_asset_account: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Account>>,

    #[account(
        init,
        payer = seller,
        associated_token::mint = asset_mint,
        associated_token::authority = auction,
        associated_token::token_program = token_program,
    )]
    pub auction_asset_vault: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Account>>,

    #[account(
        init,
        payer = seller,
        associated_token::mint = payment_mint,
        associated_token::authority = auction,
        associated_token::token_program = token_program,
    )]
    pub auction_payment_vault: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Account>>,

    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.seller.as_ref(), auction.asset_mint.as_ref(), &auction.created_at.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,

    #[account(
        init,
        payer = bidder,
        space = Bid::LEN,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, Bid>,

    pub payment_mint: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Mint>>,

    #[account(
        mut,
        associated_token::mint = payment_mint,
        associated_token::authority = bidder,
        associated_token::token_program = token_program,
    )]
    pub bidder_payment_account: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Account>>,

    #[account(
        mut,
        associated_token::mint = payment_mint,
        associated_token::authority = auction,
        associated_token::token_program = token_program,
    )]
    pub auction_payment_vault: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Account>>,

    /// CHECK: Previous bidder's payment account for refund
    #[account(mut)]
    pub previous_bidder_payment_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    pub auction: Account<'info, Auction>,

    #[account(
        mut,
        seeds = [b"bid", auction.key().as_ref(), bidder.key().as_ref()],
        bump = bid.bump,
        has_one = bidder
    )]
    pub bid: Account<'info, Bid>,
}

#[derive(Accounts)]
pub struct SettleAuction<'info> {
    #[account(mut)]
    pub settler: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.seller.as_ref(), auction.asset_mint.as_ref(), &auction.created_at.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,

    pub asset_mint: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Mint>>,
    
    pub payment_mint: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Mint>>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = auction,
        associated_token::token_program = token_program,
    )]
    pub auction_asset_vault: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Account>>,

    #[account(
        mut,
        associated_token::mint = payment_mint,
        associated_token::authority = auction,
        associated_token::token_program = token_program,
    )]
    pub auction_payment_vault: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Account>>,

    /// CHECK: Winner's asset account
    #[account(mut)]
    pub winner_asset_account: UncheckedAccount<'info>,

    /// CHECK: Winner's payment account (for refund if reserve not met)
    #[account(mut)]
    pub winner_payment_account: UncheckedAccount<'info>,

    /// CHECK: Seller's asset account (for return if reserve not met)
    #[account(mut)]
    pub seller_asset_account: UncheckedAccount<'info>,

    /// CHECK: Seller's payment account
    #[account(mut)]
    pub seller_payment_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct CancelAuction<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.seller.as_ref(), auction.asset_mint.as_ref(), &auction.created_at.to_le_bytes()],
        bump = auction.bump
    )]
    pub auction: Account<'info, Auction>,

    pub asset_mint: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Mint>>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = auction,
        associated_token::token_program = token_program,
    )]
    pub auction_asset_vault: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Account>>,

    #[account(
        mut,
        associated_token::mint = asset_mint,
        associated_token::authority = authority,
        associated_token::token_program = token_program,
    )]
    pub seller_asset_account: InterfaceAccount<'info, token_2022::spl_token_2022::extension::BaseStateWithExtensions<token_2022::spl_token_2022::state::Account>>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct ExtendAuction<'info> {
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"auction", auction.seller.as_ref(), auction.asset_mint.as_ref(), &auction.created_at.to_le_bytes()],
        bump = auction.bump,
        has_one = seller
    )]
    pub auction: Account<'info, Auction>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct AuctionCreated {
    pub auction: Pubkey,
    pub seller: Pubkey,
    pub asset_mint: Pubkey,
    pub asset_amount: u64,
    pub starting_price: u64,
    pub reserve_price: u64,
    pub start_time: i64,
    pub end_time: i64,
}

#[event]
pub struct BidPlaced {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct BidRefunded {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
}

#[event]
pub struct BidCancelled {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
}

#[event]
pub struct AuctionSettled {
    pub auction: Pubkey,
    pub winner: Pubkey,
    pub winning_bid: u64,
    pub seller: Pubkey,
}

#[event]
pub struct AuctionFailed {
    pub auction: Pubkey,
    pub highest_bid: u64,
    pub reserve_price: u64,
}

#[event]
pub struct AuctionCancelled {
    pub auction: Pubkey,
    pub cancelled_by: Pubkey,
}

#[event]
pub struct AuctionExtended {
    pub auction: Pubkey,
    pub new_end_time: i64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum AuctionError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Invalid reserve price")]
    InvalidReservePrice,
    #[msg("Invalid bid increment")]
    InvalidIncrement,
    #[msg("Invalid start time")]
    InvalidStartTime,
    #[msg("Invalid end time")]
    InvalidEndTime,
    #[msg("Auction duration too short")]
    AuctionTooShort,
    #[msg("Auction not active")]
    AuctionNotActive,
    #[msg("Auction not started")]
    AuctionNotStarted,
    #[msg("Auction has ended")]
    AuctionEnded,
    #[msg("Auction has not ended")]
    AuctionNotEnded,
    #[msg("Bid too low")]
    BidTooLow,
    #[msg("Seller cannot bid on own auction")]
    SellerCannotBid,
    #[msg("Bid not active")]
    BidNotActive,
    #[msg("Cannot cancel winning bid")]
    CannotCancelWinningBid,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Cannot cancel auction")]
    CannotCancelAuction,
    #[msg("Auction has active bids")]
    HasActiveBids,
}
