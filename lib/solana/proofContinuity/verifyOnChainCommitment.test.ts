import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { RECEIPT_COMMITMENT_STATUS } from "./constants";
import { encodeCommitmentMessage, hashReceiptId, hashScopeId } from "./message";
import { verifyOnChainReceiptCommitment } from "./verifyOnChainCommitment";
import {
  buildTestCommitmentChainEvidence,
  testIssuerKeypair,
  trustedIssuerBytesFromKeypair,
} from "./testFixtures";
import { ed25519PublicKeyBytesFromJwk } from "./issuerAuthority";
import { blockchainNativeTestSigningKey } from "@/lib/partner/launchpad/blockchainNative/testIssuance";

describe("verifyOnChainReceiptCommitment", () => {
  const expectations = {
    receipt_id: "dr_test_receipt_001",
    payload_hash_hex: "ab".repeat(32),
    partner_id: "partner-975",
    policy_id: "policy-975",
    application_id: "app-975",
  };
  const admin = Keypair.generate();
  const issuer = testIssuerKeypair();
  const signingKey = blockchainNativeTestSigningKey("verify-on-chain");

  function evidence() {
    return buildTestCommitmentChainEvidence({
      registryAdmin: admin,
      trustedIssuerPubkey: ed25519PublicKeyBytesFromJwk(signingKey.publicKeyJwk)!,
      ...expectations,
    });
  }

  it("accepts authenticated matching active commitment", () => {
    const result = verifyOnChainReceiptCommitment({
      chainEvidence: evidence(),
      expectations,
      now: new Date("2026-01-01T00:00:00Z"),
      authorizedIssuerPublicKeyJwk: signingKey.publicKeyJwk,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects tampered payload hash", () => {
    const result = verifyOnChainReceiptCommitment({
      chainEvidence: evidence(),
      expectations: { ...expectations, payload_hash_hex: "cd".repeat(32) },
    });
    expect(result).toEqual({ ok: false, reason: "on_chain_payload_mismatch" });
  });

  it("rejects revoked on-chain status", () => {
    const ev = buildTestCommitmentChainEvidence({
      registryAdmin: admin,
      trustedIssuerPubkey: trustedIssuerBytesFromKeypair(issuer),
      ...expectations,
      status_version: 2n,
    });
    ev.commitment.data.writeUInt8(RECEIPT_COMMITMENT_STATUS.revoked, 8 + 32 * 6 + 8);
    const result = verifyOnChainReceiptCommitment({
      chainEvidence: ev,
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
      execution_nonce: 1n,
    });
    expect(msg.subarray(0, 27).toString("utf8")).toBe("ABRAXAS_PROOF_CONTINUITY_V1");
  });
});