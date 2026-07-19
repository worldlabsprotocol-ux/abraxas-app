// FILE: lib/authenticationProof/issueVerifyDecision.test.ts

import { describe, expect, it } from "vitest";
import { issueVerifyDecisionArtifacts } from "./issueVerifyDecision";
import { verifyAuthenticationProofRecord } from "./verifyProof";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";

describe("issueVerifyDecisionArtifacts", () => {
  it("issues signed credential_verify proof for registry decision", async () => {
    const testKey = generateTestSigningKeyPair();
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(testKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(testKey.publicKeyJwk);

    const response = {
      decision: "approved" as const,
      status: "active" as const,
      assurance_level: 3,
      policy_id: "abraxas-verify-v1",
      policy_version: "2026-07-08",
      decision_reference: "abx-dec-test-registry-01",
      valid_until: null,
      record_id: "ABX-RE-HOSP-001",
      record_type: "registry_asset",
      verified: true,
    };

    const artifacts = await issueVerifyDecisionArtifacts({
      partnerId: "test-partner",
      response,
      mode: "registry",
    });

    expect(artifacts.proof_id).toMatch(/^aprx_/);
    expect(artifacts.verify_url).toBe(`/api/proof/${artifacts.proof_id}`);
    expect(artifacts.authentication_proof.event_type).toBe("credential_verify");
    expect(artifacts.authentication_proof.signature).toBeTruthy();

    const verified = verifyAuthenticationProofRecord({
      id: artifacts.proof_id,
      event_type: artifacts.authentication_proof.event_type,
      record_id: artifacts.authentication_proof.record_id,
      payload_hash: artifacts.authentication_proof.payload_hash,
      signature: artifacts.authentication_proof.signature,
      signing_key_id: artifacts.authentication_proof.signing_key_id,
      sui_tx_digest: null,
      sui_network: artifacts.authentication_proof.network,
      anchor_status: artifacts.authentication_proof.anchor_status,
      explorer_url: null,
      issued_at: artifacts.authentication_proof.issued_at,
      schema_version: "1.0.0",
      network: artifacts.authentication_proof.network,
      created_at: artifacts.authentication_proof.issued_at,
      status: "active",
      asset_abx_id: "ABX-RE-HOSP-001",
      superseded_by: null,
    });

    expect(verified.signature_valid).toBe(true);

    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });
});
