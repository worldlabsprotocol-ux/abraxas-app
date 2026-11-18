// BUILD #979 — Relying party: consume receipt-backed non-transferable entitlements.
// Local/reference only. Reads proof-continuity state; never mints or transfers tokens.

use abraxas_proof_continuity::{
    verify_receipt_backed_entitlement, EntitlementIssuanceLedger, EntitlementMintConfig,
    ProofContinuityRegistry, ReceiptBackedEntitlement, ReceiptCommitment,
    COMMITMENT_SEED, ENTITLEMENT_ISSUANCE_SEED, ENTITLEMENT_MINT_CONFIG_SEED, ID as PROOF_CONTINUITY_ID,
    REGISTRY_SEED,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, TokenAccount, TokenInterface};

declare_id!("CQykNfMtvoV4NV6fR3cJDB5dp5ZS7oeKh8whVwpZZc8T");

pub const ENTITLEMENT_CONSUMPTION_SEED: &[u8] = b"entitlement_consumption";

#[program]
pub mod abraxas_proof_entitlement_consumer {
    use super::*;

    pub fn consume_verified_entitlement(
        ctx: Context<ConsumeVerifiedEntitlement>,
        receipt_id_hash: [u8; 32],
        partner_hash: [u8; 32],
        policy_hash: [u8; 32],
        application_hash: [u8; 32],
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.proof_continuity_program.key(),
            PROOF_CONTINUITY_ID,
            ConsumerError::UntrustedProofProgram
        );
        require!(
            ctx.accounts.commitment.receipt_id_hash == receipt_id_hash,
            ConsumerError::ReceiptMismatch
        );
        require!(
            ctx.accounts.registry.partner_hash == partner_hash,
            ConsumerError::PartnerMismatch
        );
        require!(
            ctx.accounts.registry.policy_hash == policy_hash,
            ConsumerError::PolicyMismatch
        );
        require!(
            ctx.accounts.registry.application_hash == application_hash,
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
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct EntitlementConsumption {
    pub registry: Pubkey,
    pub receipt_id_hash: [u8; 32],
    pub holder: Pubkey,
    pub consumed: bool,
    pub consumed_at: i64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(
    receipt_id_hash: [u8; 32],
    partner_hash: [u8; 32],
    policy_hash: [u8; 32],
    application_hash: [u8; 32]
)]
pub struct ConsumeVerifiedEntitlement<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub holder: Signer<'info>,
    /// CHECK: trusted proof-continuity program id boundary.
    pub proof_continuity_program: UncheckedAccount<'info>,
    /// CHECK: proof registry admin used for registry PDA seeds.
    pub registry_admin: UncheckedAccount<'info>,
    #[account(
        constraint = *registry.to_account_info().owner == PROOF_CONTINUITY_ID @ ConsumerError::UntrustedProofProgram,
        constraint = registry.admin == registry_admin.key() @ ConsumerError::WrongRegistry,
        constraint = registry.partner_hash == partner_hash @ ConsumerError::PartnerMismatch,
        constraint = registry.policy_hash == policy_hash @ ConsumerError::PolicyMismatch,
        constraint = registry.application_hash == application_hash @ ConsumerError::ApplicationMismatch,
    )]
    pub registry: Box<Account<'info, ProofContinuityRegistry>>,
    #[account(
        constraint = *commitment.to_account_info().owner == PROOF_CONTINUITY_ID @ ConsumerError::UntrustedProofProgram,
        constraint = commitment.registry == registry.key() @ ConsumerError::WrongRegistry,
    )]
    pub commitment: Box<Account<'info, ReceiptCommitment>>,
    #[account(
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
}