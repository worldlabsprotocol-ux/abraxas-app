// FILE: lib/authenticationProof/verifyProof.test.ts

import { describe, expect, it } from "vitest";
import { buildAuthProofPayload } from "./issue";
import { signAuthProofPayload } from "./signing";
import { verifyAuthenticationProofRecord } from "./verifyProof";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import type { AuthenticationProofRecord } from "./types";

describe("verifyAuthenticationProofRecord", () => {
  it("returns signature_valid true for correctly signed proof", () => {
    const testKey = generateTestSigningKeyPair();
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(testKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(testKey.publicKeyJwk);

    const payload = buildAuthProofPayload({
      eventType: "credential_verify",
      recordId: "abx-dec-test-1",
      payloadHash: "b".repeat(64),
      proofId: "aprx_verifytest01",
    });

    const signed = signAuthProofPayload(payload)!;
    const record: AuthenticationProofRecord = {
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
    };

    const verified = verifyAuthenticationProofRecord(record);
    expect(verified.signature_valid).toBe(true);
    expect(verified.public_key).toBeTruthy();
    expect(verified.anchor_status).toBe("signed");

    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });

  it("signature_valid after Postgres TIMESTAMPTZ roundtrip (+00:00 vs Z)", () => {
    const testKey = generateTestSigningKeyPair();
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(testKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(testKey.publicKeyJwk);

    const payload = buildAuthProofPayload({
      eventType: "credential_verify",
      recordId: "abx-dec-pg-roundtrip",
      payloadHash: "c".repeat(64),
      proofId: "aprx_pgroundtrip01",
    });
    const signed = signAuthProofPayload(payload)!;
    const pgIssuedAt = payload.issued_at.replace("Z", "+00:00");

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
      issued_at: pgIssuedAt,
      schema_version: payload.schema_version,
      network: "devnet",
      created_at: pgIssuedAt,
      status: "active",
      asset_abx_id: null,
      superseded_by: null,
    });

    expect(verified.signature_valid).toBe(true);

    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
  });
});
