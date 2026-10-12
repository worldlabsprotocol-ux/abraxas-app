import { PublicKey } from "@solana/web3.js";

/** BPF Upgradeable Loader ProgramData header (slot + Option<Pubkey>) — layout rehearsal for #537. */
export function decodeUpgradeableProgramDataAuthority(data: Buffer): PublicKey | null {
  if (data.length < 45) return null;
  const tag = data.readUInt32LE(0);
  if (tag !== 3) return null;
  const authorityTag = data.readUInt32LE(12);
  if (authorityTag === 0) return null;
  if (authorityTag !== 1) return null;
  return new PublicKey(data.subarray(16, 48));
}

export function preflightUpgradeAuthorityMatch(observed: PublicKey | null, expected: string): boolean {
  if (!observed) return false;
  return observed.toBase58() === expected;
}
