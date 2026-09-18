import { describe, expect, it } from "vitest";
import {
  comparePolicyVersions,
  derivePolicyChangeControlHealth,
  draftCannotIssueProductionReceipt,
  evaluatePolicyFixture,
  evaluatePolicyVersionGate,
  fixtureInputContainsForbiddenKeys,
  validatePolicyDraftForPublish,
} from "@/lib/policy/changeControl";
import { sanitizePolicyAuditMetadata } from "@/lib/policy/changeControl/audit";
import { assertPublishedPolicyFieldsUnchanged } from "@/lib/policy/policyLifecycle";
import type { PartnerPolicy } from "@/lib/policy/types";

const activeV1: PartnerPolicy = {
  id: "partner-acme-age_21_retail-v1",
  partner_id: "partner-acme",
  version: 1,
  name: "Age 21",
  status: "active",
  effective_at: "2026-01-01T00:00:00.000Z",
  rules_json: {
    sandbox_only: true,
    required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
  },
};

const draftV2: PartnerPolicy = {
  ...activeV1,
  version: 2,
  status: "draft",
  rules_json: {
    sandbox_only: true,
    required_claims: [
      { claim_type: "identity_verified", min_assurance: "L2" },
      { claim_type: "liveness_passed", min_assurance: "L3" },
    ],
  },
};

describe("Policy Change Control", () => {
  it("does not allow drafts to issue production receipts", () => {
    expect(draftCannotIssueProductionReceipt("draft")).toBe(true);
    const gate = evaluatePolicyVersionGate({
      policy: draftV2,
      partnerId: "partner-acme",
      expectedVersion: 2,
      mode: "production_receipt",
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("policy_version_draft");
  });

  it("keeps published identity and rules immutable", () => {
    expect(() =>
      assertPublishedPolicyFieldsUnchanged(activeV1, {
        rules_json: { required_claims: [{ claim_type: "residency_country" }] },
      }),
    ).toThrow(/rules_json/);
  });

  it("binds historical evaluation to the issued version, not the successor", () => {
    const comparison = comparePolicyVersions(activeV1, draftV2);
    expect(comparison.added_claims).toContain("liveness_passed");
    const historical = evaluatePolicyVersionGate({
      policy: { ...activeV1, status: "deprecated" },
      partnerId: "partner-acme",
      expectedVersion: 1,
      mode: "historical_evaluate",
    });
    expect(historical.ok).toBe(true);
  });

  it("fails closed for missing, unknown, mismatched, future, deprecated, and wrong partner", () => {
    expect(evaluatePolicyVersionGate({
      policy: null, partnerId: "partner-acme", mode: "production_receipt",
    }).ok).toBe(false);

    expect(evaluatePolicyVersionGate({
      policy: null, partnerId: "partner-acme", expectedVersion: 9, mode: "production_receipt",
    })).toMatchObject({ ok: false, code: "policy_version_unknown" });

    expect(evaluatePolicyVersionGate({
      policy: activeV1, partnerId: "partner-acme", expectedVersion: 9, mode: "production_receipt",
    })).toMatchObject({ ok: false, code: "policy_version_mismatched" });

    expect(evaluatePolicyVersionGate({
      policy: { ...activeV1, effective_at: "2099-01-01T00:00:00.000Z" },
      partnerId: "partner-acme",
      now: new Date("2026-06-01T00:00:00.000Z"),
      mode: "production_receipt",
    })).toMatchObject({ ok: false, code: "policy_version_not_yet_effective" });

    expect(evaluatePolicyVersionGate({
      policy: { ...activeV1, status: "deprecated", deprecate_effective_at: "2026-01-02T00:00:00.000Z" },
      partnerId: "partner-acme",
      now: new Date("2026-06-01T00:00:00.000Z"),
      mode: "production_receipt",
    })).toMatchObject({ ok: false, code: "policy_version_deprecated" });

    expect(evaluatePolicyVersionGate({
      policy: activeV1, partnerId: "other-partner", mode: "production_receipt",
    })).toMatchObject({ ok: false, code: "policy_wrong_partner" });
  });

  it("allows pinned deprecated versions to keep issuing until deprecate_effective_at", () => {
    const gate = evaluatePolicyVersionGate({
      policy: { ...activeV1, status: "deprecated", deprecate_effective_at: null },
      partnerId: "partner-acme",
      expectedVersion: 1,
      mode: "production_receipt",
    });
    expect(gate.ok).toBe(true);
  });

  it("requires explicit adoption when the catalog active version diverges", () => {
    const health = derivePolicyChangeControlHealth({
      pinnedVersion: 1,
      activeVersion: 2,
      draftVersion: null,
      pinnedStatus: "deprecated",
      comparison: comparePolicyVersions(activeV1, { ...activeV1, version: 2, status: "active" }),
      pinnedIssuable: true,
    });
    expect(health.status).toBe("action_required");
    expect(health.blocker_code).toBe("policy_version_not_adopted");
  });

  it("blocks breaking successors until the integration is updated", () => {
    const health = derivePolicyChangeControlHealth({
      pinnedVersion: 1,
      activeVersion: 2,
      draftVersion: null,
      pinnedStatus: "deprecated",
      comparison: comparePolicyVersions(activeV1, { ...draftV2, status: "active" }),
      pinnedIssuable: true,
    });
    expect(health.status).toBe("blocked");
    expect(health.blocker_code).toBe("policy_version_incompatible_claims");
  });

  it("validates drafts server-side before publish", () => {
    const invalid = validatePolicyDraftForPublish({
      ...draftV2,
      name: "",
      rules_json: {},
    });
    expect(invalid.ok).toBe(false);
    expect(validatePolicyDraftForPublish(draftV2).ok).toBe(true);
    expect(validatePolicyDraftForPublish(activeV1).ok).toBe(false);
  });

  it("labels fixture evaluation as offline/simulated and never issues", () => {
    const result = evaluatePolicyFixture({
      policy: draftV2,
      partnerId: "partner-acme",
      claims: [{ claim_type: "identity_verified", present: true }],
    });
    expect(result.classification).toBe("offline_simulated");
    expect(result.issues_receipt).toBe(false);
    expect(result.production_usable).toBe(false);
    expect(result.label.toLowerCase()).toContain("simulated");
  });

  it("rejects fixture payloads that look like PII or secrets", () => {
    expect(fixtureInputContainsForbiddenKeys({ email: "a@b.c" })).toBe(true);
    expect(fixtureInputContainsForbiddenKeys({ date_of_birth: "1990-01-01" })).toBe(true);
    expect(fixtureInputContainsForbiddenKeys({ fixture_claims: [{ claim_type: "identity_verified" }] })).toBe(false);
  });

  it("strips secrets and PII from audit metadata", () => {
    const clean = sanitizePolicyAuditMetadata({
      deprecate_effective_at: "2026-12-01T00:00:00.000Z",
      email: "holder@example.com",
      api_key: "abx_test_secret",
      ok: true,
    });
    expect(clean.email).toBeUndefined();
    expect(clean.api_key).toBeUndefined();
    expect(clean.ok).toBe(true);
    expect(JSON.stringify(clean)).not.toMatch(/holder@|abx_test_secret/);
  });
});
