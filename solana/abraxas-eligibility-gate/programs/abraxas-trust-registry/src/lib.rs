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

#[program]
pub mod abraxas_trust_registry {
    use super::*;

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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, Default)]
pub struct AuthoritySlot {
    pub key_id: [u8; 32],
    pub pubkey: [u8; 32],
    pub status: u8,
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
}
