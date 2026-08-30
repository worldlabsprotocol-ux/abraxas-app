// FILE: lib/goodTrouble/migration075Idempotency.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  expandRequiredClaimsForMinimumAge,
  hasConflictingProductEligibilityRule,
  evaluatePolicyRules,
} from "@/lib/policy/evaluatePolicy";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { productEligibilityClaim } from "@/lib/credentials/claimSchema";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/075_good_trouble_retail_age_eligibility_claim.sql",
);

function claim(partial: Partial<CredentialClaimRecord> & Pick<CredentialClaimRecord, "claim_type">): CredentialClaimRecord {
  return {
    id: "1",
    subject_id: "0x1",
    credential_jti: null,
    claim_value: {},
    issuer_id: "issuer:test",
    assurance_level: "L2",
    issued_at: new Date().toISOString(),
    expires_at: null,
    status: "active",
    revocation_reference: null,
    evidence_reference: null,
    jurisdiction: null,
    policy_scope: null,
    ...partial,
  };
}

describe("075_good_trouble_retail_age_eligibility_claim.sql", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("adds product_eligibility exactly once via NOT EXISTS guard", () => {
    expect(sql).toMatch(/product_eligibility/);
    expect(sql).toMatch(/NOT EXISTS/i);
    expect((sql.match(/product_eligibility/g) ?? []).length).toBeGreaterThanOrEqual(2);
    const appendCount = (sql.match(/"claim_type":"product_eligibility"/g) ?? []).length;
    expect(appendCount).toBe(1);
  });

  it("is idempotent — second run would not append another product_eligibility", () => {
    expect(sql).toMatch(/elem->>'claim_type' = 'product_eligibility'/);
    expect(sql).toMatch(/WHERE id = 'good-trouble-retail-v1'/);
    expect(sql).toMatch(/partner_id = 'good-trouble-cannabis'/);
  });
});

describe("expandRequiredClaimsForMinimumAge deduplication", () => {
  const migratedRule = {
    claim_type: "product_eligibility",
    must_equal: "over_21",
    max_age_hours: 8760,
    min_assurance: "L2" as const,
  };

  it("does not duplicate product_eligibility when policy already contains migrated rule", () => {
    const rules: PartnerPolicyRules = {
      minimum_age: 21,
      required_claims: [migratedRule],
    };
    const expanded = expandRequiredClaimsForMinimumAge(rules);
    const eligibility = expanded.filter((r) => r.claim_type === "product_eligibility");
    expect(eligibility).toHaveLength(1);
    expect(eligibility[0]).toEqual(migratedRule);
  });

  it("does not add product_eligibility when minimum_age is below 21", () => {
    const expanded = expandRequiredClaimsForMinimumAge({
      minimum_age: 18,
      required_claims: [{ claim_type: "identity_verified" }],
    });
    expect(expanded.some((r) => r.claim_type === "product_eligibility")).toBe(false);
  });

  it("adds product_eligibility when minimum_age is 21 and rule absent", () => {
    const expanded = expandRequiredClaimsForMinimumAge({
      minimum_age: 21,
      required_claims: [{ claim_type: "identity_verified" }],
    });
    expect(expanded.filter((r) => r.claim_type === "product_eligibility")).toHaveLength(1);
  });
});

describe("conflicting product_eligibility rules fail closed", () => {
  it("denies evaluation when migrated minimum_age conflicts with existing eligibility rule", () => {
    const rules: PartnerPolicyRules = {
      minimum_age: 21,
      required_claims: [
        { claim_type: "product_eligibility", must_equal: "under_21" },
      ],
    };
    expect(hasConflictingProductEligibilityRule(rules)).toBe(true);
    const result = evaluatePolicyRules(rules, []);
    expect(result.decision).toBe("denied");
    expect(result.reason_codes).toContain("policy_conflict:product_eligibility");
  });
});

describe("Good Trouble claim matrix without product_eligibility", () => {
  const gtClaims = [
    claim({ claim_type: "identity_verified" }),
    claim({ claim_type: "liveness_passed" }),
    claim({ claim_type: "wallet_binding_confirmed" }),
    claim({ claim_type: "residency_country", claim_value: { country: "US", state: "MO" } }),
  ];

  it("denies identity_verified plus prior GT claims when product_eligibility is missing", () => {
    const rules: PartnerPolicyRules = {
      sandbox_only: true,
      minimum_age: 21,
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "liveness_passed", max_age_hours: 8760 },
        { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
        { claim_type: "residency_country", max_age_hours: 8760 },
        { claim_type: "product_eligibility", must_equal: "over_21", max_age_hours: 8760, min_assurance: "L2" },
      ],
    };

    const withoutEligibility = evaluatePolicyRules(rules, gtClaims);
    expect(withoutEligibility.decision).toBe("denied");
    expect(withoutEligibility.missing_claims).toContain("product_eligibility");

    const eligibility = productEligibilityClaim({
      subjectId: "0x1",
      jti: "jti",
      outcome: "over_21",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    const approved = evaluatePolicyRules(rules, [
      ...gtClaims,
      { ...eligibility, id: "5", status: "active" },
    ]);
    expect(approved.decision).toBe("approved");
  });

  it("minimum_age below 21 does not auto-grant over_21 via expansion alone", () => {
    const rules: PartnerPolicyRules = {
      minimum_age: 18,
      required_claims: [{ claim_type: "identity_verified" }],
    };
    const result = evaluatePolicyRules(rules, [claim({ claim_type: "identity_verified" })]);
    expect(result.decision).toBe("approved");
    expect(result.missing_claims).not.toContain("product_eligibility");
  });
});
