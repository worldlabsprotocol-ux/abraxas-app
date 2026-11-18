import { PROOF_CONTINUITY_REGISTRY_DISCRIMINATOR } from "./anchorDiscriminator";

export const PROOF_REGISTRY_ACCOUNT_SIZE = 8 + 32 + 32 + 32 * 3 + 8 + 1;

export type DecodedProofContinuityRegistry = {
  admin: string;
  trusted_issuer_pubkey: string;
  partner_hash: string;
  policy_hash: string;
  application_hash: string;
  registry_version: bigint;
  bump: number;
};

export function decodeProofContinuityRegistry(data: Buffer): DecodedProofContinuityRegistry | null {
  if (data.length < PROOF_REGISTRY_ACCOUNT_SIZE) return null;
  if (!data.subarray(0, 8).equals(PROOF_CONTINUITY_REGISTRY_DISCRIMINATOR)) return null;
  let off = 8;
  const admin = data.subarray(off, off + 32).toString("hex");
  off += 32;
  const trusted_issuer_pubkey = data.subarray(off, off + 32).toString("hex");
  off += 32;
  const partner_hash = data.subarray(off, off + 32).toString("hex");
  off += 32;
  const policy_hash = data.subarray(off, off + 32).toString("hex");
  off += 32;
  const application_hash = data.subarray(off, off + 32).toString("hex");
  off += 32;
  const registry_version = data.readBigUInt64LE(off);
  off += 8;
  const bump = data.readUInt8(off);
  return {
    admin,
    trusted_issuer_pubkey,
    partner_hash,
    policy_hash,
    application_hash,
    registry_version,
    bump,
  };
}