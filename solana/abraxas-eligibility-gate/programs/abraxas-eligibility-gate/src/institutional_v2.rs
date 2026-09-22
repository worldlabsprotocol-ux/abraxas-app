//! Planned V2 institutional message/PDA layout. Verification kit constants only.

pub const V2_PREFIX: &[u8] = b"ABRAXAS_CHAIN_ELIGIBILITY_V2";
pub const V2_MESSAGE_LEN: usize = 468;
pub const V1_LEGACY_LEN: usize = 372;
pub const V2_SCHEMA: u64 = 2;
pub const ENTITLEMENT_SEED: &[u8] = b"protocol_access";

pub fn entitlement_expired(valid_until: i64, now: i64) -> bool {
    valid_until <= now
}

/// Deployed program/config is V2-capable only when the live GateConfig requires
/// institutional V2 (468-byte) messages. V1-only programs fail closed.
pub fn deployed_institutional_capable(
    require_institutional: bool,
    schema_version: u64,
    message_len: usize,
) -> bool {
    require_institutional && schema_version == V2_SCHEMA && message_len == V2_MESSAGE_LEN
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn v2_prefix_and_length() {
        assert_eq!(V2_PREFIX.len(), 28);
        assert_eq!(V2_MESSAGE_LEN, 468);
        assert_ne!(V2_MESSAGE_LEN, V1_LEGACY_LEN);
        assert_eq!(V2_SCHEMA, 2);
    }

    #[test]
    fn entitlement_expiry_and_pda_seed() {
        assert!(entitlement_expired(100, 100));
        assert!(entitlement_expired(50, 100));
        assert!(!entitlement_expired(101, 100));
        assert_eq!(ENTITLEMENT_SEED, b"protocol_access");
        assert!(deployed_institutional_capable(true, 2, 468));
        assert!(!deployed_institutional_capable(false, 2, 468));
        assert!(!deployed_institutional_capable(true, 1, 372));
        assert!(!deployed_institutional_capable(true, 2, 372));
        assert!(!deployed_institutional_capable(false, 2, 468));
    }
}
