// FILE: lib/operations/institutionalProof/referenceScenario.test.ts
// CI regression — institutional reusable-KYC reference proof.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { claimsSubjectKeyForAbraxasSubject, generateAbraxasSubjectId } from "@/lib/identity/subject/claimsSubjectKey";
import { MOCK_APPROVED_KYC_PROVIDER_ID } from "@/lib/identity/providerIngestion/mockProvider";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  REFERENCE_APPLICATION_A,
  REFERENCE_APPLICATION_B,
  REFERENCE_INSTITUTIONAL_PLATFORM,
  REFERENCE_POLICY_ID,
} from "./runReferenceScenario";
import { assembleInstitutionalEvidencePacket } from "./assembleEvidencePacket";
import { renderInstitutionalProofReport } from "./renderReport";
import { renderInstitutionalDiligenceSummary } from "./renderDiligenceSummary";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";

const TEST_SIGNING = generateTestSigningKeyPair();

const replayStore = new Map<string, string>();
const bindings = new Map<string, string>();
const identitySubjects = new Map<string, Record<string, unknown>>();
const claimsBySubject = new Map<string, CredentialClaimRecord[]>();
const decisionReceipts = new Map<string, DecisionReceiptRecord>();
const verificationDecisions = new Map<string, Record<string, unknown>>();
let lastClaimsSubjectKey: string | null = null;

function bindingKey(providerId: string, refHash: string) {
  return `${providerId}:${refHash}`;
}

function resolveQuery(table: string, filters: Record<string, string>) {
  if (table === "verification_decisions" && filters.subject_id) {
    const rows = [...verificationDecisions.entries()]
      .filter(([, row]) => row.subject_id === filters.subject_id)
      .map(([id]) => ({ id }));
    return { data: rows, error: null };
  }
  return null;
}

function makeSelectChain(table: string, filters: Record<string, string> = {}) {
  const chain: Record<string, unknown> = {
    eq(col: string, val: string) {
      return makeSelectChain(table, { ...filters, [col]: val });
    },
    is: () => makeSelectChain(table, filters),
    order: () => makeSelectChain(table, filters),
    limit: () => makeSelectChain(table, filters),
    in: (col: string, vals: string[]) => ({
      eq: () => ({
        order: () => ({
          limit: async () => {
            if (table === "decision_receipts") {
              const rows = [...decisionReceipts.values()].filter((r) =>
                vals.includes(r.verification_decision_id),
              );
              return { data: rows, error: null };
            }
            return { data: [], error: null };
          },
        }),
      }),
    }),
    maybeSingle: async () => {
      if (table === "identity_subjects") {
        const key = filters.claims_subject_key ?? filters.id ?? "";
        return { data: identitySubjects.get(key) ?? null, error: null };
      }
      if (table === "provider_subject_bindings") {
        const pk = bindingKey(filters.provider_id ?? "", filters.provider_subject_ref_hash ?? "");
        const subjectId = bindings.get(pk);
        return subjectId
          ? { data: { abraxas_subject_id: subjectId, status: "active" }, error: null }
          : { data: null, error: null };
      }
      if (table === "verification_decisions") {
        return { data: verificationDecisions.get(filters.id ?? "") ?? null, error: null };
      }
      if (table === "verification_requests") {
        return {
          data: {
            launchpad_application_id: filters.id?.includes("appb")
              ? REFERENCE_APPLICATION_B
              : REFERENCE_APPLICATION_A,
          },
          error: null,
        };
      }
      if (table === "decision_receipts") {
        const byId = decisionReceipts.get(filters.id ?? "");
        const byDecision = [...decisionReceipts.values()].find(
          (r) => r.verification_decision_id === filters.verification_decision_id,
        );
        return { data: byId ?? byDecision ?? null, error: null };
      }
      if (table === "wallet_bindings") {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
    single: async () => (makeSelectChain(table, filters) as { maybeSingle: () => Promise<unknown> }).maybeSingle(),
    then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
      const resolved = resolveQuery(table, filters);
      if (resolved) {
        return Promise.resolve(resolved).then(onFulfilled, onRejected);
      }
      return (chain.maybeSingle as () => Promise<unknown>)().then(onFulfilled, onRejected);
    },
  };
  return chain as ReturnType<typeof makeSelectChain>;
}

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name === "consume_provider_event_replay") {
        const key = `${args.p_provider_id}:${args.p_provider_event_id}`;
        if (replayStore.has(key)) {
          return {
            data: replayStore.get(key) === args.p_event_hash
              ? { ok: false, code: "duplicate" }
              : { ok: false, code: "conflict" },
            error: null,
          };
        }
        replayStore.set(key, args.p_event_hash as string);
        return { data: { ok: true, code: "consumed" }, error: null };
      }
      if (name === "replace_credential_claim_atomic") {
        return { data: { ok: true }, error: null };
      }
      return { data: { ok: true }, error: null };
    },
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        const p = (async () => {
          if (table === "identity_subjects") {
            identitySubjects.set(row.id as string, row);
            identitySubjects.set(row.claims_subject_key as string, row);
            return { data: row, error: null };
          }
          if (table === "provider_subject_bindings") {
            const pk = bindingKey(row.provider_id as string, row.provider_subject_ref_hash as string);
            if (bindings.has(pk)) return { data: null, error: { code: "23505" } };
            bindings.set(pk, row.abraxas_subject_id as string);
            return { data: row, error: null };
          }
          if (table === "decision_receipts") {
            const record = row as unknown as DecisionReceiptRecord;
            decisionReceipts.set(record.id, record);
            verificationDecisions.set(record.verification_decision_id, {
              decision: record.decision_result,
              claims_json: { identity_verified: true },
              subject_id: lastClaimsSubjectKey ?? "",
              request_id: record.verification_decision_id.includes("appb") ? "req_app_b" : "req_app_a",
            });
            return { data: record, error: null };
          }
          return { data: row, error: null };
        })();
        return Object.assign(p, { select: () => ({ single: () => p }) });
      },
      select: () => makeSelectChain(table),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) }),
    }),
  }),
  getSupabaseAdmin: () => null,
}));

vi.mock("@/lib/trust/resolveCanonicalIssuer", () => ({
  resolveCanonicalIssuer: async (id: string) => id === MOCK_APPROVED_KYC_PROVIDER_ID ? {
    id,
    issuer_status: "active",
    supported_claims: ["identity_verified"],
    metadata: { max_assurance: "L2", authorized_claims: ["identity_verified"], environment: "sandbox" },
  } : null,
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  upsertClaims: async (claims: Omit<CredentialClaimRecord, "id" | "status">[]) => {
    for (const c of claims) {
      lastClaimsSubjectKey = c.subject_id;
      const list = claimsBySubject.get(c.subject_id) ?? [];
      list.push({ ...c, id: `claim-${list.length}`, status: "active" });
      claimsBySubject.set(c.subject_id, list);
    }
  },
  getActiveClaims: async (subjectId: string) =>
    (claimsBySubject.get(subjectId) ?? []).filter((c) => c.status === "active"),
  updateClaimStatus: async (input: { claimId: string; status: string; reason?: string }) => {
    for (const [key, claims] of claimsBySubject.entries()) {
      const idx = claims.findIndex((c) => c.id === input.claimId);
      if (idx >= 0) {
        claims[idx] = {
          ...claims[idx],
          status: input.status as CredentialClaimRecord["status"],
          revocation_reference: input.reason ?? null,
        };
        claimsBySubject.set(key, claims);
      }
    }
  },
}));

vi.mock("@/lib/policy/getPolicy", () => ({
  getPartnerPolicy: vi.fn(async () => ({
    id: REFERENCE_POLICY_ID,
    partner_id: REFERENCE_INSTITUTIONAL_PLATFORM,
    version: 1,
    name: "Institutional Identity Verified Sandbox",
    rules_json: {
      required_claims: [{
        claim_type: "identity_verified",
        accepted_issuers: [MOCK_APPROVED_KYC_PROVIDER_ID],
        min_assurance: "L2",
      }],
      sandbox_only: true,
    },
    status: "active",
  })),
  getPartnerPolicyAtVersion: vi.fn(async () => ({
    id: REFERENCE_POLICY_ID,
    partner_id: REFERENCE_INSTITUTIONAL_PLATFORM,
    version: 1,
    name: "Institutional Identity Verified Sandbox",
    rules_json: {
      required_claims: [{
        claim_type: "identity_verified",
        accepted_issuers: [MOCK_APPROVED_KYC_PROVIDER_ID],
        min_assurance: "L2",
      }],
      sandbox_only: true,
    },
    status: "active",
  })),
}));

vi.mock("@/lib/trust/loadPolicyTrustContext", () => ({
  loadPolicyTrustContext: vi.fn(async () => ({
    partnerId: REFERENCE_INSTITUTIONAL_PLATFORM,
    policyId: REFERENCE_POLICY_ID,
    jurisdiction: "US",
    trustRulesByClaimType: new Map([[
      "identity_verified",
      { accepted_issuer_ids: [MOCK_APPROVED_KYC_PROVIDER_ID], minimum_assurance_level: "L2" },
    ]]),
  })),
}));

vi.mock("@/lib/decisionReceipts/verificationKeyLifecycle", () => ({
  resolveIssuanceSigningKey: () => ({
    ok: true,
    key_id: TEST_SIGNING.signingKeyId,
    privateKeyJwk: TEST_SIGNING.privateKeyJwk,
    publicKeyJwk: TEST_SIGNING.publicKeyJwk,
  }),
  verifyRecordSignatureWithRegistry: () => true,
}));

vi.mock("@/lib/decisionReceipts/dependencies", () => ({
  recordReceiptClaimDependencies: vi.fn(async () => {}),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(async () => {}),
}));

describe("institutional reusable-KYC reference proof", () => {
  beforeEach(() => {
    replayStore.clear();
    bindings.clear();
    identitySubjects.clear();
    claimsBySubject.clear();
    decisionReceipts.clear();
    verificationDecisions.clear();
    lastClaimsSubjectKey = null;
    process.env.PAIRWISE_SUBJECT_HMAC_KEY = "institutional-proof-test-key";
    process.env.PROVIDER_INGEST_TEST_SECRET = "provider-ingest-test-secret-do-not-use-in-production";

    verificationDecisions.set("00000000-0000-4000-8000-00000000appa", {
      decision: "approved",
      claims_json: { identity_verified: true },
      subject_id: "",
      request_id: "req_app_a",
    });
    verificationDecisions.set("00000000-0000-4000-8000-00000000appb", {
      decision: "approved",
      claims_json: { identity_verified: true },
      subject_id: "",
      request_id: "req_app_b",
    });
  });

  it("executes full reference scenario and produces evidence packet with gate A", async () => {
    const { runInstitutionalReferenceScenario } = await import("./runReferenceScenario");
    const scenario = await runInstitutionalReferenceScenario();

    if (scenario.internal_claims_key) {
      verificationDecisions.set("00000000-0000-4000-8000-00000000appa", {
        decision: "approved",
        claims_json: { identity_verified: true },
        subject_id: scenario.internal_claims_key,
        request_id: "req_app_a",
      });
      verificationDecisions.set("00000000-0000-4000-8000-00000000appb", {
        decision: "approved",
        claims_json: { identity_verified: true },
        subject_id: scenario.internal_claims_key,
        request_id: "req_app_b",
      });
    }

    expect(scenario.failed).toBe(false);
    expect(scenario.provider_verifications).toBe(1);
    expect(scenario.raw_kyc_recollections).toBe(0);
    expect(scenario.operator_touch_count).toBe(0);
    expect(scenario.application_a.pairwise_present).toBe(true);
    expect(scenario.application_b.pairwise_present).toBe(true);
    expect(scenario.cross_application_pairwise_distinct).toBe(true);
    expect(scenario.signed_narrow_pairwise_match).toBe(true);
    expect(scenario.reuse_before_revocation).toBe("reuse");
    expect(scenario.reuse_after_revocation).not.toBe("reuse");
    expect(scenario.same_source_evidence_internally).toBe(true);
    expect(scenario.revocation_event_authenticated).toBe(true);

    const packet = await assembleInstitutionalEvidencePacket({
      scenario,
      environment: "reference_test",
    });

    expect(packet.environment).toBe("reference_test");
    expect(packet.decision_gate).toBe("A");
    expect(packet.funnel.provider_verifications).toBe(1);
    expect(packet.funnel.reuse_count).toBeGreaterThanOrEqual(1);
    expect(packet.privacy.forbidden_field_count).toBe(0);
    expect(packet.pairwise.cross_application_pairwise_distinct).toBe(true);
    expect(packet.readiness.production_db_status).toBe("UNVERIFIED");
    expect(packet.operator_burden.operator_touch_count).toBe(0);
    expect(packet.security_failures.every((f) => f.passed)).toBe(true);

    const report = renderInstitutionalProofReport(packet);
    expect(report).toContain("reference harness");
    expect(report).not.toMatch(/bank-grade|certified|regulator-approved/i);

    const diligence = renderInstitutionalDiligenceSummary(packet);
    expect(diligence).toContain("Problem tested");
    expect(diligence).toContain("reference_test");

    expect(JSON.stringify(packet)).not.toContain(scenario.internal_abraxas_subject_id ?? "NEVER");
    expect(JSON.stringify(packet)).not.toContain(scenario.internal_claims_key ?? "NEVER");
  });

  it("documents all required funnel stages as observed", async () => {
    const { runInstitutionalReferenceScenario } = await import("./runReferenceScenario");
    const scenario = await runInstitutionalReferenceScenario();
    const observed = scenario.stages.filter((s) => s.status === "observed").map((s) => s.stage);
    for (const stage of [
      "provider_evidence_authenticated",
      "subject_bound",
      "claim_normalized",
      "application_a_verified",
      "reuse_available",
      "application_b_verified",
      "pairwise_isolation_verified",
      "revocation_received",
      "reuse_blocked_after_revocation",
    ]) {
      expect(observed, `missing stage ${stage}`).toContain(stage);
    }
  });
});
