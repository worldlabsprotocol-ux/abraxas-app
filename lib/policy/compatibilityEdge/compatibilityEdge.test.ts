import { describe, expect, it } from "vitest";
import { evaluateFactCompatibility } from "@/lib/passport/reusableEligibility/compatibility";
import {
  REUSE_CLIENT_KEYS,
  REUSE_COMPATIBILITY_RULE,
} from "@/lib/passport/reusableEligibility/contract";
import { projectInternalFact, type SourceReceiptRow } from "@/lib/passport/reusableEligibility/facts";
import { buildReuseClientView, rejectReuseClientAuthority } from "@/lib/passport/reusableEligibility/view";
import { buildPassportActivityItem } from "@/lib/passport/verificationActivity/view";
import { GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { REUSE_PASSPORT_NOTICE } from "@/lib/passport/reusableEligibility/contract";
import { buildPolicyVersionPlannerView } from "@/lib/partner/launchpad/policyVersionPlanner/view";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { evaluateCompatibility, productionActiveEdgeCount } from "@/lib/policy/compatibilityEdge";
import {
  FIXTURE_ACTIVE_CONTINUITY,
  FIXTURE_ASSURANCE_HIGH_TARGET,
  FIXTURE_BROADER_DISCLOSURE,
  FIXTURE_BROADER_RESULT,
  FIXTURE_DEPRECATED,
  FIXTURE_EXPIRED_EDGE,
  FIXTURE_NOT_EFFECTIVE,
  FIXTURE_REVOKED,
  FIXTURE_SANDBOX_TO_PRODUCTION,
  TEST_REGISTRY_ACTIVE,
  TEST_REGISTRY_TRANSITIVE,
} from "@/lib/policy/compatibilityEdge/testFixtures";
import { canonicalizeDisclosureBoundary, type CompatibilityFactSnapshot, type CompatibilityTargetSnapshot } from "@/lib/policy/compatibilityEdge/types";

const SUBJECT = "0x" + "c".repeat(64);
const SOURCE_RECEIPT = "dr_source_compat_1";
const AGE21_BOUNDARY = canonicalizeDisclosureBoundary("age_eligible_21", [
  "date of birth",
  "government ID images",
  "legal name",
  "email",
]);

function receipt(overrides: Partial<SourceReceiptRow> = {}): SourceReceiptRow {
  return {
    id: SOURCE_RECEIPT,
    verification_decision_id: "00000000-0000-4000-8000-0000000000bb",
    partner_id: "origin-partner",
    policy_id: "partner-age_21_retail-v1",
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

function app(): LaunchpadApplicationRow {
  return {
    id: "app-1",
    public_slug: "acme-retail",
    partner_id: "acme",
    application_name: "Acme retail",
    display_name: "Acme",
    environment: "sandbox",
    policy_id: "acme-age_21_retail-v1",
    policy_version: 1,
    policy_template_id: "age_21_retail",
    allowed_return_urls: ["http://localhost:3000/callback"],
    api_key_id: "key-1",
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: "2026-09-20T00:00:00.000Z",
  };
}

function snap(overrides: Partial<CompatibilityFactSnapshot> = {}): CompatibilityFactSnapshot {
  return {
    pack_id: "age_21_retail",
    policy_version: 1,
    minimum_assurance: "L2",
    method_category: "L2",
    result_category: "age_eligible_21",
    disclosure_boundary: AGE21_BOUNDARY,
    decision_context: "production",
    status: "active",
    expires_at: "2026-12-01T00:00:00.000Z",
    ...overrides,
  };
}

function target(overrides: Partial<CompatibilityTargetSnapshot> = {}): CompatibilityTargetSnapshot {
  return {
    pack_id: "age_21_retail",
    policy_version: 2,
    required_assurance: "L2",
    method_category: "L2",
    result_category: "age_eligible_21",
    disclosure_boundary: AGE21_BOUNDARY,
    sandbox_only: false,
    ...overrides,
  };
}

describe("policy compatibility edge registry", () => {
  it("keeps Production empty of active cross-version edges", () => {
    expect(productionActiveEdgeCount()).toBe(0);
    expect(REUSE_COMPATIBILITY_RULE).toBe("exact_pack_and_version_or_reviewed_compatibility_edge");
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    expect(evaluateFactCompatibility({
      fact,
      targetPolicyId: "other-partner-age_21_retail-v1",
      targetPolicyVersion: 2,
      targetSandboxOnly: false,
    })).toMatchObject({ ok: false, reason: "incompatible" });
  });

  it("allows exact same-version reuse without an edge", () => {
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    expect(evaluateFactCompatibility({
      fact,
      targetPolicyId: "other-partner-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetSandboxOnly: false,
      now: new Date("2026-09-20T00:00:00.000Z"),
    }).ok).toBe(true);
  });

  it("denies cross-version reuse when no registry edge exists", () => {
    expect(evaluateCompatibility({
      fact: snap(),
      target: target(),
      now: new Date("2026-09-20T00:00:00.000Z"),
      registry: [],
    })).toMatchObject({ ok: false, reason: "incompatible" });
  });

  it("allows reuse only through one active reviewed edge", () => {
    const allowed = evaluateCompatibility({
      fact: snap(),
      target: target(),
      now: new Date("2026-09-20T00:00:00.000Z"),
      registry: TEST_REGISTRY_ACTIVE,
    });
    expect(allowed).toEqual({ ok: true, reason: "reviewed_edge" });
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    expect(evaluateFactCompatibility({
      fact,
      targetPolicyId: "partner-age_21_retail-v1",
      targetPolicyVersion: 2,
      targetSandboxOnly: false,
      now: new Date("2026-09-20T00:00:00.000Z"),
      registry: TEST_REGISTRY_ACTIVE,
    }).ok).toBe(true);
  });

  it("denies inactive, expired, deprecated, and revoked edges", () => {
    const now = new Date("2026-09-20T00:00:00.000Z");
    expect(evaluateCompatibility({
      fact: snap(),
      target: target(),
      now,
      registry: [FIXTURE_DEPRECATED],
    }).ok).toBe(false);
    expect(evaluateCompatibility({
      fact: snap(),
      target: target(),
      now,
      registry: [FIXTURE_REVOKED],
    }).ok).toBe(false);
    expect(evaluateCompatibility({
      fact: snap(),
      target: target(),
      now,
      registry: [FIXTURE_EXPIRED_EDGE],
    })).toMatchObject({ ok: false, reason: "edge_expired" });
    expect(evaluateCompatibility({
      fact: snap(),
      target: target(),
      now,
      registry: [FIXTURE_NOT_EFFECTIVE],
    })).toMatchObject({ ok: false, reason: "not_effective" });
  });

  it("denies assurance mismatch even with an active edge", () => {
    expect(evaluateCompatibility({
      fact: snap(),
      target: target({ required_assurance: "L4" }),
      now: new Date("2026-09-20T00:00:00.000Z"),
      registry: [FIXTURE_ASSURANCE_HIGH_TARGET],
    })).toMatchObject({ ok: false, reason: "assurance_mismatch" });
  });

  it("denies broader result or disclosure even if a fixture edge claims it", () => {
    expect(evaluateCompatibility({
      fact: snap({
        pack_id: "age_18_retail",
        minimum_assurance: "L1",
        method_category: "L1",
        result_category: "age_eligible_18",
        disclosure_boundary: canonicalizeDisclosureBoundary("age_eligible_18", [
          "date of birth",
          "government ID images",
          "legal name",
          "email",
        ]),
      }),
      target: target({
        pack_id: "age_21_retail",
        policy_version: 1,
        required_assurance: "L2",
        result_category: "age_eligible_21",
      }),
      now: new Date("2026-09-20T00:00:00.000Z"),
      registry: [FIXTURE_BROADER_RESULT],
    })).toMatchObject({ ok: false, reason: "result_expanded" });

    expect(evaluateCompatibility({
      fact: snap(),
      target: target({
        disclosure_boundary: canonicalizeDisclosureBoundary("age_eligible_21", ["date of birth"]),
      }),
      now: new Date("2026-09-20T00:00:00.000Z"),
      registry: [FIXTURE_BROADER_DISCLOSURE],
    })).toMatchObject({ ok: false, reason: "disclosure_expanded" });
  });

  it("never lets a sandbox fact satisfy Production", () => {
    expect(evaluateCompatibility({
      fact: snap({ decision_context: "sandbox_only" }),
      target: target({ sandbox_only: false }),
      now: new Date("2026-09-20T00:00:00.000Z"),
      registry: [FIXTURE_SANDBOX_TO_PRODUCTION],
    })).toMatchObject({ ok: false, reason: "sandbox_blocked" });
  });

  it("does not use transitive compatibility", () => {
    expect(evaluateCompatibility({
      fact: snap({ policy_version: 1 }),
      target: target({ policy_version: 3 }),
      now: new Date("2026-09-20T00:00:00.000Z"),
      registry: TEST_REGISTRY_TRANSITIVE,
    })).toMatchObject({ ok: false, reason: "incompatible" });
  });

  it("requires fresh consent and never issues a result on selection", () => {
    const view = buildReuseClientView("available");
    expect(view.consent_still_required).toBe(true);
    expect(view.issuedReceipt).toBe(false);
    expect(Object.keys(view).sort()).toEqual([...REUSE_CLIENT_KEYS].sort());
  });

  it("does not leak source partner, receipt, fact, or edge identifiers", () => {
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    const view = buildReuseClientView("available");
    const blob = JSON.stringify({ view, factPublic: { pack: fact.pack_id } });
    expect(blob).not.toContain(SOURCE_RECEIPT);
    expect(blob).not.toContain("origin-partner");
    expect(JSON.stringify(view)).not.toContain(fact.fact_id);
    expect(JSON.stringify(view)).not.toContain(FIXTURE_ACTIVE_CONTINUITY.edge_id);
    const item = buildPassportActivityItem({
      decision_id: "00000000-0000-4000-8000-0000000000bb",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: "partner-age_21_retail-v1",
      policy_version: 1,
      decision: "approved",
      decided_at: "2026-09-19T12:00:00.000Z",
      valid_until: "2026-12-01T00:00:00.000Z",
      decision_status: "active",
      requested_action: "Confirm adult retail eligibility",
      receipt_status: "active",
      receipt_context: "production",
      receipt_expires_at: "2026-12-01T00:00:00.000Z",
      receipt_revoked_at: null,
    }, SUBJECT, new Date("2026-09-20T12:00:00.000Z"));
    expect(item?.reuse_consent_notice).toBe(REUSE_PASSPORT_NOTICE);
    expect(JSON.stringify(item)).not.toContain("edge_");
  });

  it("keeps source withdrawal as the lifecycle that blocks reuse of derived results", () => {
    const revoked = projectInternalFact({
      subjectId: SUBJECT,
      receipt: receipt({ status: "revoked", revoked_at: "2026-09-02T00:00:00.000Z" }),
    })!;
    expect(evaluateFactCompatibility({
      fact: revoked,
      targetPolicyId: "partner-age_21_retail-v1",
      targetPolicyVersion: 2,
      targetSandboxOnly: false,
      registry: TEST_REGISTRY_ACTIVE,
    })).toMatchObject({ ok: false, reason: "revoked" });
  });

  it("shows the planner continuity indicator only when an applicable active edge exists", () => {
    const without = buildPolicyVersionPlannerView(app());
    expect(without.reusable_continuity_reviewed).toBe(false);
    expect(without.reusable_continuity_label).toBeNull();
    const withEdge = buildPolicyVersionPlannerView(app(), undefined, TEST_REGISTRY_ACTIVE);
    expect(withEdge.reusable_continuity_reviewed).toBe(true);
    expect(withEdge.reusable_continuity_label).toBe("Reusable continuity reviewed");
    expect(JSON.stringify(withEdge)).not.toContain("edge_test_");
  });

  it("rejects client-supplied edge, compatibility, and production fields", () => {
    expect(rejectReuseClientAuthority({
      edge_id: "edge_forged",
      compatibility_status: "active",
      production: true,
    })).toBe(true);
  });
});
