import { Keypair } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { runPartnerHarnessCase, type PartnerHarnessCaseResult } from "@/lib/partner/launchpad/partnerTestHarness";
import type { IndependentVerificationResult } from "../../../packages/abraxas-independent-verifier/src/verifyIndependent";
import { isBlockchainNativePrototypeEnabled } from "./contract";
import {
  harnessIssuedReceiptFields,
  runBlockchainNativePrototypeHarness,
} from "./runPrototypeHarness";
import { blockchainNativeTestSigningKey } from "./testIssuance";
import { ed25519PublicKeyBytesFromJwk } from "@/lib/solana/proofContinuity/issuerAuthority";
import { buildTestCommitmentChainEvidence } from "@/lib/solana/proofContinuity/testFixtures";

function portableFromHarness(harness: PartnerHarnessCaseResult): IndependentVerificationResult {
  const authentic = harness.signature_valid === true;
  return {
    contract_version: "abraxas_independent_verifier/1.1.0",
    cryptographically_authentic: authentic,
    issuer_currently_authorized: authentic,
    policy_and_audience_match: authentic,
    status_evidence_authentic: authentic,
    currently_acceptable: authentic ? "yes" : "no",
    phases: [],
    failure_codes: [],
    disclaimer: "harness-local",
  };
}

describe("blockchain-native launchpad prototype journey (local)", () => {
  it("fails closed when prototype env is disabled", () => {
    vi.stubEnv("ABRAXAS_BLOCKCHAIN_NATIVE_PROTOTYPE", "");
    expect(isBlockchainNativePrototypeEnabled()).toBe(false);
    const signingKey = blockchainNativeTestSigningKey("disabled");
    const result = runBlockchainNativePrototypeHarness({
      partnerId: "partner-integration-821",
      policyId: "policy-age21-sandbox-821",
      policyVersion: 1,
      policyTemplateId: "wallet_control",
      scenarioId: "approved",
      executionNonce: 1n,
      signingKey,
      chainEvidence: buildTestCommitmentChainEvidence({
        registryAdmin: Keypair.generate(),
        trustedIssuerPubkey: ed25519PublicKeyBytesFromJwk(signingKey.publicKeyJwk)!,
        partner_id: "partner-integration-821",
        policy_id: "policy-age21-sandbox-821",
        application_id: "wallet_control",
        receipt_id: "dr_placeholder",
        payload_hash_hex: "00".repeat(32),
      }),
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
    expect(result).toEqual({ ok: false, code: "blockchain_native_prototype_disabled" });
    vi.unstubAllEnvs();
  });

  it("binds portable harness issuance to authenticated on-chain commitment", () => {
    vi.stubEnv("ABRAXAS_BLOCKCHAIN_NATIVE_PROTOTYPE", "1");
    const signingKey = blockchainNativeTestSigningKey("journey");
    const admin = Keypair.generate();

    const harness = runPartnerHarnessCase({
      partnerId: "partner-integration-821",
      policyId: "policy-age21-sandbox-821",
      policyVersion: 1,
      policyTemplateId: "wallet_control",
      scenarioId: "approved",
      signingKey,
      signingSource: "configured_issuer_key",
    });
    expect("ok" in harness && harness.ok === false).toBe(false);

    const issued = harnessIssuedReceiptFields(harness as PartnerHarnessCaseResult);
    expect(issued).not.toBeNull();

    const portable = portableFromHarness(harness as PartnerHarnessCaseResult);
    expect(portable.cryptographically_authentic).toBe(true);

    const chainEvidence = buildTestCommitmentChainEvidence({
      registryAdmin: admin,
      trustedIssuerPubkey: ed25519PublicKeyBytesFromJwk(signingKey.publicKeyJwk)!,
      partner_id: "partner-integration-821",
      policy_id: "policy-age21-sandbox-821",
      application_id: "wallet_control",
      receipt_id: issued!.receipt_id,
      payload_hash_hex: issued!.payload_hash,
    });

    const adapter = runBlockchainNativePrototypeHarness({
      partnerId: "partner-integration-821",
      policyId: "policy-age21-sandbox-821",
      policyVersion: 1,
      policyTemplateId: "wallet_control",
      scenarioId: "approved",
      executionNonce: 1n,
      signingKey,
      harnessResult: harness as PartnerHarnessCaseResult,
      chainEvidence,
      portableVerification: portable,
    });
    expect(adapter.ok).toBe(true);
    vi.unstubAllEnvs();
  });
});