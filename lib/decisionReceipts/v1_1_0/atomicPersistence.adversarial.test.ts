// FILE: lib/decisionReceipts/v1_1_0/atomicPersistence.adversarial.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import nacl from "tweetnacl";
import {
  assertAtomicFinalizationWritePayload,
} from "@/lib/decisionReceipts/v1_1_0/persistenceState";
import { parseV11DedicatedPersistenceFromEnv } from "@/lib/decisionReceipts/v1_1_0/v11PersistenceCapability";
import { planV11DedicatedBackfillFromRows } from "@/lib/decisionReceipts/v1_1_0/backfillPlan.server";
import {
  encodeReceiptV11Sidecar,
  V1_1_SIDECAR_SCHEMA,
} from "@/lib/decisionReceipts/v1_1_0/sidecar";
import { buildEvidenceCommitment } from "@/lib/decisionReceipts/schema/v1_1_0.server";
import { EVIDENCE_COMMITMENT_SCHEMA } from "@/lib/decisionReceipts/schema/v1_1_0.constants";
import { finalizePendingV11ReceiptCryptographic } from "@/lib/decisionReceipts/v1_1_0/finalizePending.server";
import { isReceiptIssuanceAuthorizable } from "@/lib/decisionReceipts/issuanceFinalization";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { ReceiptCryptographicImmutabilityError } from "@/lib/decisionReceipts/v1_1_0/authoritativeIssuance.server";

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
      receipt_id: "dr_atomic",
      fact_id: "00000000-0000-4000-8000-00000000fact",
      source_credential_id: "dr_source",
      dependency_type: "reusable_fact" as const,
      created_at: "2026-06-01T00:00:00.000Z",
    },
  ]),
}));

const mockGetReceiptById = vi.fn();
const mockUpdate = vi.fn();
const mockRpc = vi.fn();
const mockCapability = vi.fn();

vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => mockGetReceiptById(...args),
}));

vi.mock("@/lib/decisionReceipts/v1_1_0/v11PersistenceCapability.server", () => ({
  resolveV11PersistenceCapability: (...args: unknown[]) => mockCapability(...args),
  resetV11PersistenceCapabilityCache: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      update: (...args: unknown[]) => mockUpdate(...args),
    }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

const APP_ID = "00000000-0000-4000-8000-00000000app1";
const BINDING_SECRET = "test-binding-secret-847";
const BLINDING_KEY = "test-blinding-key-847";

function pendingRecord(): DecisionReceiptRecord {
  const commitment = buildEvidenceCommitment([]);
  const anchor = encodeReceiptV11Sidecar({
    schema: V1_1_SIDECAR_SCHEMA,
    issuance_phase: "pending",
    application_binding_ref: null,
    evidence_commitment: commitment,
    evidence_commitment_manifest: null,
  });
  return {
    id: "dr_atomic",
    verification_decision_id: "00000000-0000-4000-8000-000000008847",
    consent_receipt_id: null,
    partner_id: "partner",
    policy_id: "policy",
    policy_version: 1,
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
    status: "pending_finalization",
    schema_version: "1.1.0",
    payload_hash: "provisional-hash",
    signature: "provisional-sig",
    signing_key_id: "test-key",
    anchor_reference: anchor,
    idempotency_key: null,
    created_at: "2026-06-01T12:00:00.000Z",
    issuance_finalized_at: null,
  };
}

describe("Build #847 atomic v1.1.0 persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DECISION_RECEIPT_APPLICATION_BINDING_SECRET = BINDING_SECRET;
    process.env.DECISION_RECEIPT_EVIDENCE_BLINDING_KEY = BLINDING_KEY;
    const kp = nacl.sign.keyPair();
    process.env.ABRAXAS_SIGNING_KEY_ID = "847-key";
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify({
      kty: "OKP",
      crv: "Ed25519",
      x: Buffer.from(kp.publicKey).toString("base64url"),
      d: Buffer.from(kp.secretKey.slice(0, 32)).toString("base64url"),
    });
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify({
      kty: "OKP",
      crv: "Ed25519",
      x: Buffer.from(kp.publicKey).toString("base64url"),
    });
    process.env.ABRAXAS_RECEIPT_KEY_ENVIRONMENT = "demo";
    process.env.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY = JSON.stringify([{
      key_id: "847-key",
      algorithm: "Ed25519",
      environment: "demo",
      status: "active",
      issued_at: "2020-01-01T00:00:00.000Z",
      not_before: "2020-01-01T00:00:00.000Z",
      expires_at: "2099-01-01T00:00:00.000Z",
      public_jwk: { kty: "OKP", crv: "Ed25519", x: Buffer.from(kp.publicKey).toString("base64url") },
      schema_versions: ["1.0.0", "1.1.0"],
      allow_historical_verification: false,
      historical_verify_until: null,
      issuer_label: "Test",
      reason_class: "rotation",
    }]);
    mockCapability.mockResolvedValue({
      dedicatedMode: "legacy",
      dedicatedColumnsEnabled: false,
      atomicFinalizeEnabled: false,
    });
  });

  it("atomic finalize env gate requires founder authorization", () => {
    expect(parseV11DedicatedPersistenceFromEnv({
      DECISION_RECEIPT_V11_DEDICATED_PERSISTENCE: "v152",
    })?.atomicFinalizeEnabled).toBe(false);
    expect(parseV11DedicatedPersistenceFromEnv({
      DECISION_RECEIPT_V11_DEDICATED_PERSISTENCE: "v152",
      DECISION_RECEIPT_V11_ATOMIC_FINALIZE: "authorized",
    })?.atomicFinalizeEnabled).toBe(true);
  });

  it("incomplete pending receipts are not authorizable (no billable incomplete issuance)", () => {
    expect(isReceiptIssuanceAuthorizable(pendingRecord())).toBe(false);
  });

  it("legacy finalize path uses optimistic concurrency on provisional hash", async () => {
    mockGetReceiptById.mockResolvedValue(pendingRecord());
    const updateChain = {
      eq: vi.fn(() => updateChain),
      select: vi.fn(() => updateChain),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          ...pendingRecord(),
          status: "active",
          issuance_finalized_at: "2026-06-01T12:00:01.000Z",
        },
        error: null,
      }),
    };
    mockUpdate.mockReturnValue(updateChain);
    const result = await finalizePendingV11ReceiptCryptographic({
      receiptId: "dr_atomic",
      applicationId: APP_ID,
      applicationScopeRequired: true,
    });
    expect(result.status).toBe("active");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("finalizes a reusable receipt from evidence locked in the same PostgreSQL transaction", async () => {
    const previousBackend = process.env.ABRAXAS_PERSISTENCE_BACKEND;
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    const queries: string[] = [];
    const transaction = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes("from public.decision_receipts r")) {
          return { rows: [{ receipt: pendingRecord() }] };
        }
        if (sql.includes("from public.decision_receipt_evidence_dependencies")) {
          return { rows: [{ dependency_type: "reusable_fact", fact_id: "fact-1", source_credential_id: "dr_source" }] };
        }
        if (sql.includes("information_schema.columns")) return { rows: [] };
        if (sql.includes("update public.decision_receipts")) {
          return { rows: [{ receipt: { ...pendingRecord(), status: "active", issuance_finalized_at: new Date().toISOString() } }] };
        }
        throw new Error("unexpected_sql");
      }),
    };
    try {
      const result = await finalizePendingV11ReceiptCryptographic({
        receiptId: "dr_atomic", applicationId: APP_ID,
        applicationScopeRequired: true, transaction,
      });
      expect(result.status).toBe("active");
      expect(queries.findIndex((sql) => sql.includes("decision_receipt_evidence_dependencies")))
        .toBeLessThan(queries.findIndex((sql) => sql.includes("update public.decision_receipts")));
      expect(mockGetReceiptById).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    } finally {
      if (previousBackend === undefined) delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
      else process.env.ABRAXAS_PERSISTENCE_BACKEND = previousBackend;
    }
  });

  it("atomic path calls RPC with full dedicated field set when authorized", async () => {
    mockCapability.mockResolvedValue({
      dedicatedMode: "v152",
      dedicatedColumnsEnabled: true,
      atomicFinalizeEnabled: true,
    });
    mockGetReceiptById.mockResolvedValue(pendingRecord());
    const finalizedRow = {
      ...pendingRecord(),
      status: "active",
      v11_issuance_phase: "final",
      evidence_commitment: { schema: EVIDENCE_COMMITMENT_SCHEMA, digest: "x", entry_count: 0 },
      evidence_commitment_manifest: [],
    };
    mockRpc.mockResolvedValue({
      data: { ok: true, code: "finalized", row: finalizedRow },
      error: null,
    });
    const result = await finalizePendingV11ReceiptCryptographic({
      receiptId: "dr_atomic",
      applicationId: APP_ID,
      applicationScopeRequired: true,
    });
    expect(mockRpc).toHaveBeenCalledWith(
      "abraxas_finalize_v11_receipt_atomic",
      expect.objectContaining({
        p_receipt_id: "dr_atomic",
        p_expected_payload_hash: "provisional-hash",
        p_v11_issuance_phase: "final",
      }),
    );
    expect(result.status).toBe("active");
  });

  it("refuses to resign active receipts", async () => {
    mockGetReceiptById.mockResolvedValue({
      ...pendingRecord(),
      status: "active",
      issuance_finalized_at: "2026-06-01T00:00:00.000Z",
    });
    await expect(finalizePendingV11ReceiptCryptographic({
      receiptId: "dr_atomic",
      applicationId: APP_ID,
      applicationScopeRequired: true,
    })).rejects.toBeInstanceOf(ReceiptCryptographicImmutabilityError);
  });

  it("backfill plan classifies sidecar-only final receipts as eligible", () => {
    const commitment = buildEvidenceCommitment([]);
    const anchor = encodeReceiptV11Sidecar({
      schema: V1_1_SIDECAR_SCHEMA,
      issuance_phase: "final",
      application_binding_ref: null,
      evidence_commitment: commitment,
      evidence_commitment_manifest: [],
    });
    const plan = planV11DedicatedBackfillFromRows([{
      id: "dr_backfill",
      schema_version: "1.1.0",
      status: "active",
      anchor_reference: anchor,
    }]);
    expect(plan.eligible).toBe(1);
    expect(plan.conflict).toBe(0);
  });

  it("assertAtomicFinalizationWritePayload rejects partial crypto", () => {
    expect(() => assertAtomicFinalizationWritePayload({
      payload_hash: "",
      signature: "s",
      anchor_reference: "a",
      application_binding_ref: null,
      evidence_commitment: { schema: EVIDENCE_COMMITMENT_SCHEMA, digest: "d", entry_count: 0 },
      evidence_commitment_manifest: [],
      issuance_finalized_at: "2026-01-01T00:00:00.000Z",
      v11_issuance_phase: "final",
    })).toThrow(/crypto/);
  });
});
