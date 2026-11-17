import { describe, expect, it } from "vitest";
import { RECEIPT_COMMITMENT_STATUS } from "./constants";
import { encodeCommitmentMessage, hashReceiptId, hashScopeId } from "./message";
import { verifyOnChainReceiptCommitment } from "./verifyOnChainCommitment";

// Minimal synthetic account bytes mirroring on-chain layout after commit (discriminator stub).
function syntheticCommitmentAccount(fields: {
  receipt_id: string;
  payload_hex: string;
  partner_id: string;
  policy_id: string;
  application_id: string;
  expires_at: number;
  status: number;
  status_version: bigint;
}): Buffer {
  const buf = Buffer.alloc(8 + 32 + 32 * 6 + 8 + 1 + 8 + 1, 0);
  let off = 8;
  off += 32; // registry pubkey
  hashReceiptId(fields.receipt_id).copy(buf, off);
  off += 32;
  Buffer.from(fields.payload_hex, "hex").copy(buf, off);
  off += 32;
  hashScopeId(fields.partner_id).copy(buf, off);
  off += 32;
  hashScopeId(fields.policy_id).copy(buf, off);
  off += 32;
  hashScopeId(fields.application_id).copy(buf, off);
  off += 32;
  buf.writeBigInt64BE(BigInt(fields.expires_at), off);
  off += 8;
  buf.writeUInt8(fields.status, off);
  off += 1;
  buf.writeBigUInt64BE(fields.status_version, off);
  return buf;
}

describe("verifyOnChainReceiptCommitment", () => {
  const expectations = {
    receipt_id: "dr_test_receipt_001",
    payload_hash_hex: "ab".repeat(32),
    partner_id: "partner-975",
    policy_id: "policy-975",
    application_id: "app-975",
  };

  it("accepts matching active commitment", () => {
    const data = syntheticCommitmentAccount({
      ...expectations,
      payload_hex: expectations.payload_hash_hex,
      expires_at: 9_000_000_000,
      status: RECEIPT_COMMITMENT_STATUS.active,
      status_version: 1n,
    });
    const result = verifyOnChainReceiptCommitment({
      commitmentAccountData: data,
      expectations,
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects tampered payload hash", () => {
    const data = syntheticCommitmentAccount({
      ...expectations,
      payload_hex: "cd".repeat(32),
      expires_at: 9_000_000_000,
      status: RECEIPT_COMMITMENT_STATUS.active,
      status_version: 1n,
    });
    const result = verifyOnChainReceiptCommitment({
      commitmentAccountData: data,
      expectations,
    });
    expect(result).toEqual({ ok: false, reason: "on_chain_payload_mismatch" });
  });

  it("rejects revoked on-chain status", () => {
    const data = syntheticCommitmentAccount({
      ...expectations,
      payload_hex: expectations.payload_hash_hex,
      expires_at: 9_000_000_000,
      status: RECEIPT_COMMITMENT_STATUS.revoked,
      status_version: 2n,
    });
    const result = verifyOnChainReceiptCommitment({
      commitmentAccountData: data,
      expectations,
    });
    expect(result).toEqual({ ok: false, reason: "on_chain_status_not_active" });
  });

  it("builds canonical commitment messages for local validator signing", () => {
    const msg = encodeCommitmentMessage({
      receipt_id_hash: hashReceiptId("dr_x"),
      payload_hash: Buffer.from("aa".repeat(32), "hex"),
      partner_hash: hashScopeId("p"),
      policy_hash: hashScopeId("pol"),
      application_hash: hashScopeId("app"),
      expires_at: 100n,
      status_version: 1n,
    });
    expect(msg.subarray(0, 27).toString("utf8")).toBe("ABRAXAS_PROOF_CONTINUITY_V1");
  });
});