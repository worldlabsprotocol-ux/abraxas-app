import { RECEIPT_COMMITMENT_DISCRIMINATOR } from "./anchorDiscriminator";
import { RECEIPT_COMMITMENT_STATUS } from "./constants";

export const RECEIPT_COMMITMENT_ACCOUNT_SIZE = 8 + 32 + 32 * 5 + 8 + 1 + 8 + 1;

/** Decodes Anchor `ReceiptCommitment` account data (8-byte discriminator + fields). */
export type DecodedReceiptCommitment = {
  registry: string;
  receipt_id_hash: string;
  payload_hash: string;
  partner_hash: string;
  policy_hash: string;
  application_hash: string;
  expires_at: number;
  status: number;
  status_version: bigint;
};

export function decodeReceiptCommitmentAccount(data: Buffer): DecodedReceiptCommitment | null {
  if (data.length < RECEIPT_COMMITMENT_ACCOUNT_SIZE) return null;
  if (!data.subarray(0, 8).equals(RECEIPT_COMMITMENT_DISCRIMINATOR)) return null;
  let off = 8;
  const registry = data.subarray(off, off + 32);
  off += 32;
  const receipt_id_hash = data.subarray(off, off + 32).toString("hex");
  off += 32;
  const payload_hash = data.subarray(off, off + 32).toString("hex");
  off += 32;
  const partner_hash = data.subarray(off, off + 32).toString("hex");
  off += 32;
  const policy_hash = data.subarray(off, off + 32).toString("hex");
  off += 32;
  const application_hash = data.subarray(off, off + 32).toString("hex");
  off += 32;
  const expires_at = Number(data.readBigInt64LE(off));
  off += 8;
  const status = data.readUInt8(off);
  off += 1;
  const status_version = data.readBigUInt64LE(off);
  return {
    registry: Buffer.from(registry).toString("hex"),
    receipt_id_hash,
    payload_hash,
    partner_hash,
    policy_hash,
    application_hash,
    expires_at,
    status,
    status_version,
  };
}

export function commitmentIsCurrentlyAcceptable(
  decoded: DecodedReceiptCommitment,
  nowUnixSec: number,
): { ok: true } | { ok: false; reason: string } {
  if (decoded.status !== RECEIPT_COMMITMENT_STATUS.active) {
    return { ok: false, reason: "on_chain_status_not_active" };
  }
  if (decoded.expires_at <= nowUnixSec) {
    return { ok: false, reason: "on_chain_commitment_expired" };
  }
  return { ok: true };
}