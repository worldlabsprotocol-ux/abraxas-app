// FILE: lib/passport/serialize.ts
// Fixed 52-byte little-endian serialization — MUST match Anchor + Move implementations.

import { PASSPORT_FORMAT_VERSION, PASSPORT_SERIALIZED_SIZE } from "./stamps";
import type { PassportRoot } from "./types";

const DOMAIN = new TextEncoder().encode("abraxas-passport-v1");

/**
 * Layout (52 bytes, little-endian):
 *   [0]     version u8
 *   [1..2]  stamps u16
 *   [3..34] authority [32]
 *   [35..42] expires_at u64
 *   [43]    revoked u8 (0 | 1)
 *   [44..51] nonce u64
 */
export function serializePassportRoot(passport: PassportRoot): Uint8Array {
  if (passport.authority.length !== 32) {
    throw new Error("authority must be 32 bytes");
  }
  const buf = new Uint8Array(PASSPORT_SERIALIZED_SIZE);
  const view = new DataView(buf.buffer);
  view.setUint8(0, passport.version);
  view.setUint16(1, passport.stamps, true);
  buf.set(passport.authority, 3);
  view.setBigUint64(35, BigInt(passport.expiresAt), true);
  view.setUint8(43, passport.revoked ? 1 : 0);
  view.setBigUint64(44, BigInt(passport.nonce), true);
  return buf;
}

export function deserializePassportRoot(bytes: Uint8Array): PassportRoot {
  if (bytes.length !== PASSPORT_SERIALIZED_SIZE) {
    throw new Error(`expected ${PASSPORT_SERIALIZED_SIZE} bytes, got ${bytes.length}`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    version: view.getUint8(0),
    stamps: view.getUint16(1, true),
    authority: bytes.slice(3, 35),
    expiresAt: Number(view.getBigUint64(35, true)),
    revoked: view.getUint8(43) === 1,
    nonce: Number(view.getBigUint64(44, true)),
  };
}

/** Canonical hash input for Type 0 Ed25519 proofs */
export function passportSigningMessage(serialized: Uint8Array): Uint8Array {
  const out = new Uint8Array(DOMAIN.length + serialized.length);
  out.set(DOMAIN, 0);
  out.set(serialized, DOMAIN.length);
  return out;
}

export function emptyPassportRoot(authority: Uint8Array): PassportRoot {
  return {
    version: PASSPORT_FORMAT_VERSION,
    stamps: 0,
    authority,
    expiresAt: 0,
    revoked: false,
    nonce: 0,
  };
}
