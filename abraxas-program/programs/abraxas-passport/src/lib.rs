// FILE: abraxas-program/programs/abraxas-passport/src/lib.rs
// Abraxas Passport — pre-mainnet Anchor skeleton.
// Primary authoritative copy on Solana; same 52-byte root verifiable on Sui Move.

use anchor_lang::prelude::*;

mod passport_logic;
use passport_logic::{verify_passport_state, PassportRoot, PASSPORT_SERIALIZED_SIZE};

declare_id!("Passport1111111111111111111111111111111111");

pub const PASSPORT_SEED: &[u8] = b"passport";
pub const AUTHORITY_SEED: &[u8] = b"abraxas_passport_authority";

#[program]
pub mod abraxas_passport {
    use super::*;

    /// Initialize global issuance authority PDA (once per deployment)
    pub fn initialize_authority(ctx: Context<InitializeAuthority>) -> Result<()> {
        let auth = &mut ctx.accounts.authority_state;
        auth.admin = ctx.accounts.admin.key();
        auth.bump = ctx.bumps.authority_state;
        Ok(())
    }

    /// Create a Passport PDA for a holder (subject pubkey)
    pub fn init_passport(ctx: Context<InitPassport>) -> Result<()> {
        let passport = &mut ctx.accounts.passport;
        let authority = &ctx.accounts.authority_state;

        passport.version = 1;
        passport.stamps = 0;
        passport.authority = authority.key().to_bytes();
        passport.expires_at = 0;
        passport.revoked = 0;
        passport.nonce = 0;
        passport.subject = ctx.accounts.subject.key();
        passport.bump = ctx.bumps.passport;

        Ok(())
    }

    /// Issue stamps (bitwise OR) — authority signer required
    pub fn issue_stamps(ctx: Context<IssueStamps>, new_stamps: u16) -> Result<()> {
        let passport = &mut ctx.accounts.passport;
        require!(passport.revoked == 0, PassportError::Revoked);

        passport.stamps |= new_stamps;
        passport.nonce = passport.nonce.saturating_add(1);

        emit!(StampsIssued {
            subject: passport.subject,
            stamps: passport.stamps,
            nonce: passport.nonce,
        });

        Ok(())
    }

    /// Irreversible revocation
    pub fn revoke_passport(ctx: Context<RevokePassport>) -> Result<()> {
        let passport = &mut ctx.accounts.passport;
        passport.revoked = 1;
        passport.nonce = passport.nonce.saturating_add(1);
        Ok(())
    }

    /// CPI-friendly verify — fails if passport invalid for required stamp mask
    pub fn verify_passport(
        ctx: Context<VerifyPassport>,
        required_stamps: u16,
    ) -> Result<()> {
        let passport = &ctx.accounts.passport;
        let clock = Clock::get()?;

        let root = PassportRoot {
            version: passport.version,
            stamps: passport.stamps,
            authority: passport.authority,
            expires_at: passport.expires_at,
            revoked: passport.revoked,
            nonce: passport.nonce,
        };

        require!(
            verify_passport_state(&root, required_stamps, clock.unix_timestamp as u64),
            PassportError::VerificationFailed
        );

        Ok(())
    }
}

// ── Accounts ─────────────────────────────────────────────────────────────────

#[account]
pub struct AuthorityState {
    pub admin: Pubkey,
    pub bump: u8,
}

#[account]
pub struct PassportAccount {
    pub version: u8,
    pub stamps: u16,
    pub authority: [u8; 32],
    pub expires_at: u64,
    pub revoked: u8,
    pub nonce: u64,
    pub subject: Pubkey,
    pub bump: u8,
}

impl PassportAccount {
    pub const SIZE: usize = 8 + 1 + 2 + 32 + 8 + 1 + 8 + 32 + 1;
}

#[derive(Accounts)]
pub struct InitializeAuthority<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 1,
        seeds = [AUTHORITY_SEED],
        bump,
    )]
    pub authority_state: Account<'info, AuthorityState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitPassport<'info> {
    #[account(
        init,
        payer = payer,
        space = PassportAccount::SIZE,
        seeds = [PASSPORT_SEED, subject.key().as_ref()],
        bump,
    )]
    pub passport: Account<'info, PassportAccount>,
    /// CHECK: holder identity — not required to sign at init (backend may init)
    pub subject: UncheckedAccount<'info>,
    pub authority_state: Account<'info, AuthorityState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct IssueStamps<'info> {
    #[account(
        mut,
        seeds = [PASSPORT_SEED, passport.subject.as_ref()],
        bump = passport.bump,
        constraint = passport.authority == authority_state.key().to_bytes() @ PassportError::Unauthorized,
    )]
    pub passport: Account<'info, PassportAccount>,
    pub authority_state: Account<'info, AuthorityState>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokePassport<'info> {
    #[account(
        mut,
        seeds = [PASSPORT_SEED, passport.subject.as_ref()],
        bump = passport.bump,
    )]
    pub passport: Account<'info, PassportAccount>,
    pub authority_state: Account<'info, AuthorityState>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct VerifyPassport<'info> {
    #[account(
        seeds = [PASSPORT_SEED, passport.subject.as_ref()],
        bump = passport.bump,
    )]
    pub passport: Account<'info, PassportAccount>,
}

// ── Events / Errors ──────────────────────────────────────────────────────────

#[event]
pub struct StampsIssued {
    pub subject: Pubkey,
    pub stamps: u16,
    pub nonce: u64,
}

#[error_code]
pub enum PassportError {
    #[msg("Passport is revoked")]
    Revoked,
    #[msg("Unauthorized issuance authority")]
    Unauthorized,
    #[msg("Passport verification failed")]
    VerificationFailed,
}

// Re-export for IDL consumers
pub use passport_logic::PASSPORT_SERIALIZED_SIZE;
