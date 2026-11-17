import { createHash } from "node:crypto";
import { PROOF_CONTINUITY_PREFIX } from "./constants";

export const COMMITMENT_MESSAGE_LEN =
  Buffer.byteLength(PROOF_CONTINUITY_PREFIX, "utf8") + 32 * 5 + 8 + 8 + 8;

export type CommitmentMessageFields = {
  receipt_id_hash: Buffer;
  payload_hash: Buffer;
  partner_hash: Buffer;
  policy_hash: Buffer;
  application_hash: Buffer;
  expires_at: bigint;
  status_version: bigint;
  execution_nonce: bigint;
};

export function hashReceiptId(receiptId: string): Buffer {
  return createHash("sha256").update(receiptId, "utf8").digest();
}

export function hashScopeId(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function encodeCommitmentMessage(fields: CommitmentMessageFields): Buffer {
  const buf = Buffer.alloc(COMMITMENT_MESSAGE_LEN);
  let off = 0;
  buf.write(PROOF_CONTINUITY_PREFIX, off, "utf8");
  off += Buffer.byteLength(PROOF_CONTINUITY_PREFIX, "utf8");
  for (const chunk of [
    fields.receipt_id_hash,
    fields.payload_hash,
    fields.partner_hash,
    fields.policy_hash,
    fields.application_hash,
  ]) {
    chunk.copy(buf, off);
    off += 32;
  }
  buf.writeBigInt64BE(fields.expires_at, off);
  off += 8;
  buf.writeBigUInt64BE(fields.status_version, off);
  off += 8;
  buf.writeBigUInt64BE(fields.execution_nonce, off);
  return buf;
}