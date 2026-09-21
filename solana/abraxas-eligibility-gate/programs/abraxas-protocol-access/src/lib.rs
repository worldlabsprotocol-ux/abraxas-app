// Partner-owned reference consumer for activate_protocol_access.
// Local/sandbox ProgramTest only. Never transfers SOL/tokens, mints, swaps,
// calls token programs, or performs arbitrary CPI.
// Entitlement is expiry-bound from the verified Authorization expires_at.

use abraxas_eligibility_gate::canonical::CONSUMER_AUTH_SEED;
use abraxas_eligibility_gate::cpi;
use abraxas_eligibility_gate::cpi::accounts::Consume;
use abraxas_eligibility_gate::program::AbraxasEligibilityGate;
use abraxas_eligibility_gate::{Authorization, GateConfig};
use anchor_lang::prelude::*;

declare_id!("GD237h8oAdsR89Ga8W6P8PtNcu13hvbvFsLgWtZyHrqB");

pub const PROTOCOL_CONFIG_SEED: &[u8] = b"protocol_access_config";
pub const ENTITLEMENT_SEED: &[u8] = b"protocol_access";

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
        let protocol = &mut ctx.accounts.protocol;
        protocol.gate_config = ctx.accounts.config.key();
        protocol.expected_partner_hash = expected_partner_hash;
        protocol.expected_policy_hash = expected_policy_hash;
        protocol.expected_action_hash = expected_action_hash;
        protocol.expected_environment = expected_environment;
        protocol.bump = ctx.bumps.protocol;
        Ok(())
    }

    pub fn activate_protocol_access(
        ctx: Context<ActivateProtocolAccess>,
        subject_hash: [u8; 32],
        organization_commitment: [u8; 32],
    ) -> Result<()> {
        require_keys_eq!(ctx.accounts.partner_program.key(), crate::ID, ProtocolAccessError::WrongProgram);
        let protocol = &ctx.accounts.protocol;
        let config = &ctx.accounts.config;
        require_keys_eq!(config.key(), protocol.gate_config, ProtocolAccessError::WrongGateConfig);
        require!(config.partner_hash == protocol.expected_partner_hash, ProtocolAccessError::PartnerMismatch);
        require!(config.policy_hash == protocol.expected_policy_hash, ProtocolAccessError::PolicyMismatch);
        require!(config.action_hash == protocol.expected_action_hash, ProtocolAccessError::ActionMismatch);
        require!(config.environment == protocol.expected_environment, ProtocolAccessError::EnvironmentMismatch);
        require!(
            ctx.accounts.authorization.action_hash == protocol.expected_action_hash,
            ProtocolAccessError::ActionMismatch
        );
        require!(
            ctx.accounts.authorization.organization_commitment == organization_commitment,
            ProtocolAccessError::OrganizationMismatch
        );
        if config.require_subject {
            require!(!subject_hash.iter().all(|b| *b == 0), ProtocolAccessError::SubjectRequired);
        }

        let until = ctx.accounts.authorization.expires_at;
        let entitlement = &mut ctx.accounts.entitlement;
        require!(entitlement.valid_until <= until, ProtocolAccessError::StaleAttestation);

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
        entitlement.valid_until = until;
        entitlement.bump = ctx.bumps.entitlement;
        Ok(())
    }

    pub fn assert_protocol_access(
        ctx: Context<AssertProtocolAccess>,
        subject_hash: [u8; 32],
        organization_commitment: [u8; 32],
    ) -> Result<()> {
        require!(ctx.accounts.entitlement.subject_hash == subject_hash, ProtocolAccessError::SubjectRequired);
        require!(
            ctx.accounts.entitlement.organization_commitment == organization_commitment,
            ProtocolAccessError::OrganizationMismatch
        );
        let now = Clock::get()?.unix_timestamp;
        require!(ctx.accounts.entitlement.valid_until > now, ProtocolAccessError::Expired);
        Ok(())
    }
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
}

#[account]
#[derive(InitSpace)]
pub struct ProtocolEntitlement {
    pub protocol: Pubkey,
    pub gate_config: Pubkey,
    pub subject_hash: [u8; 32],
    pub organization_commitment: [u8; 32],
    pub attestation_ref: [u8; 32],
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
#[instruction(subject_hash: [u8; 32], organization_commitment: [u8; 32])]
pub struct ActivateProtocolAccess<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub gate_program: Program<'info, AbraxasEligibilityGate>,
    pub config: Account<'info, GateConfig>,
    #[account(mut)]
    pub authorization: Account<'info, Authorization>,
    /// CHECK: this program id; must match gate config partner_program.
    pub partner_program: UncheckedAccount<'info>,
    /// CHECK: PDA signer of this program.
    #[account(seeds = [CONSUMER_AUTH_SEED], bump)]
    pub consumer_authority: UncheckedAccount<'info>,
    #[account(
        seeds = [PROTOCOL_CONFIG_SEED, config.key().as_ref()],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, ProtocolAccessConfig>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + ProtocolEntitlement::INIT_SPACE,
        seeds = [ENTITLEMENT_SEED, protocol.key().as_ref(), subject_hash.as_ref(), organization_commitment.as_ref()],
        bump
    )]
    pub entitlement: Account<'info, ProtocolEntitlement>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(subject_hash: [u8; 32], organization_commitment: [u8; 32])]
pub struct AssertProtocolAccess<'info> {
    pub protocol: Account<'info, ProtocolAccessConfig>,
    #[account(
        seeds = [ENTITLEMENT_SEED, protocol.key().as_ref(), subject_hash.as_ref(), organization_commitment.as_ref()],
        bump = entitlement.bump
    )]
    pub entitlement: Account<'info, ProtocolEntitlement>,
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
}
