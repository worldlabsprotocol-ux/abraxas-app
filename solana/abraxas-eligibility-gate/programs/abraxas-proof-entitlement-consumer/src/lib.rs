// BUILD #979 / #980 — Relying party: receipt-backed non-transferable entitlements.
// Local/reference only. Never mints or transfers tokens.

use abraxas_proof_continuity::{
    verify_receipt_backed_entitlement, EntitlementIssuanceLedger, EntitlementMintConfig,
    ProofContinuityRegistry, ReceiptBackedEntitlement, ReceiptCommitment,
    COMMITMENT_SEED, ENTITLEMENT_ISSUANCE_SEED, ENTITLEMENT_MINT_CONFIG_SEED, ID as PROOF_CONTINUITY_ID,
    REGISTRY_SEED,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, TokenAccount, TokenInterface};

declare_id!("CQykNfMtvoV4NV6fR3cJDB5dp5ZS7oeKh8whVwpZZc8T");

pub const RELYING_PARTY_CONFIG_SEED: &[u8] = b"relying_party_config";
pub const ENTITLEMENT_CONSUMPTION_SEED: &[u8] = b"entitlement_consumption";

#[program]
pub mod abraxas_proof_entitlement_consumer {
    use super::*;

    pub fn initialize_trusted_config(
        ctx: Context<InitializeTrustedConfig>,
        proof_registry_admin: Pubkey,
        partner_hash: [u8; 32],
        policy_hash: [u8; 32],
        application_hash: [u8; 32],
    ) -> Result<()> {
        let config = &mut ctx.accounts.trusted_config;
        config.admin = ctx.accounts.admin.key();
        config.proof_registry_admin = proof_registry_admin;
        config.partner_hash = partner_hash;
        config.policy_hash = policy_hash;
        config.application_hash = application_hash;
        config.config_version = 1;
        config.bump = ctx.bumps.trusted_config;
        Ok(())
    }

    pub fn update_trusted_config(
        ctx: Context<UpdateTrustedConfig>,
        next_config_version: u64,
        partner_hash: [u8; 32],
        policy_hash: [u8; 32],
        application_hash: [u8; 32],
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.admin.key(),
            ctx.accounts.trusted_config.admin,
            ConsumerError::UnauthorizedAdmin
        );
        require!(
            next_config_version > ctx.accounts.trusted_config.config_version,
            ConsumerError::StaleConfigVersion
        );
        let config = &mut ctx.accounts.trusted_config;
        config.partner_hash = partner_hash;
        config.policy_hash = policy_hash;
        config.application_hash = application_hash;
        config.config_version = next_config_version;
        Ok(())
    }

    pub fn consume_verified_entitlement(
        ctx: Context<ConsumeVerifiedEntitlement>,
        receipt_id_hash: [u8; 32],
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.proof_continuity_program.key(),
            PROOF_CONTINUITY_ID,
            ConsumerError::UntrustedProofProgram
        );
        let trusted = &ctx.accounts.trusted_config;
        require!(
            ctx.accounts.commitment.receipt_id_hash == receipt_id_hash,
            ConsumerError::ReceiptMismatch
        );
        require_keys_eq!(
            ctx.accounts.registry_admin.key(),
            trusted.proof_registry_admin,
            ConsumerError::UntrustedRegistryAdmin
        );
        require!(
            ctx.accounts.registry.partner_hash == trusted.partner_hash,
            ConsumerError::PartnerMismatch
        );
        require!(
            ctx.accounts.registry.policy_hash == trusted.policy_hash,
            ConsumerError::PolicyMismatch
        );
        require!(
            ctx.accounts.registry.application_hash == trusted.application_hash,
            ConsumerError::ApplicationMismatch
        );

        let now = Clock::get()?.unix_timestamp;
        verify_receipt_backed_entitlement(ReceiptBackedEntitlement {
            registry_key: ctx.accounts.registry.key(),
            registry: &ctx.accounts.registry,
            commitment: &ctx.accounts.commitment,
            issuance_ledger: &ctx.accounts.issuance_ledger,
            mint_config: &ctx.accounts.entitlement_mint_config,
            holder: ctx.accounts.holder.key(),
            mint: ctx.accounts.mint.key(),
            token_owner: ctx.accounts.recipient_token_account.owner,
            token_amount: ctx.accounts.recipient_token_account.amount,
            now,
        })
        .map_err(|_| error!(ConsumerError::ProofNotAcceptable))?;

        let consumption = &mut ctx.accounts.consumption;
        require!(!consumption.consumed, ConsumerError::AlreadyConsumed);
        consumption.registry = ctx.accounts.registry.key();
        consumption.receipt_id_hash = receipt_id_hash;
        consumption.holder = ctx.accounts.holder.key();
        consumption.consumed = true;
        consumption.consumed_at = now;
        consumption.bump = ctx.bumps.consumption;
        consumption.config_version = trusted.config_version;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct TrustedRelyingPartyConfig {
    pub admin: Pubkey,
    pub proof_registry_admin: Pubkey,
    pub partner_hash: [u8; 32],
    pub policy_hash: [u8; 32],
    pub application_hash: [u8; 32],
    pub config_version: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EntitlementConsumption {
    pub registry: Pubkey,
    pub receipt_id_hash: [u8; 32],
    pub holder: Pubkey,
    pub consumed: bool,
    pub consumed_at: i64,
    pub config_version: u64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(proof_registry_admin: Pubkey)]
pub struct InitializeTrustedConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + TrustedRelyingPartyConfig::INIT_SPACE,
        seeds = [RELYING_PARTY_CONFIG_SEED, admin.key().as_ref()],
        bump
    )]
    pub trusted_config: Account<'info, TrustedRelyingPartyConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTrustedConfig<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [RELYING_PARTY_CONFIG_SEED, admin.key().as_ref()],
        bump = trusted_config.bump,
        constraint = trusted_config.admin == admin.key() @ ConsumerError::UnauthorizedAdmin,
    )]
    pub trusted_config: Account<'info, TrustedRelyingPartyConfig>,
}

#[derive(Accounts)]
#[instruction(receipt_id_hash: [u8; 32])]
pub struct ConsumeVerifiedEntitlement<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub holder: Signer<'info>,
    /// CHECK: trusted proof-continuity program id boundary.
    #[account(address = PROOF_CONTINUITY_ID)]
    pub proof_continuity_program: UncheckedAccount<'info>,
    #[account(
        seeds = [RELYING_PARTY_CONFIG_SEED, trusted_config.admin.as_ref()],
        bump = trusted_config.bump,
    )]
    pub trusted_config: Box<Account<'info, TrustedRelyingPartyConfig>>,
    /// CHECK: must match trusted_config.proof_registry_admin for registry PDA seeds.
    pub registry_admin: UncheckedAccount<'info>,
    #[account(
        seeds = [REGISTRY_SEED, registry_admin.key().as_ref()],
        bump,
        seeds::program = PROOF_CONTINUITY_ID,
        constraint = *registry.to_account_info().owner == PROOF_CONTINUITY_ID @ ConsumerError::UntrustedProofProgram,
        constraint = registry.admin == registry_admin.key() @ ConsumerError::WrongRegistry,
        constraint = registry.partner_hash == trusted_config.partner_hash @ ConsumerError::PartnerMismatch,
        constraint = registry.policy_hash == trusted_config.policy_hash @ ConsumerError::PolicyMismatch,
        constraint = registry.application_hash == trusted_config.application_hash @ ConsumerError::ApplicationMismatch,
    )]
    pub registry: Box<Account<'info, ProofContinuityRegistry>>,
    #[account(
        seeds = [
            COMMITMENT_SEED,
            registry.key().as_ref(),
            receipt_id_hash.as_ref()
        ],
        bump,
        seeds::program = PROOF_CONTINUITY_ID,
        constraint = *commitment.to_account_info().owner == PROOF_CONTINUITY_ID @ ConsumerError::UntrustedProofProgram,
        constraint = commitment.registry == registry.key() @ ConsumerError::WrongRegistry,
    )]
    pub commitment: Box<Account<'info, ReceiptCommitment>>,
    #[account(
        seeds = [ENTITLEMENT_MINT_CONFIG_SEED, registry.key().as_ref()],
        bump,
        seeds::program = PROOF_CONTINUITY_ID,
        constraint = *entitlement_mint_config.to_account_info().owner == PROOF_CONTINUITY_ID @ ConsumerError::UntrustedProofProgram,
        constraint = entitlement_mint_config.registry == registry.key() @ ConsumerError::WrongRegistry,
    )]
    pub entitlement_mint_config: Box<Account<'info, EntitlementMintConfig>>,
    #[account(
        constraint = mint.key() == entitlement_mint_config.mint @ ConsumerError::WrongMint
    )]
    pub mint: Box<InterfaceAccount<'info, token_interface::Mint>>,
    #[account(
        constraint = recipient_token_account.mint == mint.key() @ ConsumerError::WrongMint,
        constraint = recipient_token_account.owner == holder.key() @ ConsumerError::WrongHolder,
    )]
    pub recipient_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        seeds = [
            ENTITLEMENT_ISSUANCE_SEED,
            registry.key().as_ref(),
            receipt_id_hash.as_ref()
        ],
        bump,
        seeds::program = PROOF_CONTINUITY_ID,
        constraint = *issuance_ledger.to_account_info().owner == PROOF_CONTINUITY_ID @ ConsumerError::UntrustedProofProgram,
        constraint = issuance_ledger.registry == registry.key() @ ConsumerError::WrongRegistry,
        constraint = issuance_ledger.recipient == holder.key() @ ConsumerError::WrongHolder,
        constraint = issuance_ledger.receipt_id_hash == receipt_id_hash @ ConsumerError::ReceiptMismatch,
    )]
    pub issuance_ledger: Box<Account<'info, EntitlementIssuanceLedger>>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + EntitlementConsumption::INIT_SPACE,
        seeds = [
            ENTITLEMENT_CONSUMPTION_SEED,
            registry.key().as_ref(),
            receipt_id_hash.as_ref()
        ],
        bump
    )]
    pub consumption: Box<Account<'info, EntitlementConsumption>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ConsumerError {
    #[msg("untrusted_proof_program")]
    UntrustedProofProgram,
    #[msg("receipt_mismatch")]
    ReceiptMismatch,
    #[msg("partner_mismatch")]
    PartnerMismatch,
    #[msg("policy_mismatch")]
    PolicyMismatch,
    #[msg("application_mismatch")]
    ApplicationMismatch,
    #[msg("wrong_registry")]
    WrongRegistry,
    #[msg("wrong_mint")]
    WrongMint,
    #[msg("wrong_holder")]
    WrongHolder,
    #[msg("already_consumed")]
    AlreadyConsumed,
    #[msg("proof_not_acceptable")]
    ProofNotAcceptable,
    #[msg("unauthorized_admin")]
    UnauthorizedAdmin,
    #[msg("stale_config_version")]
    StaleConfigVersion,
    #[msg("untrusted_registry_admin")]
    UntrustedRegistryAdmin,
}