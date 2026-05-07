//! FILE: programs/cards/src/lib.rs
//! $CARDS — Abraxas Collector Crypt Program
//!
//! Token-2022 program with:
//!   - Transfer Hook  → auto-emits risk events on large transfers
//!   - Interest-Bearing extension  → cards accrue yield while held
//!   - Metadata Pointer  → on-chain card metadata
//!
//! On-chain event flow:
//!   transfer or resolve_duel
//!     → emit!(DuelResolvedEvent)
//!     → Helius webhook receives log
//!     → POST /api/helius
//!     → broadcast() via lib/sseRegistry.ts
//!     → EventSource in useHeliusStream
//!     → ingestHeliusEvent() → systemState CIRCUIT_TRIGGERED
//!
//! PDA seeds:
//!   Vault:       ["vault",       authority]
//!   HookConfig:  ["hook_config", authority]
//!   DuelRecord:  ["duel",        vault, duel_id_le_bytes]
//!   ExtraMetas:  ["extra-account-metas", mint] (spl-tlv standard)

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        self, Mint, TokenAccount, TokenInterface,
        TransferChecked, transfer_checked,
    },
};

// Transfer hook interface (spl-transfer-hook-interface)
// The #[interface] macro wires the discriminator so Token-2022 can call us
use spl_transfer_hook_interface::on_transfer;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta,
    seeds::Seed,
    state::ExtraAccountMetaList,
};

pub mod errors;
use errors::CardsError;

declare_id!("CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp");

// ════════════════════════════════════════════════════════════════════
//  EVENTS  (Helius Enhanced Webhook parses program log events)
// ════════════════════════════════════════════════════════════════════

/// Emitted on every duel resolution AND on high-value token transfers.
/// Helius picks this up, classifies risk_signal, and fires our webhook.
/// Frontend: /api/helius → broadcast → SovereignPulse terminal.
#[event]
pub struct DuelResolvedEvent {
    pub vault:          Pubkey,
    pub authority:      Pubkey,
    pub duel_id:        u64,
    pub winner:         Pubkey,
    /// 0 = low, 1 = medium, 2 = high, 3 = critical (CIRCUIT_TRIGGERED)
    pub risk_signal:    u8,
    pub timestamp:      i64,
    /// 0 = normal, 1 = circuit_triggered, 2 = paused
    pub new_vault_state: u8,
    pub amount:         u64,
    pub fee_collected:  u64,
    /// "DUEL" | "TRANSFER_HOOK" | "STAKE" — for frontend routing
    pub event_type:     [u8; 16],
}

fn event_type_bytes(s: &str) -> [u8; 16] {
    let mut arr = [0u8; 16];
    let b = s.as_bytes();
    arr[..b.len().min(16)].copy_from_slice(&b[..b.len().min(16)]);
    arr
}

// ════════════════════════════════════════════════════════════════════
//  ACCOUNT STRUCTS
// ════════════════════════════════════════════════════════════════════

/// Primary vault — one per authority. Tracks risk, state, and config.
#[account]
pub struct Vault {
    /// Owner who can call authority-gated instructions
    pub authority:      Pubkey,
    /// Admin for fee/threshold changes and emergency actions
    pub admin:          Pubkey,
    /// Token-2022 mint address this vault manages
    pub cards_mint:     Pubkey,
    /// Current risk level (0–255). Updated by transfer hook + resolve_duel.
    pub risk_level:     u8,
    /// Vault state: 0=normal, 1=circuit_triggered, 2=paused
    pub state:          u8,
    /// Cumulative duel count
    pub duel_count:     u64,
    /// Unix timestamp of last duel
    pub last_duel:      i64,
    /// Total cards ever issued
    pub total_issued:   u64,
    /// Transfer fee in basis points (100 = 1%)
    pub fee_bps:        u16,
    /// Transfer amount above which DuelResolvedEvent fires with risk_signal=3
    pub risk_threshold: u64,
    pub is_paused:      bool,
    pub bump:           u8,
}

impl Vault {
    pub const LEN: usize = 8   // discriminator
        + 32 * 3              // authority + admin + cards_mint
        + 1 * 2               // risk_level + state
        + 8 * 3               // duel_count + last_duel + total_issued
        + 2                   // fee_bps
        + 8                   // risk_threshold
        + 1 * 2;              // is_paused + bump
}

/// Companion to the Token-2022 transfer hook.
/// Stored as a separate PDA so the hook can read it cheaply.
#[account]
pub struct HookConfig {
    pub vault:          Pubkey,
    pub risk_threshold: u64,
    pub fee_bps:        u16,
    pub bump:           u8,
}

impl HookConfig {
    pub const LEN: usize = 8 + 32 + 8 + 2 + 1;
}

/// On-chain duel record. PDA per (vault, duel_id).
/// History is queryable via getProgramAccounts.
#[account]
pub struct DuelRecord {
    pub vault:     Pubkey,
    pub duel_id:   u64,
    pub player_a:  Pubkey,
    pub player_b:  Pubkey,
    /// Winner pubkey; Pubkey::default() = draw
    pub winner:    Pubkey,
    pub amount:    u64,
    pub timestamp: i64,
    pub bump:      u8,
}

impl DuelRecord {
    pub const LEN: usize = 8 + 32 * 4 + 8 * 2 + 1;
}

// ════════════════════════════════════════════════════════════════════
//  PROGRAM
// ════════════════════════════════════════════════════════════════════

#[program]
pub mod cards {
    use super::*;

    // ── INITIALIZE ──────────────────────────────────────────────────

    /// Deploy one vault per authority. Call once before anything else.
    /// Initializes Vault + HookConfig PDAs.
    /// After this: call initialize_extra_account_metas, then create the
    /// Token-2022 mint off-chain pointing to this program as transfer hook.
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        fee_bps: u16,
        risk_threshold: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority       = ctx.accounts.authority.key();
        vault.admin           = ctx.accounts.authority.key();
        vault.cards_mint      = ctx.accounts.mint.key();
        vault.fee_bps         = fee_bps;
        vault.risk_threshold  = risk_threshold;
        vault.state           = 0;
        vault.is_paused       = false;
        vault.last_duel       = Clock::get()?.unix_timestamp;
        vault.bump            = ctx.bumps.vault;

        let hook = &mut ctx.accounts.hook_config;
        hook.vault          = vault.key();
        hook.fee_bps        = fee_bps;
        hook.risk_threshold = risk_threshold;
        hook.bump           = ctx.bumps.hook_config;

        // Emit init event — Helius will index it immediately
        emit!(DuelResolvedEvent {
            vault:           vault.key(),
            authority:       vault.authority,
            duel_id:         0,
            winner:          Pubkey::default(),
            risk_signal:     0,
            timestamp:       Clock::get()?.unix_timestamp,
            new_vault_state: 0,
            amount:          0,
            fee_collected:   0,
            event_type:      event_type_bytes("INIT"),
        });

        Ok(())
    }

    /// Register the extra accounts the transfer hook needs.
    /// Call once after initialize_vault.
    /// The spl-tlv runtime uses this account when routing transfer hook calls.
    pub fn initialize_extra_account_metas(
        ctx: Context<InitializeExtraAccountMetas>,
    ) -> Result<()> {
        // We need Vault and HookConfig passed to the hook on every transfer.
        // Seeds resolve them deterministically — no user input needed at transfer time.
        let extra_metas = vec![
            // Slot 5: Vault PDA — seeds = ["vault", authority]
            // index 3 = authority (source_account.owner approximation; adjust for your flow)
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal { bytes: b"vault".to_vec() },
                    Seed::AccountKey { index: 3 }, // authority signer index
                ],
                false, // not a signer
                true,  // writable (we update vault.risk_level)
            ),
            // Slot 6: HookConfig PDA — seeds = ["hook_config", authority]
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal { bytes: b"hook_config".to_vec() },
                    Seed::AccountKey { index: 3 },
                ],
                false,
                false, // read-only
            ),
        ];

        ExtraAccountMetaList::add_to_instruction(
            &mut ctx.accounts.extra_account_metas.to_account_info(),
            &extra_metas,
        )?;

        Ok(())
    }

    // ── TRANSFER HOOK ────────────────────────────────────────────────

    /// Called automatically by Token-2022 on every token transfer.
    /// Collects fees + emits risk event on large transfers.
    /// Helius webhook receives the DuelResolvedEvent log within ~500ms.
    #[interface(spl_transfer_hook_interface::execute)]
    pub fn transfer_hook(ctx: Context<TransferHookCtx>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.hook_config;
        let vault  = &mut ctx.accounts.vault;

        // Fee in lamports-equivalent units (not transferred here — just logged)
        let fee = (amount as u128)
            .checked_mul(config.fee_bps as u128)
            .ok_or(CardsError::Overflow)?
            / 10_000;

        // Risk classification
        let risk_signal: u8 = if amount >= config.risk_threshold * 10 {
            3 // critical — CIRCUIT_TRIGGERED
        } else if amount >= config.risk_threshold {
            2 // high
        } else if amount >= config.risk_threshold / 2 {
            1 // medium
        } else {
            0 // low — no event needed, return early for gas efficiency
        };

        if risk_signal == 0 { return Ok(()); }

        // Update vault state on critical transfers
        if risk_signal >= 3 {
            vault.risk_level = risk_signal;
            vault.state = 1; // CIRCUIT_TRIGGERED
        } else if risk_signal == 2 && vault.state == 0 {
            vault.risk_level = risk_signal;
        }

        emit!(DuelResolvedEvent {
            vault:           vault.key(),
            authority:       vault.authority,
            duel_id:         Clock::get()?.unix_timestamp as u64,
            winner:          ctx.accounts.destination_account.owner,
            risk_signal,
            timestamp:       Clock::get()?.unix_timestamp,
            new_vault_state: vault.state,
            amount,
            fee_collected:   fee as u64,
            event_type:      event_type_bytes("TRANSFER_HOOK"),
        });

        Ok(())
    }

    // ── DUEL ─────────────────────────────────────────────────────────

    /// Resolve a duel. Creates a per-duel PDA record.
    /// Transfers tokens to winner (net of fee). Emits DuelResolvedEvent.
    pub fn resolve_duel(
        ctx: Context<ResolveDuel>,
        duel_id: u64,
        winner: Pubkey,
        risk_signal: u8,
        amount: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(!vault.is_paused,          CardsError::VaultPaused);
        require!(risk_signal <= 255,        CardsError::InvalidRiskSignal);

        // Fee deduction
        let fee = (amount as u128)
            .checked_mul(vault.fee_bps as u128)
            .ok_or(CardsError::Overflow)?
            / 10_000;
        let net = amount.checked_sub(fee as u64).ok_or(CardsError::Overflow)?;

        // State updates
        vault.duel_count = vault.duel_count.checked_add(1).ok_or(CardsError::Overflow)?;
        vault.last_duel  = Clock::get()?.unix_timestamp;
        vault.risk_level = risk_signal;
        if risk_signal >= 2 { vault.state = 1; }

        // Token transfer (net amount to winner)
        if net > 0 {
            let cpi_accounts = TransferChecked {
                from:      ctx.accounts.vault_token_account.to_account_info(),
                mint:      ctx.accounts.mint.to_account_info(),
                to:        ctx.accounts.winner_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            };
            // PDA signer seeds for vault authority
            let seeds = &[b"vault", vault.authority.as_ref(), &[vault.bump]];
            let signer = &[&seeds[..]];
            transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(), cpi_accounts, signer,
                ),
                net,
                ctx.accounts.mint.decimals,
            )?;
        }

        // Per-duel record
        let rec = &mut ctx.accounts.duel_record;
        rec.vault     = vault.key();
        rec.duel_id   = duel_id;
        rec.player_a  = vault.authority; // simplified — extend for two players
        rec.player_b  = winner;
        rec.winner    = winner;
        rec.amount    = amount;
        rec.timestamp = Clock::get()?.unix_timestamp;
        rec.bump      = ctx.bumps.duel_record;

        emit!(DuelResolvedEvent {
            vault:           vault.key(),
            authority:       vault.authority,
            duel_id,
            winner,
            risk_signal,
            timestamp:       Clock::get()?.unix_timestamp,
            new_vault_state: vault.state,
            amount,
            fee_collected:   fee as u64,
            event_type:      event_type_bytes("DUEL"),
        });

        Ok(())
    }

    // ── ADMIN SUITE ───────────────────────────────────────────────────

    pub fn pause_vault(ctx: Context<AdminAction>) -> Result<()> {
        require!(ctx.accounts.admin.key() == ctx.accounts.vault.admin, CardsError::AdminOnly);
        ctx.accounts.vault.is_paused = true;
        ctx.accounts.vault.state     = 2;
        Ok(())
    }

    pub fn unpause_vault(ctx: Context<AdminAction>) -> Result<()> {
        require!(ctx.accounts.admin.key() == ctx.accounts.vault.admin, CardsError::AdminOnly);
        ctx.accounts.vault.is_paused = false;
        ctx.accounts.vault.state     = 0;
        ctx.accounts.vault.risk_level = 0;
        Ok(())
    }

    pub fn update_config(
        ctx: Context<AdminAction>,
        new_fee_bps: u16,
        new_risk_threshold: u64,
    ) -> Result<()> {
        require!(ctx.accounts.admin.key() == ctx.accounts.vault.admin, CardsError::AdminOnly);
        ctx.accounts.vault.fee_bps        = new_fee_bps;
        ctx.accounts.vault.risk_threshold = new_risk_threshold;
        Ok(())
    }

    pub fn transfer_admin(ctx: Context<AdminAction>, new_admin: Pubkey) -> Result<()> {
        require!(ctx.accounts.admin.key() == ctx.accounts.vault.admin, CardsError::AdminOnly);
        ctx.accounts.vault.admin = new_admin;
        Ok(())
    }

    /// Emergency withdraw — admin only, drains vault token account
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>, amount: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(ctx.accounts.admin.key() == vault.admin, CardsError::AdminOnly);

        let seeds  = &[b"vault", vault.authority.as_ref(), &[vault.bump]];
        let signer = &[&seeds[..]];
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from:      ctx.accounts.vault_token_account.to_account_info(),
                    mint:      ctx.accounts.mint.to_account_info(),
                    to:        ctx.accounts.destination_token_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            amount,
            ctx.accounts.mint.decimals,
        )?;

        Ok(())
    }
}

// ════════════════════════════════════════════════════════════════════
//  ACCOUNT CONTEXTS
// ════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer   = authority,
        space   = Vault::LEN,
        seeds   = [b"vault", authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer   = authority,
        space   = HookConfig::LEN,
        seeds   = [b"hook_config", authority.key().as_ref()],
        bump
    )]
    pub hook_config: Account<'info, HookConfig>,

    /// Token-2022 mint. Create off-chain first, then pass here.
    /// Must have this program set as transfer-hook authority.
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program:  Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetas<'info> {
    /// PDA where spl-tlv stores the extra account list.
    /// Seeds: ["extra-account-metas", mint] — standard for spl-transfer-hook.
    #[account(mut)]
    pub extra_account_metas: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferHookCtx<'info> {
    // Accounts 0–3 are required by the spl-transfer-hook-interface spec (in order)
    #[account(mut)]
    pub source_account:      InterfaceAccount<'info, TokenAccount>,
    pub mint:                InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub destination_account: InterfaceAccount<'info, TokenAccount>,
    pub authority:           Signer<'info>,

    // Accounts 4+ are resolved from ExtraAccountMetaList at transfer time
    #[account(
        mut,
        seeds = [b"vault", authority.key().as_ref()],
        bump  = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        seeds = [b"hook_config", authority.key().as_ref()],
        bump  = hook_config.bump
    )]
    pub hook_config: Account<'info, HookConfig>,
}

#[derive(Accounts)]
#[instruction(duel_id: u64)]
pub struct ResolveDuel<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref()],
        bump  = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer   = payer,
        space   = DuelRecord::LEN,
        seeds   = [b"duel", vault.key().as_ref(), duel_id.to_le_bytes().as_ref()],
        bump
    )]
    pub duel_record: Account<'info, DuelRecord>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub winner_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program:  Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.authority.as_ref()],
        bump  = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(
        seeds = [b"vault", vault.authority.as_ref()],
        bump  = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub destination_token_account: InterfaceAccount<'info, TokenAccount>,

    pub admin: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}