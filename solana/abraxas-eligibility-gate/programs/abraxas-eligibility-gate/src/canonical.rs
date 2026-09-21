//! Canonical ABRAXAS_CHAIN_ELIGIBILITY_V2 message. Byte-for-byte encoding only.

use anchor_lang::solana_program::keccak;

pub const PREFIX: &[u8] = b"ABRAXAS_CHAIN_ELIGIBILITY_V2";
pub const PREFIX_LEN: usize = 28;
pub const HASH_LEN: usize = 32;
pub const U64_LEN: usize = 8;
pub const LEGACY_V1_MESSAGE_LEN: usize = 372;
pub const CANONICAL_MESSAGE_LEN: usize = 468;

pub const OFF_PREFIX: usize = 0;
pub const OFF_PREFIX_HASH: usize = 28;
pub const OFF_SCHEMA: usize = 60;
pub const OFF_NETWORK: usize = 68;
pub const OFF_PARTNER: usize = 100;
pub const OFF_POLICY: usize = 132;
pub const OFF_ACTION: usize = 164;
pub const OFF_SUBJECT: usize = 196;
pub const OFF_ISSUED: usize = 228;
pub const OFF_EXPIRES: usize = 236;
pub const OFF_NONCE: usize = 244;
pub const OFF_ATTESTATION_ID: usize = 276;
pub const OFF_ENVIRONMENT: usize = 308;
pub const OFF_SIGNER_KEY_ID: usize = 340;
pub const OFF_ORG: usize = 372;
pub const OFF_ACTOR: usize = 404;
pub const OFF_CATEGORY: usize = 436;

pub const AUTH_SEED: &[u8] = b"authorization";
pub const CONFIG_SEED: &[u8] = b"gate_config";
pub const CONSUMER_AUTH_SEED: &[u8] = b"consumer_authority";
pub const RESULT_SEED: &[u8] = b"test_result";

pub const SCHEMA_VERSION: u64 = 2;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CanonicalFields {
    pub network_id: [u8; 32],
    pub partner_hash: [u8; 32],
    pub policy_hash: [u8; 32],
    pub action_hash: [u8; 32],
    pub subject_hash: [u8; 32],
    pub issued_at: u64,
    pub expires_at: u64,
    pub nonce: [u8; 32],
    pub attestation_id: [u8; 32],
    pub environment: [u8; 32],
    pub signer_key_id: [u8; 32],
    pub organization_commitment: [u8; 32],
    pub actor_commitment: [u8; 32],
    pub institutional_result_category: [u8; 32],
    pub schema_version: u64,
}

pub fn read_u64_be(bytes: &[u8]) -> u64 {
    let mut buf = [0u8; 8];
    buf.copy_from_slice(bytes);
    u64::from_be_bytes(buf)
}

pub fn prefix_keccak() -> [u8; 32] {
    keccak::hash(PREFIX).to_bytes()
}

pub fn parse_canonical_message(message: &[u8]) -> Result<CanonicalFields, ()> {
    if message.len() == LEGACY_V1_MESSAGE_LEN {
        return Err(());
    }
    if message.len() != CANONICAL_MESSAGE_LEN {
        return Err(());
    }
    if &message[OFF_PREFIX..OFF_PREFIX_HASH] != PREFIX {
        return Err(());
    }
    if message[OFF_PREFIX_HASH..OFF_SCHEMA] != prefix_keccak() {
        return Err(());
    }
    let schema = read_u64_be(&message[OFF_SCHEMA..OFF_NETWORK]);
    if schema != SCHEMA_VERSION {
        return Err(());
    }
    Ok(CanonicalFields {
        network_id: copy32(&message[OFF_NETWORK..OFF_PARTNER]),
        partner_hash: copy32(&message[OFF_PARTNER..OFF_POLICY]),
        policy_hash: copy32(&message[OFF_POLICY..OFF_ACTION]),
        action_hash: copy32(&message[OFF_ACTION..OFF_SUBJECT]),
        subject_hash: copy32(&message[OFF_SUBJECT..OFF_ISSUED]),
        issued_at: read_u64_be(&message[OFF_ISSUED..OFF_EXPIRES]),
        expires_at: read_u64_be(&message[OFF_EXPIRES..OFF_NONCE]),
        nonce: copy32(&message[OFF_NONCE..OFF_ATTESTATION_ID]),
        attestation_id: copy32(&message[OFF_ATTESTATION_ID..OFF_ENVIRONMENT]),
        environment: copy32(&message[OFF_ENVIRONMENT..OFF_SIGNER_KEY_ID]),
        signer_key_id: copy32(&message[OFF_SIGNER_KEY_ID..OFF_ORG]),
        organization_commitment: copy32(&message[OFF_ORG..OFF_ACTOR]),
        actor_commitment: copy32(&message[OFF_ACTOR..OFF_CATEGORY]),
        institutional_result_category: copy32(&message[OFF_CATEGORY..CANONICAL_MESSAGE_LEN]),
        schema_version: schema,
    })
}

fn copy32(slice: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    out.copy_from_slice(slice);
    out
}

pub fn is_zero32(value: &[u8; 32]) -> bool {
    value.iter().all(|b| *b == 0)
}

/// Official Solana Ed25519 instruction: offsets live in this instruction (0xffff).
pub fn extract_ed25519_pubkey_and_message(data: &[u8]) -> Result<([u8; 32], Vec<u8>), ()> {
    if data.len() < 16 {
        return Err(());
    }
    if data[0] < 1 {
        return Err(());
    }
    let sig_ix = u16::from_le_bytes([data[4], data[5]]);
    let pk_off = u16::from_le_bytes([data[6], data[7]]) as usize;
    let pk_ix = u16::from_le_bytes([data[8], data[9]]);
    let msg_off = u16::from_le_bytes([data[10], data[11]]) as usize;
    let msg_size = u16::from_le_bytes([data[12], data[13]]) as usize;
    let msg_ix = u16::from_le_bytes([data[14], data[15]]);
    if sig_ix != 0xffff || pk_ix != 0xffff || msg_ix != 0xffff {
        return Err(());
    }
    if pk_off + 32 > data.len() || msg_off + msg_size > data.len() {
        return Err(());
    }
    let mut pubkey = [0u8; 32];
    pubkey.copy_from_slice(&data[pk_off..pk_off + 32]);
    Ok((pubkey, data[msg_off..msg_off + msg_size].to_vec()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_wrong_length() {
        assert!(parse_canonical_message(&[0u8; 10]).is_err());
        assert!(parse_canonical_message(&[0u8; LEGACY_V1_MESSAGE_LEN]).is_err());
    }

    #[test]
    fn prefix_length_matches() {
        assert_eq!(PREFIX.len(), PREFIX_LEN);
        assert_eq!(CANONICAL_MESSAGE_LEN, 468);
        assert_eq!(HASH_LEN, 32);
        assert_eq!(U64_LEN, 8);
    }

    #[test]
    fn rejects_altered_prefix_hash() {
        let mut message = vec![0u8; CANONICAL_MESSAGE_LEN];
        message[OFF_PREFIX..OFF_PREFIX_HASH].copy_from_slice(PREFIX);
        message[OFF_SCHEMA + 7] = 2;
        assert!(parse_canonical_message(&message).is_err());
    }
}
