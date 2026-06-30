// FILE: lib/passport/stamps.ts
// Canonical stamp bit order — identical on Solana, Sui, and off-chain verifiers.
// 10 stamps, u16 bitfield (bits 0–9). Accredited-investor stamp intentionally excluded.

export const PASSPORT_FORMAT_VERSION = 1;
export const PASSPORT_SERIALIZED_SIZE = 52;

/** Bit index → stamp id (single source of truth for UI + on-chain) */
export const STAMP_BIT_ORDER = [
  "identity",
  "biometric",
  "business",
  "owner",
  "royalty",
  "property",
  "tribal",
  "compliance",
  "lending",
  "social",
] as const;

export type StampBitId = typeof STAMP_BIT_ORDER[number];

/** Bitmask for each stamp */
export const STAMP_BITS: Record<StampBitId, number> = {
  identity:   1 << 0,
  biometric:  1 << 1,
  business:   1 << 2,
  owner:      1 << 3,
  royalty:    1 << 4,
  property:   1 << 5,
  tribal:     1 << 6,
  compliance: 1 << 7,
  lending:    1 << 8,
  social:     1 << 9,
};

export function stampsToBitmask(stampIds: readonly StampBitId[]): number {
  return stampIds.reduce((mask, id) => mask | STAMP_BITS[id], 0);
}

export function bitmaskToStampIds(bitmask: number): StampBitId[] {
  return STAMP_BIT_ORDER.filter(id => (bitmask & STAMP_BITS[id]) !== 0);
}

export function hasRequiredStamps(held: number, required: number): boolean {
  return (held & required) === required;
}
