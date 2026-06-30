// FILE: sui/abraxas_passport/sources/passport.move
// Abraxas Passport on Sui devnet — same stamp bitmask rules as lib/passport (52-byte root spec).

module abraxas_passport::passport {
    use std::vector;
    use sui::bcs;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// Must match lib/passport/serialize.ts layout (logical fields)
    public struct PassportRoot has copy, drop, store {
        version: u8,
        stamps: u16,
        authority: vector<u8>,
        expires_at: u64,
        revoked: u8,
        nonce: u64,
    }

    public struct Passport has key, store {
        id: UID,
        root: PassportRoot,
        subject: address,
    }

    public struct IssuanceCap has key, store {
        id: UID,
    }

    const E_REVOKED: u64 = 1;
    const E_MISSING_STAMPS: u64 = 2;
    const E_BAD_AUTHORITY: u64 = 3;

    /// Stamp bits aligned with lib/passport/stamps.ts
    const STAMP_IDENTITY: u16 = 1;
    const STAMP_BIOMETRIC: u16 = 2;
    const STAMP_SOCIAL: u16 = 512;

    /// Admin receives issuance capability
    entry fun mint_cap(ctx: &mut TxContext) {
        transfer::transfer(IssuanceCap { id: object::new(ctx) }, tx_context::sender(ctx));
    }

    entry fun create_passport(
        _cap: &IssuanceCap,
        subject: address,
        authority: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert!(vector::length(&authority) == 32, E_BAD_AUTHORITY);
        let root = PassportRoot {
            version: 1,
            stamps: 0,
            authority,
            expires_at: 0,
            revoked: 0,
            nonce: 0,
        };
        transfer::transfer(
            Passport { id: object::new(ctx), root, subject },
            subject,
        );
    }

    entry fun issue_stamps_entry(
        _cap: &IssuanceCap,
        passport: &mut Passport,
        new_stamps: u16,
    ) {
        issue_stamps(passport, new_stamps);
    }

    /// Devnet bootstrap: cap + passport with identity + biometric + social for `subject`
    entry fun bootstrap_demo_passport(subject: address, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let authority = address_to_authority(sender);
        let cap = IssuanceCap { id: object::new(ctx) };
        transfer::transfer(cap, sender);

        let mut root = PassportRoot {
            version: 1,
            stamps: 0,
            authority,
            expires_at: 0,
            revoked: 0,
            nonce: 0,
        };
        root.stamps = STAMP_IDENTITY | STAMP_BIOMETRIC | STAMP_SOCIAL;
        root.nonce = 1;

        transfer::transfer(
            Passport { id: object::new(ctx), root, subject },
            subject,
        );
    }

    public fun issue_stamps(passport: &mut Passport, new_stamps: u16) {
        assert!(passport.root.revoked == 0, E_REVOKED);
        passport.root.stamps = passport.root.stamps | new_stamps;
        passport.root.nonce = passport.root.nonce + 1;
    }

    public fun verify(
        passport: &Passport,
        required_stamps: u16,
        current_timestamp: u64,
    ): bool {
        if (passport.root.version != 1) return false;
        if (passport.root.revoked != 0) return false;
        if (passport.root.expires_at != 0 && current_timestamp >= passport.root.expires_at) {
            return false
        };
        (passport.root.stamps & required_stamps) == required_stamps
    }

    public fun verify_or_abort(
        passport: &Passport,
        required_stamps: u16,
        current_timestamp: u64,
    ) {
        assert!(verify(passport, required_stamps, current_timestamp), E_MISSING_STAMPS);
    }

    // ── Getters for devnet debug panel / RPC parsing ─────────────────────

    public fun subject_of(passport: &Passport): address {
        passport.subject
    }

    public fun stamps_of(passport: &Passport): u16 {
        passport.root.stamps
    }

    public fun version_of(passport: &Passport): u8 {
        passport.root.version
    }

    public fun nonce_of(passport: &Passport): u64 {
        passport.root.nonce
    }

    public fun revoked_of(passport: &Passport): u8 {
        passport.root.revoked
    }

    public fun expires_at_of(passport: &Passport): u64 {
        passport.root.expires_at
    }

    public fun authority_of(passport: &Passport): vector<u8> {
        passport.root.authority
    }

    fun address_to_authority(addr: address): vector<u8> {
        bcs::to_bytes(&addr)
    }
}
