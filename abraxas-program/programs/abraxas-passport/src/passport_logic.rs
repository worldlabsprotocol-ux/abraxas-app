// FILE: abraxas-program/programs/abraxas-passport/src/passport_logic.rs
// Pure verification — mirror in lib/passport/verify.ts and sui/passport.move

pub const PASSPORT_SERIALIZED_SIZE: usize = 52;
pub const DOMAIN: &[u8] = b"abraxas-passport-v1";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PassportRoot {
    pub version: u8,
    pub stamps: u16,
    pub authority: [u8; 32],
    pub expires_at: u64,
    pub revoked: u8,
    pub nonce: u64,
}

impl PassportRoot {
    pub fn serialize(&self) -> [u8; PASSPORT_SERIALIZED_SIZE] {
        let mut buf = [0u8; PASSPORT_SERIALIZED_SIZE];
        buf[0] = self.version;
        buf[1..3].copy_from_slice(&self.stamps.to_le_bytes());
        buf[3..35].copy_from_slice(&self.authority);
        buf[35..43].copy_from_slice(&self.expires_at.to_le_bytes());
        buf[43] = self.revoked;
        buf[44..52].copy_from_slice(&self.nonce.to_le_bytes());
        buf
    }

    pub fn deserialize(bytes: &[u8]) -> Option<Self> {
        if bytes.len() != PASSPORT_SERIALIZED_SIZE {
            return None;
        }
        let mut authority = [0u8; 32];
        authority.copy_from_slice(&bytes[3..35]);
        Some(Self {
            version: bytes[0],
            stamps: u16::from_le_bytes([bytes[1], bytes[2]]),
            authority,
            expires_at: u64::from_le_bytes(bytes[35..43].try_into().ok()?),
            revoked: bytes[43],
            nonce: u64::from_le_bytes(bytes[44..52].try_into().ok()?),
        })
    }
}

pub fn has_required_stamps(held: u16, required: u16) -> bool {
    held & required == required
}

pub fn verify_passport_state(
    passport: &PassportRoot,
    required_stamps: u16,
    current_timestamp: u64,
) -> bool {
    if passport.version != 1 {
        return false;
    }
    if passport.revoked != 0 {
        return false;
    }
    if passport.expires_at != 0 && current_timestamp >= passport.expires_at {
        return false;
    }
    has_required_stamps(passport.stamps, required_stamps)
}
