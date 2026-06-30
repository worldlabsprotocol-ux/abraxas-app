// FILE: sui/abraxas_passport/sources/passport.move
// Thin Sui verifier — same 52-byte Passport root as Solana (pre-mainnet skeleton).

module abraxas_passport::passport {
    use std::vector;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// Must match lib/passport/serialize.ts layout (52 bytes LE)
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

    public fun issue_stamps(passport: &mut Passport, new_stamps: u16) {
        assert!(passport.root.revoked == 0, E_REVOKED);
        passport.root.stamps = passport.root.stamps | new_stamps;
        passport.root.nonce = passport.root.nonce + 1;
    }

    /// Pure verify — same rules as lib/passport/verify.ts
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
}
