// Governed trust registry — program-enforced commitment lifecycle (Build #533).
// Privacy: commitments and policy hashes only. No PII on-chain.

use anchor_lang::prelude::*;

declare_id!("EN29YNgHRuJ3h9cWrPS9hSDBt8DUNtoSSTT9EbUZewC8");

pub const REGISTRY_SEED: &[u8] = b"trust_registry";
pub const POLICY_SEED: &[u8] = b"trust_policy";
pub const COMMITMENT_SEED: &[u8] = b"trust_commitment";
pub const MAX_AUTHORITY_SLOTS: usize = 2;

pub const AUTHORITY_EMPTY: u8 = 0;
pub const AUTHORITY_ACTIVE: u8 = 1;
pub const AUTHORITY_SUSPENDED: u8 = 2;
pub const AUTHORITY_REVOKED: u8 = 3;

pub const COMMITMENT_ACTIVE: u8 = 1;
pub const COMMITMENT_REVOKED: u8 = 2;
pub const COMMITMENT_SUPERSEDED: u8 = 3;

/// v535 on-chain registry layout (before governance-transfer fields).
pub const TRUST_REGISTRY_LEGACY_INIT_SPACE: usize = 463;
/// Nomination TTL (~48h at ~400ms/slot).
pub const GOVERNANCE_NOMINATION_TTL_SLOTS: u64 = 432_000;

#[event]
pub struct GovernanceNominated {
    pub registry: Pubkey,
    pub current_authority: Pubkey,
    pub pending_authority: Pubkey,
    pub transfer_seq: u64,
    pub expires_at_slot: u64,
}

#[event]
pub struct GovernanceAccepted {
    pub registry: Pubkey,
    pub previous_authority: Pubkey,
    pub new_authority: Pubkey,
    pub transfer_seq: u64,
}

#[event]
pub struct GovernanceNominationCancelled {
    pub registry: Pubkey,
    pub cancelled_pending: Pubkey,
}

#[event]
pub struct GovernanceNominationExpired {
    pub registry: Pubkey,
    pub expired_pending: Pubkey,
}

#[event]
pub struct RegistryGovernanceLayoutExtended {
    pub registry: Pubkey,
    pub previous_len: usize,
    pub new_len: usize,
}

#[program]
pub mod abraxas_trust_registry {
    use super::*;
    use anchor_lang::Discriminator;

    pub fn initialize_registry(ctx: Context<InitializeRegistry>, registry_domain: [u8; 32]) -> Result<()> {
        require!(registry_domain != [0u8; 32], TrustRegistryError::InvalidConfig);
        let reg = &mut ctx.accounts.registry;
        reg.governance_authority = ctx.accounts.governance_authority.key();
        reg.registry_domain = registry_domain;
        reg.sequence_epoch = 1;
        reg.bump = ctx.bumps.registry;
        Ok(())
    }

    pub fn register_policy(
        ctx: Context<RegisterPolicy>,
        policy_commitment: [u8; 32],
        policy_version: u32,
    ) -> Result<()> {
        require!(policy_commitment != [0u8; 32], TrustRegistryError::InvalidConfig);
        let policy = &mut ctx.accounts.policy;
        policy.registry = ctx.accounts.registry.key();
        policy.policy_commitment = policy_commitment;
        policy.policy_version = policy_version;
        policy.active = true;
        policy.bump = ctx.bumps.policy;
        Ok(())
    }

    pub fn set_policy_active(ctx: Context<SetPolicyActive>, active: bool) -> Result<()> {
        ctx.accounts.policy.active = active;
        Ok(())
    }

    pub fn add_issuer(ctx: Context<RegistryGovernanceMut>, key_id: [u8; 32], pubkey: [u8; 32]) -> Result<()> {
        add_authority_slot(&mut ctx.accounts.registry.issuers, key_id, pubkey)
    }

    pub fn suspend_issuer(ctx: Context<RegistryGovernanceMut>, key_id: [u8; 32]) -> Result<()> {
        set_authority_status(&mut ctx.accounts.registry.issuers, key_id, AUTHORITY_SUSPENDED)
    }

    pub fn revoke_issuer(ctx: Context<RegistryGovernanceMut>, key_id: [u8; 32]) -> Result<()> {
        set_authority_status(&mut ctx.accounts.registry.issuers, key_id, AUTHORITY_REVOKED)
    }

    pub fn add_revoker(ctx: Context<RegistryGovernanceMut>, key_id: [u8; 32], pubkey: [u8; 32]) -> Result<()> {
        add_authority_slot(&mut ctx.accounts.registry.revokers, key_id, pubkey)
    }

    pub fn revoke_revoker(ctx: Context<RegistryGovernanceMut>, key_id: [u8; 32]) -> Result<()> {
        set_authority_status(&mut ctx.accounts.registry.revokers, key_id, AUTHORITY_REVOKED)
    }

    pub fn add_commitment_publisher(ctx: Context<RegistryGovernanceMut>, key_id: [u8; 32], pubkey: [u8; 32]) -> Result<()> {
        add_authority_slot(&mut ctx.accounts.registry.commitment_publishers, key_id, pubkey)
    }

    pub fn publish_commitment(
        ctx: Context<PublishCommitment>,
        commitment_digest: [u8; 32],
        sequence: u64,
    ) -> Result<()> {
        require!(commitment_digest != [0u8; 32], TrustRegistryError::InvalidConfig);
        require!(ctx.accounts.policy.active, TrustRegistryError::PolicyInactive);
        require!(
            ctx.accounts.policy.policy_commitment != [0u8; 32],
            TrustRegistryError::PolicyMismatch
        );
        require_keys_eq!(ctx.accounts.policy.registry, ctx.accounts.registry.key(), TrustRegistryError::PolicyMismatch);
        require_authority_active(
            &ctx.accounts.registry.commitment_publishers,
            ctx.accounts.publisher.key().to_bytes(),
        )?;

        let state = &mut ctx.accounts.commitment_state;
        if state.sequence > 0 {
            require_keys_eq!(state.registry, ctx.accounts.registry.key(), TrustRegistryError::PolicyMismatch);
            require!(state.commitment_digest == commitment_digest, TrustRegistryError::PolicyMismatch);
            require!(state.policy_commitment == ctx.accounts.policy.policy_commitment, TrustRegistryError::PolicyMismatch);
            require!(sequence > state.sequence, TrustRegistryError::StaleSequence);
            require!(state.status == COMMITMENT_ACTIVE, TrustRegistryError::Replayed);
        }
        state.registry = ctx.accounts.registry.key();
        state.policy = ctx.accounts.policy.key();
        state.commitment_digest = commitment_digest;
        state.policy_commitment = ctx.accounts.policy.policy_commitment;
        state.sequence = sequence;
        state.status = COMMITMENT_ACTIVE;
        state.publisher = ctx.accounts.publisher.key();
        state.updated_slot = Clock::get()?.slot;
        state.bump = ctx.bumps.commitment_state;
        ctx.accounts.registry.sequence_epoch = ctx.accounts.registry.sequence_epoch.saturating_add(1);
        Ok(())
    }

    pub fn revoke_commitment(ctx: Context<RevokeCommitment>, sequence: u64) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.commitment_state.registry,
            ctx.accounts.registry.key(),
            TrustRegistryError::PolicyMismatch
        );
        require_authority_active(
            &ctx.accounts.registry.revokers,
            ctx.accounts.revoker.key().to_bytes(),
        )?;
        apply_invalidation(
            &mut ctx.accounts.commitment_state,
            sequence,
            COMMITMENT_REVOKED,
            ctx.accounts.revoker.key(),
        )
    }

    /// One-time realloc for registries deployed before governance-transfer fields (v535).
    pub fn extend_registry_governance_layout(
        ctx: Context<ExtendRegistryGovernanceLayout>,
        registry_domain: [u8; 32],
    ) -> Result<()> {
        let info = ctx.accounts.registry.to_account_info();
        let data = info.try_borrow_data()?;
        require!(data.len() >= 8, TrustRegistryError::RegistryLayoutInvalid);
        require!(
            data[..8] == TrustRegistry::DISCRIMINATOR,
            TrustRegistryError::RegistryLayoutInvalid
        );
        drop(data);
        require_keys_eq!(
            read_legacy_governance_authority(&info)?,
            ctx.accounts.governance_authority.key(),
            TrustRegistryError::UnauthorizedGovernanceTransfer
        );
        require!(
            read_legacy_registry_domain(&info)? == registry_domain,
            TrustRegistryError::PolicyMismatch
        );
        let expected_full = 8 + TrustRegistry::INIT_SPACE;
        require!(
            info.data_len() == 8 + TRUST_REGISTRY_LEGACY_INIT_SPACE,
            TrustRegistryError::RegistryLayoutInvalid
        );
        let rent = Rent::get()?;
        let new_minimum = rent.minimum_balance(expected_full);
        let lamports_diff = new_minimum.saturating_sub(info.lamports());
        if lamports_diff > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.governance_authority.to_account_info(),
                        to: info.clone(),
                    },
                ),
                lamports_diff,
            )?;
        }
        info.realloc(expected_full, true)?;
        emit!(RegistryGovernanceLayoutExtended {
            registry: ctx.accounts.registry.key(),
            previous_len: 8 + TRUST_REGISTRY_LEGACY_INIT_SPACE,
            new_len: expected_full,
        });
        Ok(())
    }

    pub fn nominate_governance_authority(
        ctx: Context<NominateGovernanceAuthority>,
        new_authority: Pubkey,
        transfer_seq: u64,
    ) -> Result<()> {
        require!(new_authority != Pubkey::default(), TrustRegistryError::InvalidConfig);
        let reg = &mut ctx.accounts.registry;
        require_governance_layout_extended(&reg.to_account_info())?;
        let now = Clock::get()?.slot;
        clear_expired_pending(reg, now)?;
        require!(
            !is_pending_active(reg, now),
            TrustRegistryError::PendingGovernanceTransferActive
        );
        let expected_seq = reg.governance_transfer_seq.saturating_add(1);
        require!(transfer_seq == expected_seq, TrustRegistryError::GovernanceTransferStale);
        require!(new_authority != reg.governance_authority, TrustRegistryError::InvalidConfig);
        reg.pending_governance = new_authority;
        reg.pending_transfer_seq = transfer_seq;
        reg.pending_expires_at_slot = now.saturating_add(GOVERNANCE_NOMINATION_TTL_SLOTS);
        emit!(GovernanceNominated {
            registry: reg.key(),
            current_authority: reg.governance_authority,
            pending_authority: new_authority,
            transfer_seq,
            expires_at_slot: reg.pending_expires_at_slot,
        });
        Ok(())
    }

    pub fn accept_governance_authority(ctx: Context<AcceptGovernanceAuthority>, transfer_seq: u64) -> Result<()> {
        let reg = &mut ctx.accounts.registry;
        require_governance_layout_extended(&reg.to_account_info())?;
        let now = Clock::get()?.slot;
        require!(reg.pending_governance != Pubkey::default(), TrustRegistryError::NominationExpired);
        require!(is_pending_active(reg, now), TrustRegistryError::NominationExpired);
        require!(
            reg.pending_governance == ctx.accounts.pending_authority.key(),
            TrustRegistryError::UnauthorizedGovernanceTransfer
        );
        require!(transfer_seq == reg.pending_transfer_seq, TrustRegistryError::GovernanceTransferStale);
        require!(
            transfer_seq > reg.governance_transfer_seq,
            TrustRegistryError::GovernanceTransferStale
        );
        let previous = reg.governance_authority;
        let new_authority = reg.pending_governance;
        reg.governance_authority = new_authority;
        reg.governance_transfer_seq = transfer_seq;
        reg.pending_governance = Pubkey::default();
        reg.pending_transfer_seq = 0;
        reg.pending_expires_at_slot = 0;
        emit!(GovernanceAccepted {
            registry: reg.key(),
            previous_authority: previous,
            new_authority,
            transfer_seq,
        });
        Ok(())
    }

    pub fn cancel_governance_nomination(ctx: Context<CancelGovernanceNomination>) -> Result<()> {
        let reg = &mut ctx.accounts.registry;
        require_governance_layout_extended(&reg.to_account_info())?;
        require!(
            reg.pending_governance != Pubkey::default(),
            TrustRegistryError::InvalidConfig
        );
        let cancelled = reg.pending_governance;
        reg.pending_governance = Pubkey::default();
        reg.pending_transfer_seq = 0;
        reg.pending_expires_at_slot = 0;
        emit!(GovernanceNominationCancelled {
            registry: reg.key(),
            cancelled_pending: cancelled,
        });
        Ok(())
    }

    /// Permissionless cleanup after nomination TTL (does not change governance authority).
    pub fn expire_governance_nomination(ctx: Context<ExpireGovernanceNomination>) -> Result<()> {
        let reg = &mut ctx.accounts.registry;
        require_governance_layout_extended(&reg.to_account_info())?;
        let now = Clock::get()?.slot;
        require!(
            reg.pending_governance != Pubkey::default() && now > reg.pending_expires_at_slot,
            TrustRegistryError::NominationNotExpired
        );
        let expired = reg.pending_governance;
        reg.pending_governance = Pubkey::default();
        reg.pending_transfer_seq = 0;
        reg.pending_expires_at_slot = 0;
        emit!(GovernanceNominationExpired {
            registry: reg.key(),
            expired_pending: expired,
        });
        Ok(())
    }

    pub fn supersede_commitment(ctx: Context<RevokeCommitment>, sequence: u64) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.commitment_state.registry,
            ctx.accounts.registry.key(),
            TrustRegistryError::PolicyMismatch
        );
        require_authority_active(
            &ctx.accounts.registry.revokers,
            ctx.accounts.revoker.key().to_bytes(),
        )?;
        apply_invalidation(
            &mut ctx.accounts.commitment_state,
            sequence,
            COMMITMENT_SUPERSEDED,
            ctx.accounts.revoker.key(),
        )
    }
}

fn apply_invalidation(
    state: &mut Account<CommitmentState>,
    sequence: u64,
    status: u8,
    actor: Pubkey,
) -> Result<()> {
    require!(sequence > state.sequence, TrustRegistryError::StaleSequence);
    require!(state.status == COMMITMENT_ACTIVE, TrustRegistryError::Replayed);
    state.sequence = sequence;
    state.status = status;
    state.updated_slot = Clock::get()?.slot;
    state.invalidation_actor = actor;
    Ok(())
}

fn add_authority_slot(slots: &mut [AuthoritySlot; MAX_AUTHORITY_SLOTS], key_id: [u8; 32], pubkey: [u8; 32]) -> Result<()> {
    require!(key_id != [0u8; 32] && pubkey != [0u8; 32], TrustRegistryError::InvalidConfig);
    let mut empty: Option<usize> = None;
    for (i, slot) in slots.iter().enumerate() {
        if slot.status != AUTHORITY_EMPTY {
            require!(slot.key_id != key_id && slot.pubkey != pubkey, TrustRegistryError::DuplicateAuthority);
        } else if empty.is_none() {
            empty = Some(i);
        }
    }
    let idx = empty.ok_or(TrustRegistryError::AuthorityTableFull)?;
    slots[idx] = AuthoritySlot {
        key_id,
        pubkey,
        status: AUTHORITY_ACTIVE,
    };
    Ok(())
}

fn set_authority_status(slots: &mut [AuthoritySlot; MAX_AUTHORITY_SLOTS], key_id: [u8; 32], status: u8) -> Result<()> {
    for slot in slots.iter_mut() {
        if slot.status != AUTHORITY_EMPTY && slot.key_id == key_id {
            slot.status = status;
            return Ok(());
        }
    }
    err!(TrustRegistryError::UnknownAuthority)
}

fn require_authority_active(slots: &[AuthoritySlot; MAX_AUTHORITY_SLOTS], pubkey: [u8; 32]) -> Result<()> {
    let ok = slots.iter().any(|s| s.status == AUTHORITY_ACTIVE && s.pubkey == pubkey);
    require!(ok, TrustRegistryError::UnauthorizedAuthority);
    Ok(())
}

fn require_governance_layout_extended(info: &AccountInfo) -> Result<()> {
    require!(
        info.data_len() >= 8 + TrustRegistry::INIT_SPACE,
        TrustRegistryError::RegistryLayoutNotExtended
    );
    Ok(())
}

fn is_pending_active(reg: &TrustRegistry, now: u64) -> bool {
    reg.pending_governance != Pubkey::default() && now <= reg.pending_expires_at_slot
}

fn clear_expired_pending(reg: &mut TrustRegistry, now: u64) -> Result<()> {
    if reg.pending_governance != Pubkey::default() && now > reg.pending_expires_at_slot {
        reg.pending_governance = Pubkey::default();
        reg.pending_transfer_seq = 0;
        reg.pending_expires_at_slot = 0;
    }
    Ok(())
}

fn read_legacy_governance_authority(info: &AccountInfo) -> Result<Pubkey> {
    let data = info.try_borrow_data()?;
    require!(data.len() >= 8 + 32, TrustRegistryError::RegistryLayoutInvalid);
    Ok(Pubkey::try_from(&data[8..40]).map_err(|_| error!(TrustRegistryError::RegistryLayoutInvalid))?)
}

fn read_legacy_registry_domain(info: &AccountInfo) -> Result<[u8; 32]> {
    let data = info.try_borrow_data()?;
    require!(data.len() >= 8 + 64, TrustRegistryError::RegistryLayoutInvalid);
    let mut domain = [0u8; 32];
    domain.copy_from_slice(&data[40..72]);
    Ok(domain)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, Default)]
pub struct AuthoritySlot {
    pub key_id: [u8; 32],
    pub pubkey: [u8; 32],
    pub status: u8,
}

/// On-chain v535 registry body (before governance-transfer tail fields).
#[account]
#[derive(InitSpace)]
pub struct TrustRegistryV535 {
    pub governance_authority: Pubkey,
    pub registry_domain: [u8; 32],
    pub sequence_epoch: u64,
    pub bump: u8,
    pub issuers: [AuthoritySlot; MAX_AUTHORITY_SLOTS],
    pub revokers: [AuthoritySlot; MAX_AUTHORITY_SLOTS],
    pub commitment_publishers: [AuthoritySlot; MAX_AUTHORITY_SLOTS],
}

#[account]
#[derive(InitSpace)]
pub struct TrustRegistry {
    pub governance_authority: Pubkey,
    pub registry_domain: [u8; 32],
    pub sequence_epoch: u64,
    pub bump: u8,
    pub issuers: [AuthoritySlot; MAX_AUTHORITY_SLOTS],
    pub revokers: [AuthoritySlot; MAX_AUTHORITY_SLOTS],
    pub commitment_publishers: [AuthoritySlot; MAX_AUTHORITY_SLOTS],
    pub pending_governance: Pubkey,
    pub pending_transfer_seq: u64,
    pub pending_expires_at_slot: u64,
    pub governance_transfer_seq: u64,
}

#[account]
#[derive(InitSpace)]
pub struct PolicyRecord {
    pub registry: Pubkey,
    pub policy_commitment: [u8; 32],
    pub policy_version: u32,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CommitmentState {
    pub registry: Pubkey,
    pub policy: Pubkey,
    pub commitment_digest: [u8; 32],
    pub policy_commitment: [u8; 32],
    pub sequence: u64,
    pub status: u8,
    pub publisher: Pubkey,
    pub invalidation_actor: Pubkey,
    pub updated_slot: u64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(registry_domain: [u8; 32])]
pub struct InitializeRegistry<'info> {
    #[account(mut)]
    pub governance_authority: Signer<'info>,
    #[account(
        init,
        payer = governance_authority,
        space = 8 + TrustRegistry::INIT_SPACE,
        seeds = [REGISTRY_SEED, registry_domain.as_ref()],
        bump
    )]
    pub registry: Account<'info, TrustRegistry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegistryGovernanceMut<'info> {
    pub governance_authority: Signer<'info>,
    #[account(
        mut,
        has_one = governance_authority,
        seeds = [REGISTRY_SEED, registry.registry_domain.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, TrustRegistry>,
}

#[derive(Accounts)]
#[instruction(policy_commitment: [u8; 32])]
pub struct RegisterPolicy<'info> {
    #[account(mut)]
    pub governance_authority: Signer<'info>,
    #[account(
        mut,
        has_one = governance_authority,
        seeds = [REGISTRY_SEED, registry.registry_domain.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, TrustRegistry>,
    #[account(
        init,
        payer = governance_authority,
        space = 8 + PolicyRecord::INIT_SPACE,
        seeds = [POLICY_SEED, registry.key().as_ref(), policy_commitment.as_ref()],
        bump
    )]
    pub policy: Account<'info, PolicyRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPolicyActive<'info> {
    pub governance_authority: Signer<'info>,
    #[account(
        has_one = governance_authority,
        seeds = [REGISTRY_SEED, registry.registry_domain.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, TrustRegistry>,
    #[account(mut, has_one = registry)]
    pub policy: Account<'info, PolicyRecord>,
}

#[derive(Accounts)]
#[instruction(commitment_digest: [u8; 32], sequence: u64)]
pub struct PublishCommitment<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,
    #[account(
        mut,
        seeds = [REGISTRY_SEED, registry.registry_domain.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, TrustRegistry>,
    #[account(
        seeds = [POLICY_SEED, registry.key().as_ref(), policy.policy_commitment.as_ref()],
        bump = policy.bump,
        has_one = registry
    )]
    pub policy: Account<'info, PolicyRecord>,
    #[account(
        init_if_needed,
        payer = publisher,
        space = 8 + CommitmentState::INIT_SPACE,
        seeds = [COMMITMENT_SEED, registry.key().as_ref(), commitment_digest.as_ref()],
        bump
    )]
    pub commitment_state: Account<'info, CommitmentState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(registry_domain: [u8; 32])]
pub struct ExtendRegistryGovernanceLayout<'info> {
    #[account(mut)]
    pub governance_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [REGISTRY_SEED, registry_domain.as_ref()],
        bump,
        constraint = registry.data_len() == 8 + TRUST_REGISTRY_LEGACY_INIT_SPACE @ TrustRegistryError::RegistryLayoutInvalid,
    )]
    /// CHECK: legacy v535 bytes; validated and reallocated in the handler.
    pub registry: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct NominateGovernanceAuthority<'info> {
    pub governance_authority: Signer<'info>,
    #[account(
        mut,
        has_one = governance_authority,
        seeds = [REGISTRY_SEED, registry.registry_domain.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, TrustRegistry>,
}

#[derive(Accounts)]
#[instruction(transfer_seq: u64)]
pub struct AcceptGovernanceAuthority<'info> {
    pub pending_authority: Signer<'info>,
    #[account(
        mut,
        seeds = [REGISTRY_SEED, registry.registry_domain.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, TrustRegistry>,
}

#[derive(Accounts)]
pub struct CancelGovernanceNomination<'info> {
    pub governance_authority: Signer<'info>,
    #[account(
        mut,
        has_one = governance_authority,
        seeds = [REGISTRY_SEED, registry.registry_domain.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, TrustRegistry>,
}

#[derive(Accounts)]
pub struct ExpireGovernanceNomination<'info> {
    #[account(
        mut,
        seeds = [REGISTRY_SEED, registry.registry_domain.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, TrustRegistry>,
}

#[derive(Accounts)]
pub struct RevokeCommitment<'info> {
    pub revoker: Signer<'info>,
    #[account(
        seeds = [REGISTRY_SEED, registry.registry_domain.as_ref()],
        bump = registry.bump
    )]
    pub registry: Account<'info, TrustRegistry>,
    #[account(
        mut,
        seeds = [COMMITMENT_SEED, registry.key().as_ref(), commitment_state.commitment_digest.as_ref()],
        bump = commitment_state.bump,
        has_one = registry
    )]
    pub commitment_state: Account<'info, CommitmentState>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::Discriminator;
    use anchor_lang::solana_program::hash::hash;

    fn global_ix_disc(name: &str) -> [u8; 8] {
        let preimage = format!("global:{}", name);
        let h = hash(preimage.as_bytes());
        let mut out = [0u8; 8];
        out.copy_from_slice(&h.to_bytes()[..8]);
        out
    }

    fn account_disc(name: &str) -> [u8; 8] {
        let preimage = format!("account:{}", name);
        let h = hash(preimage.as_bytes());
        let mut out = [0u8; 8];
        out.copy_from_slice(&h.to_bytes()[..8]);
        out
    }

    /// Release integrity snapshot (Build #535) — must match TS `buildTrustRegistryIdl535`.
    #[test]
    fn idl_discriminator_snapshot_v535() {
        assert_eq!(TrustRegistry::DISCRIMINATOR, account_disc("TrustRegistry"));
        assert_eq!(PolicyRecord::DISCRIMINATOR, account_disc("PolicyRecord"));
        assert_eq!(CommitmentState::DISCRIMINATOR, account_disc("CommitmentState"));
    }

    #[test]
    fn stale_sequence_rejected() {
        let mut slots = [AuthoritySlot::default(); MAX_AUTHORITY_SLOTS];
        slots[0] = AuthoritySlot {
            key_id: [1u8; 32],
            pubkey: [2u8; 32],
            status: AUTHORITY_ACTIVE,
        };
        assert!(require_authority_active(&slots, [2u8; 32]).is_ok());
        assert!(require_authority_active(&slots, [9u8; 32]).is_err());
    }

    #[test]
    fn duplicate_authority_rejected() {
        let mut slots = [AuthoritySlot::default(); MAX_AUTHORITY_SLOTS];
        add_authority_slot(&mut slots, [1u8; 32], [2u8; 32]).unwrap();
        assert!(add_authority_slot(&mut slots, [1u8; 32], [3u8; 32]).is_err());
    }

    #[test]
    fn registry_layout_space_constants() {
        assert_eq!(TRUST_REGISTRY_LEGACY_INIT_SPACE, 463);
        assert_eq!(TrustRegistryV535::INIT_SPACE, TRUST_REGISTRY_LEGACY_INIT_SPACE);
        assert_eq!(TrustRegistry::INIT_SPACE, TRUST_REGISTRY_LEGACY_INIT_SPACE + 56);
    }

    #[test]
    fn governance_pending_expiry_clears() {
        let mut reg = TrustRegistry {
            governance_authority: Pubkey::new_unique(),
            registry_domain: [1u8; 32],
            sequence_epoch: 1,
            bump: 1,
            issuers: [AuthoritySlot::default(); MAX_AUTHORITY_SLOTS],
            revokers: [AuthoritySlot::default(); MAX_AUTHORITY_SLOTS],
            commitment_publishers: [AuthoritySlot::default(); MAX_AUTHORITY_SLOTS],
            pending_governance: Pubkey::new_unique(),
            pending_transfer_seq: 1,
            pending_expires_at_slot: 100,
            governance_transfer_seq: 0,
        };
        assert!(is_pending_active(&reg, 100));
        clear_expired_pending(&mut reg, 101).unwrap();
        assert_eq!(reg.pending_governance, Pubkey::default());
        assert!(!is_pending_active(&reg, 101));
    }
}

#[error_code]
pub enum TrustRegistryError {
    #[msg("invalid_config")]
    InvalidConfig,
    #[msg("policy_inactive")]
    PolicyInactive,
    #[msg("policy_mismatch")]
    PolicyMismatch,
    #[msg("unauthorized_authority")]
    UnauthorizedAuthority,
    #[msg("unknown_authority")]
    UnknownAuthority,
    #[msg("duplicate_authority")]
    DuplicateAuthority,
    #[msg("authority_table_full")]
    AuthorityTableFull,
    #[msg("stale_sequence")]
    StaleSequence,
    #[msg("replayed")]
    Replayed,
    #[msg("registry_layout_not_extended")]
    RegistryLayoutNotExtended,
    #[msg("registry_layout_invalid")]
    RegistryLayoutInvalid,
    #[msg("pending_governance_transfer_active")]
    PendingGovernanceTransferActive,
    #[msg("governance_transfer_stale")]
    GovernanceTransferStale,
    #[msg("unauthorized_governance_transfer")]
    UnauthorizedGovernanceTransfer,
    #[msg("nomination_expired")]
    NominationExpired,
    #[msg("nomination_not_expired")]
    NominationNotExpired,
}
