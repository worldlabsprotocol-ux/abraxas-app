// FILE: lib/authenticationProof/e2eVerification.test.ts
// Strict end-to-end verification of proof issuance, lookup shape, and public-key verify.

import { describe, expect, it } from "vitest";
import { issueVerifyDecisionArtifacts } from "./issueVerifyDecision";
import { issueProductionReferenceProof } from "./productionReference";
import { verifyAuthenticationProofRecord } from "./verifyProof";
import { verifyAuthProofSignature } from "./signing";
import { buildAuthProofPayload } from "./issue";
import { signAuthProofPayload } from "./signing";
import { getVerificationLayerStatus } from "./verificationLayerStatus";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";

describe("e2e verification layer", () => {
  it("POST /api/credentials/verify shape — signed proof bundle on registry decision", async () => {
    const testKey = generateTestSigningKeyPair();
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(testKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(testKey.publicKeyJwk);

    const response = {
      decision: "denied" as const,
      status: "not_found" as const,
      assurance_level: 0,
      policy_id: "abraxas-verify-v1",
      policy_version: "2026-07-08",
      decision_reference: "abx-dec-e2e-denied-01",
      valid_until: null,
      record_id: "ABX-UNKNOWN-999",
      record_type: "registry_asset",
    };

    const artifacts = await issueVerifyDecisionArtifacts({
      partnerId: "e2e-test",
      response,
      mode: "registry",
    });

    expect(artifacts.proof_id).toMatch(/^aprx_/);
    expect(artifacts.verify_url).toContain(`/api/proof/${artifacts.proof_id}`);
    expect(artifacts.authentication_proof.signature).toBeTruthy();
    expect(artifacts.authentication_proof.anchor_status).toBe("signed");
    expect(artifacts.authentication_proof).toMatchObject({
      event_type: "credential_verify",
      record_id: response.decision_reference,
    });
    expect(artifacts.decision_receipt).toBeNull();

    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("GET /api/proof/[id] shape — signature_valid with public key only", () => {
    const testKey = generateTestSigningKeyPair();
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(testKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(testKey.publicKeyJwk);

    const payload = buildAuthProofPayload({
      eventType: "credential_verify",
      recordId: "abx-dec-pubkey-only",
      payloadHash: "a".repeat(64),
      proofId: "aprx_pubkeyonly01",
    });
    const signed = signAuthProofPayload(payload)!;

    delete process.env.ABRAXAS_SIGNING_KEY;

    expect(verifyAuthProofSignature(payload, signed.signature)).toBe(true);

    const verified = verifyAuthenticationProofRecord({
      id: payload.proof_id,
      event_type: "credential_verify",
      record_id: payload.record_id,
      payload_hash: payload.payload_hash,
      signature: signed.signature,
      signing_key_id: signed.signingKeyId,
      sui_tx_digest: null,
      sui_network: "devnet",
      anchor_status: "signed",
      explorer_url: null,
      issued_at: payload.issued_at,
      schema_version: payload.schema_version,
      network: "devnet",
      created_at: payload.issued_at,
      status: "active",
      asset_abx_id: "ABX-RE-HOSP-001",
      superseded_by: null,
    });

    expect(verified.signature_valid).toBe(true);
    expect(verified.public_key).toBeTruthy();
    expect(verified.anchor_status).toBe("signed");
    expect(verified.sui_tx_digest).toBeNull();

    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("production reference path — Cielo Sunrise issues verifiable proof bundle", async () => {
    const testKey = generateTestSigningKeyPair();
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(testKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(testKey.publicKeyJwk);

    const result = await issueProductionReferenceProof("ABX-RE-HOSP-001");

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.asset.abxId).toBe("ABX-RE-HOSP-001");
    expect(result.verify_response.proof_id).toMatch(/^aprx_/);
    expect(result.verify_response.authentication_proof.signature).toBeTruthy();
    expect(result.self_verified_proof?.signature_valid).toBe(true);
    expect(result.how_to_reproduce.path).toBe("/api/credentials/verify");

    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("readiness verification layer status reports honest signals", async () => {
    const status = await getVerificationLayerStatus();
    expect(status.items).toHaveLength(8);
    expect(status.items.map(i => i.id)).toEqual([
      "independent-biometric-idv",
      "credentials-verify",
      "proof-lookup",
      "sui-anchoring",
      "production-demo",
      "agent-readiness",
      "asset-monitoring",
      "e2e-loop",
    ]);
    expect(["live", "partial", "not_configured"]).toContain(status.items[0].status);
    expect(status.summary.length).toBeGreaterThan(10);
  });
});
