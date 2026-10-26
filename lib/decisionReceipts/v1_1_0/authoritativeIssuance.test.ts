// FILE: lib/decisionReceipts/v1_1_0/authoritativeIssuance.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import nacl from "tweetnacl";
import {
  parseDecisionReceiptIssuanceSchemaFromEnv,
} from "@/lib/decisionReceipts/issuanceSchemaV110";
import { encodeReceiptV11Sidecar, decodeReceiptV11Sidecar } from "@/lib/decisionReceipts/v1_1_0/sidecar";
import {
  buildAuthoritativeV11IssuanceFields,
  resolveAuthoritativeApplicationBindingRef,
} from "@/lib/decisionReceipts/v1_1_0/authoritativeIssuance.server";
import { buildSignedCanonicalV11 } from "@/lib/decisionReceipts/v1_1_0/canonicalIssuance";
import { signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { verifyRecordSignatureWithRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import {
  deriveApplicationBindingRef,
  blindEvidenceRef,
  verifyEvidenceCommitment,
} from "@/lib/decisionReceipts/schema/v1_1_0";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { mapReceiptRow } from "@/lib/decisionReceipts/mapReceiptRow";

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationForPartner: vi.fn(async (appId: string, partnerId: string) => ({
    id: appId,
    partner_id: partnerId,
    status: "active",
  })),
}));

vi.mock("@/lib/decisionReceipts/evidenceDependencies", () => ({
  getReceiptEvidenceDependencies: vi.fn(async () => [
    {
      id: "dep-1",
      receipt_id: "dr_test",
      fact_id: "00000000-0000-4000-8000-00000000fact",
      source_credential_id: "dr_source",
      dependency_type: "reusable_fact" as const,
      created_at: "2026-06-01T00:00:00.000Z",
    },
  ]),
}));

const APP_ID = "00000000-0000-4000-8000-00000000app1";
const BINDING_SECRET = "test-binding-secret-844";
const BLINDING_KEY = "test-blinding-key-844";

function testKeyPair(label: string) {
  const kp = nacl.sign.keyPair();
  const privateKeyJwk: JsonWebKey = {
    kty: "OKP",
    crv: "Ed25519",
    x: Buffer.from(kp.publicKey).toString("base64url"),
    d: Buffer.from(kp.secretKey.slice(0, 32)).toString("base64url"),
  };
  const publicKeyJwk: JsonWebKey = { kty: "OKP", crv: "Ed25519", x: privateKeyJwk.x! };
  return { label, privateKeyJwk, publicKeyJwk, signingKeyId: label };
}

describe("v1.1.0 issuance schema gate", () => {
  it("defaults to 1.0.0 when env unset", () => {
    expect(parseDecisionReceiptIssuanceSchemaFromEnv({})).toBe("1.0.0");
  });

  it("enables 1.1.0 only when explicitly configured", () => {
    expect(parseDecisionReceiptIssuanceSchemaFromEnv({ DECISION_RECEIPT_ISSUANCE_SCHEMA: "1.1.0" })).toBe("1.1.0");
  });
});

describe("v1.1.0 sidecar persistence", () => {
  it("round-trips binding and commitment without migration columns", () => {
    const encoded = encodeReceiptV11Sidecar({
      application_binding_ref: "ref-abc",
      evidence_commitment: {
        schema: "abraxas.evidence_commitment/v1",
        digest: "a".repeat(64),
        entry_count: 1,
      },
    });
    const decoded = decodeReceiptV11Sidecar(encoded);
    expect(decoded?.application_binding_ref).toBe("ref-abc");
    expect(decoded?.evidence_commitment?.entry_count).toBe(1);
  });

  it("mapReceiptRow hydrates v1.1 fields from sidecar", () => {
    const sidecar = encodeReceiptV11Sidecar({
      application_binding_ref: "bound",
      evidence_commitment: null,
    });
    const mapped = mapReceiptRow({
      id: "dr_1",
      verification_decision_id: "d1",
      consent_receipt_id: null,
      partner_id: "p",
      policy_id: "pol",
      policy_version: 1,
      subject_pseudonym_id: "sub",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
      revoked_at: null,
      status: "active",
      schema_version: "1.1.0",
      payload_hash: "h",
      signature: "s",
      signing_key_id: "k",
      anchor_reference: sidecar,
      idempotency_key: null,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    expect(mapped.application_binding_ref).toBe("bound");
  });
});

describe("authoritative v1.1.0 issuance + independent verification", () => {
  const env = {
    DECISION_RECEIPT_APPLICATION_BINDING_SECRET: BINDING_SECRET,
    DECISION_RECEIPT_EVIDENCE_BLINDING_KEY: BLINDING_KEY,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives application binding from authoritative app scope only", async () => {
    const ref = await resolveAuthoritativeApplicationBindingRef({
      partnerId: "partner-844",
      policyId: "policy-844",
      policyVersion: 2,
      decisionContext: "production",
      applicationId: APP_ID,
      env,
    });
    const expected = deriveApplicationBindingRef(
      {
        partner_id: "partner-844",
        policy_id: "policy-844",
        policy_version: 2,
        decision_context: "production",
        launchpad_application_id: APP_ID,
      },
      BINDING_SECRET,
    );
    expect(ref).toBe(expected);
  });

  it("signs authoritative binding and evidence commitment verifiable without client-supplied refs", async () => {
    const receiptKey = testKeyPair("receipt-key-844");
    const priorRegistry = process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY;
    process.env.ABRAXAS_SIGNING_KEY_ID = receiptKey.signingKeyId;
    process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY = JSON.stringify([{
      key_id: receiptKey.signingKeyId,
      algorithm: "Ed25519",
      environment: "demo",
      status: "active",
      not_before: "2020-01-01T00:00:00.000Z",
      expires_at: "2099-01-01T00:00:00.000Z",
      public_jwk: { kty: "OKP", crv: "Ed25519", x: receiptKey.publicKeyJwk.x },
      schema_versions: ["1.0.0", "1.1.0"],
      allow_historical_verification: false,
      historical_verify_until: null,
      reason_class: "active",
      issuer_label: "Abraxas",
    }]);
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(receiptKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(receiptKey.publicKeyJwk);

    const v11 = await buildAuthoritativeV11IssuanceFields({
      receiptId: "dr_v110_issuance",
      partnerId: "partner-844",
      policyId: "policy-844",
      policyVersion: 2,
      decisionContext: "production",
      applicationId: APP_ID,
      pendingEvidenceFinalization: false,
      externalAnchorReference: null,
      env,
    });

    const record: DecisionReceiptRecord = {
      id: "dr_v110_issuance",
      verification_decision_id: "00000000-0000-4000-8000-000000008844",
      consent_receipt_id: null,
      partner_id: "partner-844",
      policy_id: "policy-844",
      policy_version: 2,
      subject_pseudonym_id: "subj-844",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: ["ok"],
      evaluated_claim_refs: [{
        claim_id: "claim-1",
        claim_type: "age21",
        issuer_id: "issuer:test",
        status: "active",
        issued_at: "2026-06-01T00:00:00.000Z",
        expires_at: null,
      }],
      issuer_refs: ["issuer:test"],
      decision_context: "production",
      evaluated_at: "2026-06-01T12:00:00.000Z",
      expires_at: "2027-06-01T12:00:00.000Z",
      revoked_at: null,
      status: "active",
      schema_version: "1.1.0",
      payload_hash: "",
      signature: "",
      signing_key_id: receiptKey.signingKeyId,
      anchor_reference: v11.anchor_reference,
      idempotency_key: null,
      created_at: "2026-06-01T12:00:00.000Z",
      application_binding_ref: v11.application_binding_ref,
      evidence_commitment: v11.evidence_commitment,
    };

    const { payload } = buildSignedCanonicalV11(record);
    const signed = signReceiptPayload(payload as Parameters<typeof signReceiptPayload>[0], receiptKey.privateKeyJwk);
    record.payload_hash = signed.payloadHash;
    record.signature = signed.signature;

    const manifest = [{
      dependency_type: "reusable_fact" as const,
      fact_id: blindEvidenceRef("00000000-0000-4000-8000-00000000fact", BLINDING_KEY),
      source_credential_id: blindEvidenceRef("dr_source", BLINDING_KEY),
    }];

    expect(verifyRecordSignatureWithRegistry(record)).toBe(true);
    expect(verifyEvidenceCommitment({
      commitment: v11.evidence_commitment,
      manifest,
    }).ok).toBe(true);
    expect(v11.application_binding_ref).toBeTruthy();

    process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY = priorRegistry;
  });
});
