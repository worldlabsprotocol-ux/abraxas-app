//! Public verifier helpers. No keys, receipts, or RPC.

pub use crate::canonical::{
    parse_canonical_message_for_config, AUTH_SEED, CANONICAL_MESSAGE_LEN, CONFIG_SEED,
    LEGACY_V1_MESSAGE_LEN, PREFIX, PREFIX_V1, SCHEMA_VERSION,
};
pub use crate::institutional_v2::{deployed_institutional_capable, V2_MESSAGE_LEN, V2_PREFIX};

use crate::{Authorization, GateConfig};
use anchor_lang::prelude::Pubkey;
use anchor_lang::solana_program::keccak;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PortableAuthorizationReceipt {
    pub network_id: [u8; 32],
    pub program_id: Pubkey,
    pub config: Pubkey,
    pub authorization: Pubkey,
    pub action_hash: [u8; 32],
    pub config_version: u64,
    pub transaction_signature: [u8; 64],
    pub finalized_slot: u64,
    pub state_commitment: [u8; 32],
}

/// Values independently fetched from a Solana RPC at verification time.
#[derive(Clone, Copy, Debug)]
pub struct CurrentSolanaObservation<'a> {
    pub network_id: [u8; 32],
    pub program_id: Pubkey,
    pub config_address: Pubkey,
    pub authorization_address: Pubkey,
    pub config: &'a GateConfig,
    pub authorization: &'a Authorization,
    pub transaction_signature: [u8; 64],
    pub transaction_slot: u64,
    pub transaction_finalized: bool,
    pub unix_timestamp: i64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PortableVerificationError {
    WrongNetwork,
    WrongProgram,
    WrongAccount,
    TransactionNotFinalized,
    WrongTransaction,
    StaleConfiguration,
    WrongAction,
    Revoked,
    NotConsumed,
    Expired,
    StateCommitmentMismatch,
}

pub fn authorization_state_commitment(
    config_address: Pubkey,
    authorization_address: Pubkey,
    config: &GateConfig,
    authorization: &Authorization,
) -> [u8; 32] {
    let mut bytes = Vec::with_capacity(32 * 8 + 32);
    bytes.extend_from_slice(config_address.as_ref());
    bytes.extend_from_slice(authorization_address.as_ref());
    bytes.extend_from_slice(&config.network_id);
    bytes.extend_from_slice(&config.policy_hash);
    bytes.extend_from_slice(&config.action_hash);
    bytes.extend_from_slice(&config.version.to_be_bytes());
    bytes.extend_from_slice(&authorization.attestation_ref);
    bytes.extend_from_slice(&authorization.subject_hash);
    bytes.extend_from_slice(&authorization.config_version.to_be_bytes());
    bytes.extend_from_slice(&authorization.expires_at.to_be_bytes());
    bytes.push(u8::from(authorization.consumed));
    bytes.push(u8::from(authorization.revoked));
    keccak::hash(&bytes).to_bytes()
}

/// Verifies receipt binding and *current* authoritative account state. Callers must obtain the
/// observation from their own RPC and request finalized transaction commitment.
pub fn verify_portable_authorization_receipt(
    receipt: &PortableAuthorizationReceipt,
    observed: &CurrentSolanaObservation<'_>,
) -> Result<(), PortableVerificationError> {
    if receipt.network_id != observed.network_id || receipt.network_id != observed.config.network_id
    {
        return Err(PortableVerificationError::WrongNetwork);
    }
    if receipt.program_id != observed.program_id {
        return Err(PortableVerificationError::WrongProgram);
    }
    if receipt.config != observed.config_address
        || receipt.authorization != observed.authorization_address
        || observed.authorization.config != observed.config_address
    {
        return Err(PortableVerificationError::WrongAccount);
    }
    if !observed.transaction_finalized {
        return Err(PortableVerificationError::TransactionNotFinalized);
    }
    if receipt.transaction_signature != observed.transaction_signature
        || receipt.finalized_slot != observed.transaction_slot
    {
        return Err(PortableVerificationError::WrongTransaction);
    }
    if receipt.config_version != observed.config.version
        || observed.authorization.config_version != observed.config.version
    {
        return Err(PortableVerificationError::StaleConfiguration);
    }
    if receipt.action_hash != observed.config.action_hash
        || observed.authorization.action_hash != observed.config.action_hash
    {
        return Err(PortableVerificationError::WrongAction);
    }
    if observed.authorization.revoked {
        return Err(PortableVerificationError::Revoked);
    }
    if !observed.authorization.consumed {
        return Err(PortableVerificationError::NotConsumed);
    }
    if observed.authorization.expires_at <= observed.unix_timestamp {
        return Err(PortableVerificationError::Expired);
    }
    let commitment = authorization_state_commitment(
        observed.config_address,
        observed.authorization_address,
        observed.config,
        observed.authorization,
    );
    if receipt.state_commitment != commitment {
        return Err(PortableVerificationError::StateCommitmentMismatch);
    }
    Ok(())
}

#[cfg(test)]
mod portable_tests {
    use super::*;
    use crate::{SignerSlot, MAX_SIGNERS};

    fn fixture() -> (GateConfig, Authorization, Pubkey, Pubkey) {
        let config_address = Pubkey::new_unique();
        let authorization_address = Pubkey::new_unique();
        let config = GateConfig {
            admin: Pubkey::new_unique(),
            partner_program: Pubkey::new_unique(),
            network_id: [1; 32],
            partner_hash: [2; 32],
            policy_hash: [3; 32],
            action_hash: [4; 32],
            environment: [5; 32],
            require_subject: true,
            require_institutional: false,
            expected_organization_commitment: [0; 32],
            expected_actor_commitment: [0; 32],
            expected_institutional_result_category: [0; 32],
            bump: 1,
            signers: [SignerSlot::default(); MAX_SIGNERS],
            version: 7,
        };
        let authorization = Authorization {
            config: config_address,
            partner_program: config.partner_program,
            config_version: 7,
            signer_key_id: [6; 32],
            policy_hash: config.policy_hash,
            action_hash: config.action_hash,
            attestation_ref: [7; 32],
            subject_hash: [8; 32],
            organization_commitment: [0; 32],
            actor_commitment: [0; 32],
            institutional_result_category: [0; 32],
            expires_at: 2_000_000_000,
            consumed: true,
            revoked: false,
            bump: 1,
        };
        (config, authorization, config_address, authorization_address)
    }

    #[test]
    fn valid_current_finalized_receipt_passes_and_tampering_fails() {
        let (config, authorization, config_address, authorization_address) = fixture();
        let program_id = crate::ID;
        let signature = [9; 64];
        let mut receipt = PortableAuthorizationReceipt {
            network_id: config.network_id,
            program_id,
            config: config_address,
            authorization: authorization_address,
            action_hash: config.action_hash,
            config_version: config.version,
            transaction_signature: signature,
            finalized_slot: 42,
            state_commitment: authorization_state_commitment(
                config_address,
                authorization_address,
                &config,
                &authorization,
            ),
        };
        let observed = CurrentSolanaObservation {
            network_id: config.network_id,
            program_id,
            config_address,
            authorization_address,
            config: &config,
            authorization: &authorization,
            transaction_signature: signature,
            transaction_slot: 42,
            transaction_finalized: true,
            unix_timestamp: 1_900_000_000,
        };
        assert_eq!(
            verify_portable_authorization_receipt(&receipt, &observed),
            Ok(())
        );
        receipt.state_commitment[0] ^= 1;
        assert_eq!(
            verify_portable_authorization_receipt(&receipt, &observed),
            Err(PortableVerificationError::StateCommitmentMismatch)
        );
    }

    #[test]
    fn stale_or_revoked_state_fails_even_with_an_unchanged_receipt() {
        let (mut config, mut authorization, config_address, authorization_address) = fixture();
        let receipt = PortableAuthorizationReceipt {
            network_id: config.network_id,
            program_id: crate::ID,
            config: config_address,
            authorization: authorization_address,
            action_hash: config.action_hash,
            config_version: config.version,
            transaction_signature: [9; 64],
            finalized_slot: 42,
            state_commitment: authorization_state_commitment(
                config_address,
                authorization_address,
                &config,
                &authorization,
            ),
        };
        config.version += 1;
        let observed = CurrentSolanaObservation {
            network_id: config.network_id,
            program_id: crate::ID,
            config_address,
            authorization_address,
            config: &config,
            authorization: &authorization,
            transaction_signature: [9; 64],
            transaction_slot: 42,
            transaction_finalized: true,
            unix_timestamp: 1_900_000_000,
        };
        assert_eq!(
            verify_portable_authorization_receipt(&receipt, &observed),
            Err(PortableVerificationError::StaleConfiguration)
        );
        config.version -= 1;
        authorization.revoked = true;
        let revoked = CurrentSolanaObservation {
            network_id: config.network_id,
            program_id: crate::ID,
            config_address,
            authorization_address,
            config: &config,
            authorization: &authorization,
            transaction_signature: [9; 64],
            transaction_slot: 42,
            transaction_finalized: true,
            unix_timestamp: 1_900_000_000,
        };
        assert_eq!(
            verify_portable_authorization_receipt(&receipt, &revoked),
            Err(PortableVerificationError::Revoked)
        );
    }
}

