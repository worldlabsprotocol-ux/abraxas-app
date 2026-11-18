use anchor_lang::prelude::*;

use crate::{
    EntitlementIssuanceLedger, EntitlementMintConfig, ProofContinuityError, ProofContinuityRegistry,
    ReceiptCommitment, STATUS_ACTIVE, ENTITLEMENT_TOKEN_AMOUNT,
};

/// Sovereign verification boundary: token possession plus current receipt state.
pub struct ReceiptBackedEntitlement<'a> {
    pub registry_key: Pubkey,
    pub registry: &'a ProofContinuityRegistry,
    pub commitment: &'a ReceiptCommitment,
    pub issuance_ledger: &'a EntitlementIssuanceLedger,
    pub mint_config: &'a EntitlementMintConfig,
    pub holder: Pubkey,
    pub mint: Pubkey,
    pub token_owner: Pubkey,
    pub token_amount: u64,
    pub now: i64,
}

pub fn verify_receipt_backed_entitlement(input: ReceiptBackedEntitlement<'_>) -> Result<()> {
    require_keys_eq!(
        input.commitment.registry,
        input.registry_key,
        ProofContinuityError::WrongRegistry
    );
    require_keys_eq!(
        input.issuance_ledger.registry,
        input.registry_key,
        ProofContinuityError::WrongRegistry
    );
    require_keys_eq!(
        input.mint_config.registry,
        input.registry_key,
        ProofContinuityError::WrongRegistry
    );
  require!(
        input.commitment.receipt_id_hash == input.issuance_ledger.receipt_id_hash,
        ProofContinuityError::ReceiptMismatch
    );
    require!(
        input.commitment.partner_hash == input.registry.partner_hash,
        ProofContinuityError::PartnerMismatch
    );
    require!(
        input.commitment.policy_hash == input.registry.policy_hash,
        ProofContinuityError::PolicyMismatch
    );
    require!(
        input.commitment.application_hash == input.registry.application_hash,
        ProofContinuityError::ApplicationMismatch
    );
    require_eq!(
        input.commitment.status,
        STATUS_ACTIVE,
        ProofContinuityError::NotAcceptable
    );
    require!(
        input.commitment.expires_at > input.now,
        ProofContinuityError::Expired
    );
    require_keys_eq!(
        input.commitment.authorized_holder,
        input.holder,
        ProofContinuityError::UnauthorizedWallet
    );
    require_keys_eq!(
        input.issuance_ledger.recipient,
        input.holder,
        ProofContinuityError::UnauthorizedWallet
    );
    require_keys_eq!(input.token_owner, input.holder, ProofContinuityError::UnauthorizedWallet);
    require_keys_eq!(
        input.mint_config.mint,
        input.mint,
        ProofContinuityError::WrongMint
    );
    require!(
        input.token_amount >= ENTITLEMENT_TOKEN_AMOUNT,
        ProofContinuityError::InsufficientEntitlement
    );
    require_eq!(
        input.mint_config.non_transferable,
        1,
        ProofContinuityError::NonTransferableRequired
    );
    Ok(())
}