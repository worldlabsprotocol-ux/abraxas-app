use abraxas_eligibility_gate::canonical::{
    prefix_keccak, CANONICAL_MESSAGE_LEN, LEGACY_V1_MESSAGE_LEN, OFF_ACTION, OFF_ACTOR,
    OFF_ATTESTATION_ID, OFF_CATEGORY, OFF_ENVIRONMENT, OFF_EXPIRES, OFF_ISSUED, OFF_NETWORK,
    OFF_NONCE, OFF_ORG, OFF_PARTNER, OFF_POLICY, OFF_PREFIX, OFF_PREFIX_HASH, OFF_SCHEMA,
    OFF_SIGNER_KEY_ID, OFF_SUBJECT, PREFIX,
};
use anchor_lang::solana_program::keccak;

fn h(label: &str) -> [u8; 32] {
    keccak::hash(label.as_bytes()).to_bytes()
}

fn write_u64_be(buf: &mut [u8], offset: usize, value: u64) {
    buf[offset..offset + 8].copy_from_slice(&value.to_be_bytes());
}

#[test]
fn typescript_v2_canonical_bytes_match() {
    let mut message = vec![0u8; CANONICAL_MESSAGE_LEN];
    message[OFF_PREFIX..OFF_PREFIX_HASH].copy_from_slice(PREFIX);
    message[OFF_PREFIX_HASH..OFF_SCHEMA].copy_from_slice(&prefix_keccak());
    write_u64_be(&mut message, OFF_SCHEMA, 2);
    message[OFF_NETWORK..OFF_PARTNER].copy_from_slice(&h("evm_sepolia"));
    message[OFF_PARTNER..OFF_POLICY].copy_from_slice(&h("conformance-partner"));
    message[OFF_POLICY..OFF_ACTION].copy_from_slice(&h("conformance-policy:1"));
    message[OFF_ACTION..OFF_SUBJECT]
        .copy_from_slice(&h("activate_protocol_access:sandbox:protocol_access"));
    message[OFF_SUBJECT..OFF_ISSUED].copy_from_slice(&h("subject-binding"));
    write_u64_be(&mut message, OFF_ISSUED, 1_700_000_000);
    write_u64_be(&mut message, OFF_EXPIRES, 2_000_000_000);
    message[OFF_NONCE..OFF_ATTESTATION_ID].copy_from_slice(&h("nonce-conformance-1"));
    message[OFF_ATTESTATION_ID..OFF_ENVIRONMENT].copy_from_slice(&h("attestation-conformance-1"));
    message[OFF_ENVIRONMENT..OFF_SIGNER_KEY_ID].copy_from_slice(&h("sandbox"));
    message[OFF_SIGNER_KEY_ID..OFF_ORG].copy_from_slice(&h("evm-attestation-test-1"));
    message[OFF_ORG..OFF_ACTOR].copy_from_slice(&h("org-commitment"));
    message[OFF_ACTOR..OFF_CATEGORY].copy_from_slice(&h("actor-commitment"));
    message[OFF_CATEGORY..CANONICAL_MESSAGE_LEN].copy_from_slice(&h("organization_eligible"));
    let expected = encode_ts();
    assert_eq!(message, expected);
    assert_eq!(message.len(), 468);
    assert_ne!(message.len(), LEGACY_V1_MESSAGE_LEN);
}

fn encode_ts() -> Vec<u8> {
    // Same layout as TypeScript encodeSolanaEligibilityMessage for CONFORMANCE_VECTOR_FIELDS.
    let mut message = vec![0u8; CANONICAL_MESSAGE_LEN];
    message[OFF_PREFIX..OFF_PREFIX_HASH].copy_from_slice(PREFIX);
    message[OFF_PREFIX_HASH..OFF_SCHEMA].copy_from_slice(&prefix_keccak());
    write_u64_be(&mut message, OFF_SCHEMA, 2);
    message[OFF_NETWORK..OFF_PARTNER].copy_from_slice(&h("evm_sepolia"));
    message[OFF_PARTNER..OFF_POLICY].copy_from_slice(&h("conformance-partner"));
    message[OFF_POLICY..OFF_ACTION].copy_from_slice(&h("conformance-policy:1"));
    message[OFF_ACTION..OFF_SUBJECT]
        .copy_from_slice(&h("activate_protocol_access:sandbox:protocol_access"));
    message[OFF_SUBJECT..OFF_ISSUED].copy_from_slice(&h("subject-binding"));
    write_u64_be(&mut message, OFF_ISSUED, 1_700_000_000);
    write_u64_be(&mut message, OFF_EXPIRES, 2_000_000_000);
    message[OFF_NONCE..OFF_ATTESTATION_ID].copy_from_slice(&h("nonce-conformance-1"));
    message[OFF_ATTESTATION_ID..OFF_ENVIRONMENT].copy_from_slice(&h("attestation-conformance-1"));
    message[OFF_ENVIRONMENT..OFF_SIGNER_KEY_ID].copy_from_slice(&h("sandbox"));
    message[OFF_SIGNER_KEY_ID..OFF_ORG].copy_from_slice(&h("evm-attestation-test-1"));
    message[OFF_ORG..OFF_ACTOR].copy_from_slice(&h("org-commitment"));
    message[OFF_ACTOR..OFF_CATEGORY].copy_from_slice(&h("actor-commitment"));
    message[OFF_CATEGORY..CANONICAL_MESSAGE_LEN].copy_from_slice(&h("organization_eligible"));
    message
}
