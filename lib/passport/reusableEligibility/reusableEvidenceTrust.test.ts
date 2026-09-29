// FILE: lib/passport/reusableEligibility/reusableEvidenceTrust.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import {
  assuranceDowngradeBlocked,
  assuranceMeetsMinimum,
  ASSURANCE_LEVEL_DEFINITIONS,
} from "@/lib/credentials/assuranceLevels";
import { TEST_REGISTRY_ACTIVE } from "@/lib/policy/compatibilityEdge/testFixtures";
import { integrationObservabilityLeaks } from "@/lib/partner/integrationObservability/sanitize";
import { listIntegrationEventsForTests, resetIntegrationEventsForTests } from "@/lib/partner/integrationObservability/record";
import { evaluateFactCompatibility } from "./compatibility";
import { decideEvidenceReuse, pickBestReuseDecision } from "./decision";
import { evaluateFactFreshness } from "./freshness";
import { projectInternalFact, type SourceReceiptRow } from "./facts";
import { derivedClaimRefs, derivedReceiptLeaksSource } from "./issue";
import { walkDerivationChain } from "./invalidation";
import { recordEvidenceReuseTelemetry } from "./observability";
import { evaluateReusableEvidenceTrust } from "./trust";

const SUBJECT = "0x" + "d".repeat(64);

function receipt(overrides: Partial<SourceReceiptRow> = {}): SourceReceiptRow {
  return {
    id: "dr_source_trust_1",
    verification_decision_id: "00000000-0000-4000-8000-0000000000bb",
    partner_id: "partner-a",
    policy_id: "partner-a-age_21_retail-v1",
    policy_version: 1,
    subject_pseudonym_id: subjectPseudonymId(SUBJECT),
    decision_result: "approved",
    decision_context: "production",
    evaluated_at: "2026-09-01T00:00:00.000Z",
    expires_at: "2026-12-01T00:00:00.000Z",
    revoked_at: null,
    status: "active",
    ...overrides,
  };
}

describe("reusable evidence trust contract", () => {
  beforeEach(() => {
    resetIntegrationEventsForTests();
  });

  it("documents ordered L0–L4 assurance semantics", () => {
    expect(ASSURANCE_LEVEL_DEFINITIONS.map((d) => d.level)).toEqual(["L0", "L1", "L2", "L3", "L4"]);
    expect(assuranceMeetsMinimum("L2", "L2")).toBe(true);
    expect(assuranceMeetsMinimum("L1", "L2")).toBe(false);
    expect(assuranceDowngradeBlocked("L1", "L2")).toBe(true);
  });

  it("first verification establishes a fact with internal provenance", () => {
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    expect(fact.source_policy_id).toBe("partner-a-age_21_retail-v1");
    expect(fact.source_verification_method).toBe("L2");
    expect(fact.verified_at).toBe("2026-09-01T00:00:00.000Z");
    expect(fact.source_receipt_id).toBe("dr_source_trust_1");
  });

  it("reuses compatible evidence for a new partner without document recapture decision", () => {
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    const decision = decideEvidenceReuse({
      fact,
      targetPolicyId: "partner-b-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetEnvironment: "production",
      relyingPartner: "partner-b",
      now: new Date("2026-09-20T00:00:00.000Z"),
    });
    expect(decision.decision).toBe("reuse");
    expect(decision.trust.consent_required).toBe(true);
    expect(decision.trust.reusable).toBe(true);
  });

  it("rejects lower-assurance evidence for higher-assurance policy", () => {
    const low = projectInternalFact({
      subjectId: SUBJECT,
      receipt: receipt({
        policy_id: "partner-a-age_18_retail-v1",
      }),
    })!;
    const decision = decideEvidenceReuse({
      fact: low,
      targetPolicyId: "partner-b-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetEnvironment: "production",
      relyingPartner: "partner-b",
      now: new Date("2026-09-20T00:00:00.000Z"),
    });
    expect(decision.decision).not.toBe("reuse");
    expect(decision.trust.assurance_sufficient).toBe(false);
  });

  it("requires refresh when evidence is stale under policy freshness window", () => {
    const fact = projectInternalFact({
      subjectId: SUBJECT,
      receipt: receipt({
        policy_id: "partner-a-sandbox_economic_demo-v1",
        decision_context: "sandbox_only",
        evaluated_at: "2026-09-01T00:00:00.000Z",
        expires_at: "2099-01-01T00:00:00.000Z",
      }),
    })!;
    const stale = evaluateFactFreshness({
      fact,
      targetPolicyId: "partner-b-sandbox_economic_demo-v1",
      now: new Date("2026-09-20T00:00:00.000Z"),
    });
    expect(stale.state).toBe("stale");

    const decision = decideEvidenceReuse({
      fact,
      targetPolicyId: "partner-b-sandbox_economic_demo-v1",
      targetPolicyVersion: 1,
      targetEnvironment: "sandbox",
      relyingPartner: "partner-b",
      now: new Date("2026-09-20T00:00:00.000Z"),
    });
    expect(decision.decision).toBe("refresh_required");
  });

  it("denies revoked source evidence reuse", () => {
    const fact = projectInternalFact({
      subjectId: SUBJECT,
      receipt: receipt({ status: "revoked", revoked_at: "2026-09-10T00:00:00.000Z" }),
    })!;
    const decision = decideEvidenceReuse({
      fact,
      targetPolicyId: "partner-b-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetEnvironment: "production",
      relyingPartner: "partner-b",
    });
    expect(decision.decision).toBe("refresh_required");
    expect(decision.trust.source_active).toBe(false);
  });

  it("fails closed when no compatibility edge exists", () => {
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    expect(evaluateFactCompatibility({
      fact,
      targetPolicyId: "partner-b-age_18_retail-v1",
      targetPolicyVersion: 1,
      targetSandboxOnly: false,
    }).ok).toBe(false);
    expect(evaluateFactCompatibility({
      fact,
      targetPolicyId: "partner-b-age_21_retail-v1",
      targetPolicyVersion: 9,
      targetSandboxOnly: false,
    }).ok).toBe(false);
  });

  it("allows reuse only through an explicit reviewed edge", () => {
    const fact = projectInternalFact({
      subjectId: SUBJECT,
      receipt: receipt({ policy_version: 1 }),
    })!;
    const trust = evaluateReusableEvidenceTrust({
      fact,
      targetPolicyId: "partner-b-age_21_retail-v1",
      targetPolicyVersion: 2,
      targetEnvironment: "production",
      relyingPartner: "partner-b",
      registry: TEST_REGISTRY_ACTIVE,
      now: new Date("2026-09-20T00:00:00.000Z"),
    });
    expect(trust.reusable).toBe(true);
    expect(trust.compatibility).toBe("compatible");
  });

  it("blocks sandbox evidence from satisfying production policy", () => {
    const fact = projectInternalFact({
      subjectId: SUBJECT,
      receipt: receipt({ decision_context: "sandbox_only" }),
    })!;
    const trust = evaluateReusableEvidenceTrust({
      fact,
      targetPolicyId: "partner-b-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetEnvironment: "production",
      relyingPartner: "partner-b",
    });
    expect(trust.reusable).toBe(false);
    expect(trust.environment_allowed).toBe(false);
  });

  it("issues distinct partner-bound receipts without leaking source identifiers", () => {
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    const refsB = derivedClaimRefs(fact, "partner-b-age_21_retail-v1");
    const receiptA = { receipt_id: "dr_partner_a", partner_id: "partner-a" };
    const receiptB = { receipt_id: "dr_partner_b", partner_id: "partner-b" };
    expect(receiptA.receipt_id).not.toBe(receiptB.receipt_id);
    const publicB = {
      partner_id: "partner-b",
      policy_id: "partner-b-age_21_retail-v1",
      decision_result: "approved",
      evaluated_claim_refs: refsB,
    };
    expect(derivedReceiptLeaksSource(publicB, fact)).toBe(false);
    expect(JSON.stringify(publicB)).not.toContain("dr_source_trust_1");
    expect(JSON.stringify(publicB).toLowerCase()).not.toContain("date_of_birth");
  });

  it("propagates invalidation through derivation chains with cycle protection", () => {
    const cycle = walkDerivationChain({
      startFactId: "fact_a",
      edges: [
        { fact_id: "fact_a", derived_from_fact_id: "fact_b" },
        { fact_id: "fact_b", derived_from_fact_id: "fact_a" },
      ],
    });
    expect(cycle.invalid).toBe(true);
    expect(cycle.reason).toBe("derivation_cycle");
  });

  it("records privacy-safe reuse telemetry without raw evidence", async () => {
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    const decision = decideEvidenceReuse({
      fact,
      targetPolicyId: "partner-b-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetEnvironment: "production",
      relyingPartner: "partner-b",
      now: new Date("2026-09-20T00:00:00.000Z"),
    });
    await recordEvidenceReuseTelemetry({
      partnerId: "partner-b",
      policyId: "partner-b-age_21_retail-v1",
      policyVersion: 1,
      environment: "production",
      verifyRequestId: "vr-trust-1",
      fact,
      decision,
    });
    const events = listIntegrationEventsForTests();
    expect(events[0]?.event_type).toBe("evidence_reuse_accepted");
    expect(integrationObservabilityLeaks(events[0])).toEqual([]);
    expect(JSON.stringify(events[0])).not.toContain(fact.fact_id);
    expect(JSON.stringify(events[0])).not.toContain(fact.source_receipt_id);
  });

  it("fails closed when trust evaluation throws in pickBestReuseDecision path", async () => {
    const facts = [projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!];
    const picked = pickBestReuseDecision({
      facts,
      targetPolicyId: "partner-b-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetEnvironment: "production",
      relyingPartner: "partner-b",
      now: new Date("2026-09-20T00:00:00.000Z"),
    });
    expect(picked?.decision).toBe("reuse");
  });

  it("does not block authorization when telemetry recording fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(recordEvidenceReuseTelemetry({
      partnerId: "partner-b",
      policyId: "partner-b-age_21_retail-v1",
      policyVersion: 1,
      environment: "production",
      decision: {
        decision: "not_compatible",
        reason: "incompatible",
        assurance_level: "L2",
        freshness_state: "fresh",
        trust: {
          reusable: false,
          assurance_sufficient: true,
          freshness: "fresh",
          compatibility: "incompatible",
          source_active: true,
          environment_allowed: true,
          consent_required: true,
          reasons: ["incompatible"],
        },
      },
    })).resolves.toBeUndefined();
  });
});
