// FILE: lib/decisionReceipts/v1_1_0/issuanceIntegrity.adversarial.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import nacl from "tweetnacl";
import {
  encodeReceiptV11Sidecar,
  decodeReceiptV11Sidecar,
  V1_1_SIDECAR_SCHEMA,
} from "@/lib/decisionReceipts/v1_1_0/sidecar";
import {
  projectOperationalReceiptForIndependentVerification,
  exportPortableEvidenceCommitmentManifest,
} from "@/lib/decisionReceipts/v1_1_0/independentProjection";
import {
  AuthoritativeIssuanceError,
  ReceiptCryptographicImmutabilityError,
  resolveAuthoritativeApplicationBindingRef,
  buildAuthoritativeV11IssuanceFields,
} from "@/lib/decisionReceipts/v1_1_0/authoritativeIssuance.server";
import {
  attemptResignPublishedReceipt,
  finalizePendingV11ReceiptCryptographic,
} from "@/lib/decisionReceipts/v1_1_0/finalizePending.server";
import { attachV11FieldsFromSidecar, buildSignedCanonicalV11 } from "@/lib/decisionReceipts/v1_1_0/canonicalIssuance";
import { signReceiptPayload } from "@/lib/decisionReceipts/signing";
import { verifyRecordSignatureWithRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import {
  blindEvidenceRef,
  deriveApplicationBindingRef,
  verifyEvidenceCommitment,
  buildEvidenceCommitment,
} from "@/lib/decisionReceipts/schema/v1_1_0";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { parseDecisionReceiptIssuanceSchemaFromEnv } from "@/lib/decisionReceipts/issuanceSchemaV110";
import { isReceiptIssuanceAuthorizable } from "@/lib/decisionReceipts/issuanceFinalization";
import { StagedIssuanceUnavailableError } from "@/lib/decisionReceipts/issuanceSchemaCapability";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";

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

const mockGetReceiptById = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => mockGetReceiptById(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      update: (...args: unknown[]) => mockUpdate(...args),
    }),
  }),
}));

const APP_ID = "00000000-0000-4000-8000-00000000app1";
const BINDING_SECRET = "test-binding-secret-844";
const BLINDING_KEY = "test-blinding-key-844";

function sidecar(phase: "pending" | "final", commitment = buildEvidenceCommitment([])) {
  return encodeReceiptV11Sidecar({
    schema: V1_1_SIDECAR_SCHEMA,
    issuance_phase: phase,
    application_binding_ref: "bind-ref",
    evidence_commitment: commitment,
    evidence_commitment_manifest: phase === "final" && commitment.entry_count > 0
      ? [{
          dependency_type: "reusable_fact",
          fact_id: blindEvidenceRef("00000000-0000-4000-8000-00000000fact", BLINDING_KEY),
          source_credential_id: blindEvidenceRef("dr_source", BLINDING_KEY),
        }]
      : phase === "final" ? [] : null,
  });
}

function baseRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  return {
    id: "dr_test",
    verification_decision_id: "00000000-0000-4000-8000-000000008844",
    consent_receipt_id: null,
    partner_id: "partner-844",
    policy_id: "policy-844",
    policy_version: 2,
    subject_pseudonym_id: "subj",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: null,
    revoked_at: null,
    status: "active",
    schema_version: "1.1.0",
    payload_hash: "abc",
    signature: "sig",
    signing_key_id: "key-1",
    anchor_reference: sidecar("final"),
    idempotency_key: null,
    created_at: "2026-06-01T12:00:00.000Z",
    issuance_finalized_at: "2026-06-01T12:00:01.000Z",
    ...overrides,
  };
}

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

describe("v1.1.0 issuance integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReceiptById.mockReset();
    delete process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY;
    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_PUBLIC_KEY;
    delete process.env.ABRAXAS_SIGNING_KEY_ID;
    process.env.DECISION_RECEIPT_APPLICATION_BINDING_SECRET = BINDING_SECRET;
    process.env.DECISION_RECEIPT_EVIDENCE_BLINDING_KEY = BLINDING_KEY;
  });

  it("defaults issuance schema to 1.0.0 (legacy compatibility)", () => {
    expect(parseDecisionReceiptIssuanceSchemaFromEnv({})).toBe("1.0.0");
    const payload = buildCanonicalPayload({
      receipt_id: "dr_legacy",
      decision_id: "00000000-0000-4000-8000-000000000001",
      policy_id: "p",
      policy_version: 1,
      partner_id: "partner",
      subject_pseudonym_id: "sub",
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-06-01T12:00:00.000Z",
      expires_at: null,
    });
    expect(payload.schema_version).toBe(DECISION_RECEIPT_SCHEMA_VERSION);
  });

  it("rejects pending receipts for independent verification projection", () => {
    const pending = baseRecord({
      status: "pending_finalization",
      issuance_finalized_at: null,
      anchor_reference: sidecar("pending"),
    });
    const projected = projectOperationalReceiptForIndependentVerification(pending);
    expect(projected.ok).toBe(false);
    if (!projected.ok) {
      expect(projected.reason).toBe("operational_pending_not_independently_verifiable");
    }
  });

  it("rejects malformed and missing sidecars", () => {
    const malformed = baseRecord({ anchor_reference: "not-a-sidecar" });
    expect(projectOperationalReceiptForIndependentVerification(malformed).ok).toBe(false);
    expect(decodeReceiptV11Sidecar("bad").ok).toBe(false);
  });

  it("requires application scope when applicationScopeRequired is true", async () => {
    await expect(resolveAuthoritativeApplicationBindingRef({
      partnerId: "partner-844",
      policyId: "policy-844",
      policyVersion: 2,
      decisionContext: "production",
      applicationId: null,
      applicationScopeRequired: true,
    })).rejects.toMatchObject({ code: "application_scope_required" });
  });

  it("exports portable manifest that reconstructs signed commitment", async () => {
    const commitment = buildEvidenceCommitment([{
      dependency_type: "reusable_fact",
      fact_id: blindEvidenceRef("00000000-0000-4000-8000-00000000fact", BLINDING_KEY),
      source_credential_id: blindEvidenceRef("dr_source", BLINDING_KEY),
    }]);
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "final",
      application_binding_ref: "bind",
      evidence_commitment: commitment,
      evidence_commitment_manifest: [{
        dependency_type: "reusable_fact",
        fact_id: blindEvidenceRef("00000000-0000-4000-8000-00000000fact", BLINDING_KEY),
        source_credential_id: blindEvidenceRef("dr_source", BLINDING_KEY),
      }],
    });
    const record = baseRecord({ anchor_reference: anchor });
    const exported = exportPortableEvidenceCommitmentManifest(record);
    expect(exported.ok).toBe(true);
    if (exported.ok) {
      expect(verifyEvidenceCommitment({
        commitment,
        manifest: exported.manifest,
      }).ok).toBe(true);
    }
  });

  it("detects evidence manifest tampering", () => {
    const commitment = buildEvidenceCommitment([]);
    const anchor = sidecar("final", commitment);
    const record = baseRecord({ anchor_reference: anchor });
    const exported = exportPortableEvidenceCommitmentManifest(record);
    expect(exported.ok).toBe(true);
    if (exported.ok) {
      const tampered = [...exported.manifest, {
        dependency_type: "reusable_fact" as const,
        fact_id: "deadbeef",
        source_credential_id: null,
      }];
      expect(verifyEvidenceCommitment({ commitment, manifest: tampered }).ok).toBe(false);
    }
  });

  it("refuses to re-sign active published receipts", async () => {
    mockGetReceiptById.mockResolvedValue(baseRecord({ status: "active" }));
    await expect(attemptResignPublishedReceipt({ receiptId: "dr_test" }))
      .rejects.toBeInstanceOf(ReceiptCryptographicImmutabilityError);
  });

  it("refuses to re-sign revoked receipts", async () => {
    mockGetReceiptById.mockResolvedValue(baseRecord({ status: "revoked", revoked_at: "2026-06-02T00:00:00.000Z" }));
    await expect(finalizePendingV11ReceiptCryptographic({
      receiptId: "dr_test",
      applicationId: APP_ID,
      applicationScopeRequired: true,
    })).rejects.toBeInstanceOf(ReceiptCryptographicImmutabilityError);
  });

  it("uses compare-and-swap on pending finalization only", async () => {
    const receiptKey = testKeyPair("receipt-key");
    process.env.ABRAXAS_SIGNING_KEY_ID = receiptKey.signingKeyId;
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(receiptKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(receiptKey.publicKeyJwk);
    process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY = JSON.stringify([{
      key_id: receiptKey.signingKeyId,
      algorithm: "Ed25519",
      environment: "demo",
      status: "active",
      not_before: "2020-01-01T00:00:00.000Z",
      expires_at: "2099-01-01T00:00:00.000Z",
      public_jwk: { kty: "OKP", crv: "Ed25519", x: receiptKey.publicKeyJwk.x },
      schema_versions: ["1.0.0", "1.1.0"],
      reason_class: "active",
    }]);

    const pendingAnchor = sidecar("pending");
    const pendingRecord = baseRecord({
      status: "pending_finalization",
      issuance_finalized_at: null,
      anchor_reference: pendingAnchor,
      signing_key_id: receiptKey.signingKeyId,
    });
    const signedPending = attachV11FieldsFromSidecar(pendingRecord);
    const { payload } = buildSignedCanonicalV11(signedPending);
    const { payloadHash, signature } = signReceiptPayload(
      payload as Parameters<typeof signReceiptPayload>[0],
      receiptKey.privateKeyJwk,
    );
    pendingRecord.payload_hash = payloadHash;
    pendingRecord.signature = signature;

    mockGetReceiptById.mockResolvedValue(pendingRecord);

    const chain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          ...pendingRecord,
          status: "active",
          issuance_finalized_at: "2026-06-01T12:00:01.000Z",
        },
        error: null,
      }),
    };
    mockUpdate.mockReturnValue(chain);

    await finalizePendingV11ReceiptCryptographic({
      receiptId: "dr_test",
      applicationId: APP_ID,
      applicationScopeRequired: true,
    });

    expect(chain.eq).toHaveBeenCalledWith("status", "pending_finalization");
    expect(chain.eq).toHaveBeenCalledWith("payload_hash", payloadHash);
  });

  it("fails closed when external anchor conflicts with v1.1 sidecar", async () => {
    await expect(buildAuthoritativeV11IssuanceFields({
      receiptId: "dr_x",
      partnerId: "partner-844",
      policyId: "policy-844",
      policyVersion: 2,
      decisionContext: "production",
      applicationId: null,
      applicationScopeRequired: false,
      issuancePhase: "final",
      externalAnchorReference: "solana:tx:abc123",
    })).rejects.toBeInstanceOf(AuthoritativeIssuanceError);
  });

  it("derives binding only from authoritative app scope", async () => {
    const ref = await resolveAuthoritativeApplicationBindingRef({
      partnerId: "partner-844",
      policyId: "policy-844",
      policyVersion: 2,
      decisionContext: "production",
      applicationId: APP_ID,
      applicationScopeRequired: true,
    });
    const expected = deriveApplicationBindingRef({
      partner_id: "partner-844",
      policy_id: "policy-844",
      policy_version: 2,
      decision_context: "production",
      launchpad_application_id: APP_ID,
    }, BINDING_SECRET);
    expect(ref).toBe(expected);
  });

  it("keeps failed pending receipts non-authorizable", () => {
    const pending = baseRecord({
      status: "pending_finalization",
      issuance_finalized_at: null,
      anchor_reference: sidecar("pending"),
    });
    expect(isReceiptIssuanceAuthorizable(pending)).toBe(false);
  });

  it("surfaces staged issuance unavailable on legacy schema (pre-151)", () => {
    expect(() => {
      throw new StagedIssuanceUnavailableError();
    }).toThrow(StagedIssuanceUnavailableError);
  });

  it("fails finalization when signing keys are unavailable", async () => {
    const savedKey = process.env.ABRAXAS_SIGNING_KEY;
    const savedRegistry = process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY;
    mockGetReceiptById.mockResolvedValue(baseRecord({
      status: "pending_finalization",
      issuance_finalized_at: null,
      anchor_reference: sidecar("pending"),
    }));
    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY;
    await expect(finalizePendingV11ReceiptCryptographic({
      receiptId: "dr_test",
      applicationId: APP_ID,
      applicationScopeRequired: true,
    })).rejects.toThrow(/receipt_signing_unavailable/);
    process.env.ABRAXAS_SIGNING_KEY = savedKey;
    process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY = savedRegistry;
  });

  it("verifies final v1.1 signature through registry after projection", () => {
    const receiptKey = testKeyPair("verify-key");
    process.env.ABRAXAS_SIGNING_KEY_ID = receiptKey.signingKeyId;
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(receiptKey.privateKeyJwk);
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(receiptKey.publicKeyJwk);
    process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY = JSON.stringify([{
      key_id: receiptKey.signingKeyId,
      algorithm: "Ed25519",
      environment: "demo",
      status: "active",
      not_before: "2020-01-01T00:00:00.000Z",
      expires_at: "2099-01-01T00:00:00.000Z",
      public_jwk: { kty: "OKP", crv: "Ed25519", x: receiptKey.publicKeyJwk.x },
      schema_versions: ["1.0.0", "1.1.0"],
      reason_class: "active",
    }]);

    const commitment = buildEvidenceCommitment([]);
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "final",
      application_binding_ref: null,
      evidence_commitment: commitment,
      evidence_commitment_manifest: [],
    });
    const record = attachV11FieldsFromSidecar(baseRecord({
      signing_key_id: receiptKey.signingKeyId,
      anchor_reference: anchor,
    }));
    const { payload } = buildSignedCanonicalV11(record);
    const signed = signReceiptPayload(payload as Parameters<typeof signReceiptPayload>[0], receiptKey.privateKeyJwk);
    const stored = baseRecord({
      signing_key_id: receiptKey.signingKeyId,
      anchor_reference: anchor,
      payload_hash: signed.payloadHash,
      signature: signed.signature,
    });
    expect(verifyRecordSignatureWithRegistry(stored)).toBe(true);
    const projected = projectOperationalReceiptForIndependentVerification(stored);
    expect(projected.ok).toBe(true);
  });
});
