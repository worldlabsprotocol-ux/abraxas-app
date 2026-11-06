// Partner-owned reference consumer for activate_protocol_access.
// Local/sandbox reference only. Never transfers SOL/tokens, mints, swaps,
// calls token programs, or performs arbitrary CPI.
// Entitlement is expiry-bound from the verified Authorization expires_at.

use abraxas_eligibility_gate::canonical::CONSUMER_AUTH_SEED;
use abraxas_eligibility_gate::cpi;
use abraxas_eligibility_gate::cpi::accounts::Consume;
use abraxas_eligibility_gate::program::AbraxasEligibilityGate;
use abraxas_eligibility_gate::{Authorization, GateConfig, SIGNER_ACTIVE, SIGNER_RETIRING};
use anchor_lang::prelude::*;

declare_id!("3B9eE1WtrtZQwJrkhFSKxxaZrefRJ73P53xHBBP3Bv1j");

pub const PROTOCOL_CONFIG_SEED: &[u8] = b"protocol_access_config";
pub const ENTITLEMENT_SEED: &[u8] = b"protocol_access";
pub const LEGACY_PROTOCOL_CONFIG_ACCOUNT_SIZE: usize = 169;

#[program]
pub mod abraxas_protocol_access {
    use super::*;

    pub fn initialize_protocol_access(
        ctx: Context<InitializeProtocolAccess>,
        expected_partner_hash: [u8; 32],
        expected_policy_hash: [u8; 32],
        expected_action_hash: [u8; 32],
        expected_environment: [u8; 32],
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.config.partner_program,
            crate::ID,
            ProtocolAccessError::WrongProgram
        );
        require!(
            expected_partner_hash == ctx.accounts.config.partner_hash,
            ProtocolAccessError::PartnerMismatch
        );
        require!(
            expected_policy_hash == ctx.accounts.config.policy_hash,
            ProtocolAccessError::PolicyMismatch
        );
        require!(
            expected_action_hash == ctx.accounts.config.action_hash,
            ProtocolAccessError::ActionMismatch
        );
        require!(
            expected_environment == ctx.accounts.config.environment,
            ProtocolAccessError::EnvironmentMismatch
        );
        let protocol = &mut ctx.accounts.protocol;
        protocol.gate_config = ctx.accounts.config.key();
        protocol.expected_partner_hash = expected_partner_hash;
        protocol.expected_policy_hash = expected_policy_hash;
        protocol.expected_action_hash = expected_action_hash;
        protocol.expected_environment = expected_environment;
        protocol.bump = ctx.bumps.protocol;
        protocol.config_version = ctx.accounts.config.version;
        Ok(())
    }

    pub fn migrate_legacy_protocol_config(ctx: Context<MigrateLegacyProtocolConfig>) -> Result<()> {
        let protocol_info = ctx.accounts.protocol.to_account_info();
        require!(
            protocol_info.data_len() == LEGACY_PROTOCOL_CONFIG_ACCOUNT_SIZE,
            ProtocolAccessError::InvalidMigrationState
        );
        let legacy = {
            let data = protocol_info.try_borrow_data()?;
            require!(
                data[..8] == ProtocolAccessConfig::DISCRIMINATOR,
                ProtocolAccessError::InvalidMigrationState
            );
            let mut legacy_data: &[u8] = &data[8..];
            LegacyProtocolAccessConfig::deserialize(&mut legacy_data)?
        };
        require_keys_eq!(
            ctx.accounts.config.admin,
            ctx.accounts.admin.key(),
            ProtocolAccessError::Unauthorized
        );
        require_keys_eq!(
            legacy.gate_config,
            ctx.accounts.config.key(),
            ProtocolAccessError::WrongGateConfig
        );

        let required_lamports = Rent::get()?.minimum_balance(8 + ProtocolAccessConfig::INIT_SPACE);
        let shortfall = required_lamports.saturating_sub(protocol_info.lamports());
        if shortfall > 0 {
            anchor_lang::system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: ctx.accounts.admin.to_account_info(),
                        to: protocol_info.clone(),
                    },
                ),
                shortfall,
            )?;
        }
        protocol_info.realloc(8 + ProtocolAccessConfig::INIT_SPACE, true)?;
        let migrated = ProtocolAccessConfig {
            gate_config: legacy.gate_config,
            expected_partner_hash: legacy.expected_partner_hash,
            expected_policy_hash: legacy.expected_policy_hash,
            expected_action_hash: legacy.expected_action_hash,
            expected_environment: legacy.expected_environment,
            bump: legacy.bump,
            config_version: ctx.accounts.config.version,
        };
        let mut data = protocol_info.try_borrow_mut_data()?;
        migrated.try_serialize(&mut &mut data[..])?;
        Ok(())
    }

    pub fn update_protocol_access(ctx: Context<UpdateProtocolAccess>) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.config.admin,
            ctx.accounts.admin.key(),
            ProtocolAccessError::Unauthorized
        );
        let protocol = &mut ctx.accounts.protocol;
        protocol.expected_partner_hash = ctx.accounts.config.partner_hash;
        protocol.expected_policy_hash = ctx.accounts.config.policy_hash;
        protocol.expected_action_hash = ctx.accounts.config.action_hash;
        protocol.expected_environment = ctx.accounts.config.environment;
        protocol.config_version = ctx.accounts.config.version;
        Ok(())
    }

    pub fn activate_protocol_access(
        ctx: Context<ActivateProtocolAccess>,
        subject_hash: [u8; 32],
        organization_commitment: [u8; 32],
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.partner_program.key(),
            crate::ID,
            ProtocolAccessError::WrongProgram
        );
        let protocol = &ctx.accounts.protocol;
        let config = &ctx.accounts.config;
        require_keys_eq!(
            config.key(),
            protocol.gate_config,
            ProtocolAccessError::WrongGateConfig
        );
        require!(
            protocol.config_version == config.version,
            ProtocolAccessError::StaleConfiguration
        );
        require!(
            config.partner_hash == protocol.expected_partner_hash,
            ProtocolAccessError::PartnerMismatch
        );
        require!(
            config.policy_hash == protocol.expected_policy_hash,
            ProtocolAccessError::PolicyMismatch
        );
        require!(
            config.action_hash == protocol.expected_action_hash,
            ProtocolAccessError::ActionMismatch
        );
        require!(
            config.environment == protocol.expected_environment,
            ProtocolAccessError::EnvironmentMismatch
        );
        require!(
            ctx.accounts.authorization.config_version == config.version,
            ProtocolAccessError::StaleConfiguration
        );
        require!(
            ctx.accounts.authorization.policy_hash == config.policy_hash,
            ProtocolAccessError::PolicyMismatch
        );
        require!(
            ctx.accounts.authorization.action_hash == protocol.expected_action_hash,
            ProtocolAccessError::ActionMismatch
        );
        require!(
            ctx.accounts.authorization.organization_commitment == organization_commitment,
            ProtocolAccessError::OrganizationMismatch
        );
        require!(
            ctx.accounts.authorization.subject_hash == subject_hash,
            ProtocolAccessError::SubjectMismatch
        );
        if config.require_subject {
            require!(
                !subject_hash.iter().all(|b| *b == 0),
                ProtocolAccessError::SubjectRequired
            );
        }
        if config.require_institutional {
            require!(
                !ctx.accounts
                    .authorization
                    .actor_commitment
                    .iter()
                    .all(|b| *b == 0)
                    && !ctx
                        .accounts
                        .authorization
                        .institutional_result_category
                        .iter()
                        .all(|b| *b == 0)
                    && !organization_commitment.iter().all(|b| *b == 0),
                ProtocolAccessError::OrganizationMismatch
            );
        }

        let until = ctx.accounts.authorization.expires_at;
        let entitlement = &mut ctx.accounts.entitlement;
        require!(
            entitlement.valid_until <= until,
            ProtocolAccessError::StaleAttestation
        );

        let bump = ctx.bumps.consumer_authority;
        let signer_seeds: &[&[u8]] = &[CONSUMER_AUTH_SEED, &[bump]];
        cpi::consume(CpiContext::new_with_signer(
            ctx.accounts.gate_program.to_account_info(),
            Consume {
                config: ctx.accounts.config.to_account_info(),
                authorization: ctx.accounts.authorization.to_account_info(),
                partner_program: ctx.accounts.partner_program.to_account_info(),
                consumer_authority: ctx.accounts.consumer_authority.to_account_info(),
            },
            &[signer_seeds],
        ))?;

        entitlement.protocol = protocol.key();
        entitlement.gate_config = config.key();
        entitlement.subject_hash = subject_hash;
        entitlement.organization_commitment = organization_commitment;
        entitlement.attestation_ref = ctx.accounts.authorization.attestation_ref;
        entitlement.authorization = ctx.accounts.authorization.key();
        entitlement.config_version = ctx.accounts.authorization.config_version;
        entitlement.valid_until = until;
        entitlement.bump = ctx.bumps.entitlement;
        Ok(())
    }

    pub fn assert_protocol_access(
        ctx: Context<AssertProtocolAccess>,
        subject_hash: [u8; 32],
        organization_commitment: [u8; 32],
    ) -> Result<()> {
        let protocol = &ctx.accounts.protocol;
        let config = &ctx.accounts.config;
        let authorization = &ctx.accounts.authorization;
        require_keys_eq!(
            config.key(),
            protocol.gate_config,
            ProtocolAccessError::WrongGateConfig
        );
        require_keys_eq!(
            authorization.key(),
            ctx.accounts.entitlement.authorization,
            ProtocolAccessError::WrongAuthorization
        );
        require_keys_eq!(
            authorization.config,
            config.key(),
            ProtocolAccessError::WrongGateConfig
        );
        require!(!authorization.revoked, ProtocolAccessError::Revoked);
        require!(
            signer_key_current(config, authorization.signer_key_id),
            ProtocolAccessError::UnknownSigner
        );
        require!(authorization.consumed, ProtocolAccessError::NotConsumed);
        require!(
            authorization.config_version == config.version,
            ProtocolAccessError::StaleConfiguration
        );
        require!(
            ctx.accounts.entitlement.config_version == config.version,
            ProtocolAccessError::StaleConfiguration
        );
        require!(
            protocol.config_version == config.version,
            ProtocolAccessError::StaleConfiguration
        );
        require!(
            authorization.policy_hash == config.policy_hash,
            ProtocolAccessError::PolicyMismatch
        );
        require!(
            authorization.action_hash == config.action_hash,
            ProtocolAccessError::ActionMismatch
        );
        require!(
            config.policy_hash == protocol.expected_policy_hash,
            ProtocolAccessError::PolicyMismatch
        );
        require!(
            config.action_hash == protocol.expected_action_hash,
            ProtocolAccessError::ActionMismatch
        );
        require!(
            config.partner_hash == protocol.expected_partner_hash,
            ProtocolAccessError::PartnerMismatch
        );
        require!(
            config.environment == protocol.expected_environment,
            ProtocolAccessError::EnvironmentMismatch
        );
        require!(
            ctx.accounts.entitlement.subject_hash == subject_hash,
            ProtocolAccessError::SubjectRequired
        );
        require!(
            ctx.accounts.entitlement.organization_commitment == organization_commitment,
            ProtocolAccessError::OrganizationMismatch
        );
        let now = Clock::get()?.unix_timestamp;
        require!(
            ctx.accounts.entitlement.valid_until > now,
            ProtocolAccessError::Expired
        );
        Ok(())
    }
}

fn signer_key_current(config: &GateConfig, key_id: [u8; 32]) -> bool {
    config.signers.iter().any(|slot| {
        (slot.status == SIGNER_ACTIVE || slot.status == SIGNER_RETIRING) && slot.key_id == key_id
    })
}

/// Exact protocol configuration layout deployed before config version binding.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct LegacyProtocolAccessConfig {
    pub gate_config: Pubkey,
    pub expected_partner_hash: [u8; 32],
    pub expected_policy_hash: [u8; 32],
    pub expected_action_hash: [u8; 32],
    pub expected_environment: [u8; 32],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ProtocolAccessConfig {
    pub gate_config: Pubkey,
    pub expected_partner_hash: [u8; 32],
    pub expected_policy_hash: [u8; 32],
    pub expected_action_hash: [u8; 32],
    pub expected_environment: [u8; 32],
    pub bump: u8,
    pub config_version: u64,
}

#[account]
#[derive(InitSpace)]
pub struct ProtocolEntitlement {
    pub protocol: Pubkey,
    pub gate_config: Pubkey,
    pub subject_hash: [u8; 32],
    pub organization_commitment: [u8; 32],
    pub attestation_ref: [u8; 32],
    pub authorization: Pubkey,
    pub config_version: u64,
    pub valid_until: i64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeProtocolAccess<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub config: Account<'info, GateConfig>,
    #[account(
        init,
        payer = payer,
        space = 8 + ProtocolAccessConfig::INIT_SPACE,
        seeds = [PROTOCOL_CONFIG_SEED, config.key().as_ref()],
        bump
    )]
    pub protocol: Account<'info, ProtocolAccessConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MigrateLegacyProtocolConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub config: Account<'info, GateConfig>,
    /// CHECK: the legacy layout cannot be deserialized as ProtocolAccessConfig before realloc.
    #[account(
        mut,
        owner = crate::ID,
        seeds = [PROTOCOL_CONFIG_SEED, config.key().as_ref()],
        bump
    )]
    pub protocol: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProtocolAccess<'info> {
    pub admin: Signer<'info>,
    pub config: Account<'info, GateConfig>,
    #[account(
        mut,
        seeds = [PROTOCOL_CONFIG_SEED, config.key().as_ref()],
        bump = protocol.bump,
        constraint = protocol.gate_config == config.key() @ ProtocolAccessError::WrongGateConfig
    )]
    pub protocol: Account<'info, ProtocolAccessConfig>,
}

#[derive(Accounts)]
#[instruction(subject_hash: [u8; 32], organization_commitment: [u8; 32])]
pub struct ActivateProtocolAccess<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub gate_program: Program<'info, AbraxasEligibilityGate>,
    pub config: Box<Account<'info, GateConfig>>,
    #[account(mut)]
    pub authorization: Box<Account<'info, Authorization>>,
    /// CHECK: this program id; must match gate config partner_program.
    pub partner_program: UncheckedAccount<'info>,
    /// CHECK: PDA signer of this program.
    #[account(seeds = [CONSUMER_AUTH_SEED], bump)]
    pub consumer_authority: UncheckedAccount<'info>,
    #[account(
        seeds = [PROTOCOL_CONFIG_SEED, config.key().as_ref()],
        bump = protocol.bump
    )]
    pub protocol: Box<Account<'info, ProtocolAccessConfig>>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + ProtocolEntitlement::INIT_SPACE,
        seeds = [ENTITLEMENT_SEED, protocol.key().as_ref(), subject_hash.as_ref(), organization_commitment.as_ref()],
        bump
    )]
    pub entitlement: Box<Account<'info, ProtocolEntitlement>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(subject_hash: [u8; 32], organization_commitment: [u8; 32])]
pub struct AssertProtocolAccess<'info> {
    pub config: Box<Account<'info, GateConfig>>,
    pub authorization: Box<Account<'info, Authorization>>,
    pub protocol: Box<Account<'info, ProtocolAccessConfig>>,
    #[account(
        seeds = [ENTITLEMENT_SEED, protocol.key().as_ref(), subject_hash.as_ref(), organization_commitment.as_ref()],
        bump = entitlement.bump
    )]
    pub entitlement: Box<Account<'info, ProtocolEntitlement>>,
}

#[error_code]
pub enum ProtocolAccessError {
    #[msg("wrong_program")]
    WrongProgram,
    #[msg("wrong_gate_config")]
    WrongGateConfig,
    #[msg("partner_mismatch")]
    PartnerMismatch,
    #[msg("policy_mismatch")]
    PolicyMismatch,
    #[msg("action_mismatch")]
    ActionMismatch,
    #[msg("environment_mismatch")]
    EnvironmentMismatch,
    #[msg("subject_required")]
    SubjectRequired,
    #[msg("organization_mismatch")]
    OrganizationMismatch,
    #[msg("expired")]
    Expired,
    #[msg("stale_attestation")]
    StaleAttestation,
    #[msg("subject_mismatch")]
    SubjectMismatch,
    #[msg("revoked")]
    Revoked,
    #[msg("not_consumed")]
    NotConsumed,
    #[msg("stale_configuration")]
    StaleConfiguration,
    #[msg("wrong_authorization")]
    WrongAuthorization,
    #[msg("unknown_signer")]
    UnknownSigner,
    #[msg("unauthorized")]
    Unauthorized,
    #[msg("invalid_migration_state")]
    InvalidMigrationState,
}

