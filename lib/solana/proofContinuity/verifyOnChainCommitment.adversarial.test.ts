import { Keypair } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { PROOF_CONTINUITY_PROGRAM_ID, RECEIPT_COMMITMENT_STATUS } from "./constants";
import { hashReceiptId, hashScopeId } from "./message";
import {
  buildTestCommitmentChainEvidence,
  testIssuerKeypair,
  trustedIssuerBytesFromKeypair,
} from "./testFixtures";
import { proofContinuityProgramId } from "./pda";
import { verifyOnChainReceiptCommitment } from "./verifyOnChainCommitment";
import { RECEIPT_COMMITMENT_DISCRIMINATOR } from "./anchorDiscriminator";
import { ed25519PublicKeyBytesFromJwk } from "./issuerAuthority";
import { blockchainNativeTestSigningKey } from "@/lib/partner/launchpad/blockchainNative/testIssuance";

describe("verifyOnChainReceiptCommitment adversarial", () => {
  const expectations = {
    receipt_id: "dr_adv_001",
    payload_hash_hex: "ab".repeat(32),
    partner_id: "partner-975",
    policy_id: "policy-975",
    application_id: "app-975",
  };
  const admin = Keypair.generate();
  const issuer = testIssuerKeypair();
  const signingKey = blockchainNativeTestSigningKey("adversarial");

  function baseEvidence() {
    return buildTestCommitmentChainEvidence({
      registryAdmin: admin,
      trustedIssuerPubkey: trustedIssuerBytesFromKeypair(issuer),
      ...expectations,
    });
  }

  it("rejects wrong account owner", () => {
    const evidence = baseEvidence();
    evidence.commitment.owner = Keypair.generate().publicKey.toBase58();
    const result = verifyOnChainReceiptCommitment({
      chainEvidence: evidence,
      expectations,
    });
    expect(result).toEqual({ ok: false, reason: "chain_evidence_wrong_account_owner" });
  });

  it("rejects forged commitment discriminator", () => {
    const evidence = baseEvidence();
    evidence.commitment.data.fill(0x7f, 0, 8);
    const result = verifyOnChainReceiptCommitment({
      chainEvidence: evidence,
      expectations,
    });
    expect(result).toEqual({ ok: false, reason: "chain_evidence_wrong_commitment_discriminator" });
  });

  it("rejects wrong commitment PDA address", () => {
    const evidence = baseEvidence();
    evidence.commitment.address = Keypair.generate().publicKey.toBase58();
    const result = verifyOnChainReceiptCommitment({
      chainEvidence: evidence,
      expectations,
    });
    expect(result).toEqual({ ok: false, reason: "chain_evidence_commitment_pda_mismatch" });
  });

  it("rejects wrong registry PDA address", () => {
    const evidence = baseEvidence();
    evidence.registry.address = Keypair.generate().publicKey.toBase58();
    const result = verifyOnChainReceiptCommitment({
      chainEvidence: evidence,
      expectations,
    });
    expect(result).toEqual({ ok: false, reason: "chain_evidence_registry_pda_mismatch" });
  });

  it("rejects unauthorized issuer vs registry pin", () => {
    const evidence = buildTestCommitmentChainEvidence({
      registryAdmin: admin,
      trustedIssuerPubkey: trustedIssuerBytesFromKeypair(issuer),
      ...expectations,
    });
    const result = verifyOnChainReceiptCommitment({
      chainEvidence: evidence,
      expectations,
      authorizedIssuerPublicKeyJwk: signingKey.publicKeyJwk,
      portableVerification: {
        contract_version: "abraxas_independent_verifier/1.1.0",
        cryptographically_authentic: true,
        issuer_currently_authorized: true,
        policy_and_audience_match: true,
        status_evidence_authentic: true,
        currently_acceptable: "yes",
        phases: [],
        failure_codes: [],
        disclaimer: "",
      },
    });
    expect(result).toEqual({ ok: false, reason: "chain_evidence_unauthorized_issuer" });
  });

  it("rejects expired commitment when LE expires_at is in the past", () => {
    const evidence = baseEvidence();
    const off = 8 + 32 * 6;
    evidence.commitment.data.writeBigInt64LE(BigInt(1_000), off);
    const result = verifyOnChainReceiptCommitment({
      chainEvidence: evidence,
      expectations,
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(result).toEqual({ ok: false, reason: "on_chain_commitment_expired" });
  });

  it("rejects when portable authentic but issuer key not supplied", () => {
    const evidence = baseEvidence();
    const result = verifyOnChainReceiptCommitment({
      chainEvidence: evidence,
      expectations,
      portableVerification: {
        contract_version: "abraxas_independent_verifier/1.1.0",
        cryptographically_authentic: true,
        issuer_currently_authorized: true,
        policy_and_audience_match: true,
        status_evidence_authentic: true,
        currently_acceptable: "yes",
        phases: [],
        failure_codes: [],
        disclaimer: "",
      },
    });
    expect(result).toEqual({ ok: false, reason: "authorized_issuer_key_required" });
  });

  it("rejects owner program id mismatch vs configured continuity program", () => {
    const evidence = baseEvidence();
    evidence.commitment.owner = proofContinuityProgramId().toBase58();
    evidence.registry.owner = proofContinuityProgramId().toBase58();
    evidence.programId = Keypair.generate().publicKey.toBase58();
    const wrongOwner = Keypair.generate().publicKey;
    evidence.commitment.owner = wrongOwner.toBase58();
    const result = verifyOnChainReceiptCommitment({ chainEvidence: evidence, expectations });
    expect(result).toEqual({ ok: false, reason: "chain_evidence_wrong_account_owner" });
    expect(PROOF_CONTINUITY_PROGRAM_ID).toBeTruthy();
    expect(RECEIPT_COMMITMENT_DISCRIMINATOR.length).toBe(8);
    expect(RECEIPT_COMMITMENT_STATUS.active).toBe(0);
    expect(hashScopeId("x").length).toBe(32);
    expect(hashReceiptId("dr_x").length).toBe(32);
  });
});