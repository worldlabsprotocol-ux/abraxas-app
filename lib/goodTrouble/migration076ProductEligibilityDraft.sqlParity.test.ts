// FILE: lib/goodTrouble/migration076ProductEligibilityDraft.sqlParity.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error pg has no bundled TypeScript declarations in this repo
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  expandRequiredClaimsForMinimumAge,
  hasConflictingProductEligibilityRule,
  evaluatePolicyRules,
} from "@/lib/policy/evaluatePolicy";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { productEligibilityClaim } from "@/lib/credentials/claimSchema";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";

const PG_URL = process.env.MIGRATION_076_PG_URL;
const POLICY_ID = "good-trouble-retail-v1";
const PARTNER_ID = "good-trouble-cannabis";

const MIGRATION_075_PATH = join(
  process.cwd(),
  "supabase/migrations/075_good_trouble_retail_age_eligibility_claim.sql",
);
const MIGRATION_076_PATH = join(
  process.cwd(),
  "supabase/migrations/076_good_trouble_retail_product_eligibility_draft.sql",
);
const ROLLBACK_075_PATH = join(
  process.cwd(),
  "supabase/rollbacks/075_good_trouble_retail_age_eligibility_claim_rollback.sql",
);
const ROLLBACK_076_PATH = join(
  process.cwd(),
  "supabase/rollbacks/076_good_trouble_retail_product_eligibility_draft_rollback.sql",
);

const FAILED_075_UPDATE = `
UPDATE public.partner_policies
SET rules_json = jsonb_set(
  rules_json,
  '{required_claims}',
  COALESCE(rules_json->'required_claims', '[]'::jsonb)
    || '[{"claim_type":"product_eligibility","must_equal":"over_21","max_age_hours":8760,"min_assurance":"L2"}]'::jsonb
)
WHERE id = 'good-trouble-retail-v1'
  AND partner_id = 'good-trouble-cannabis'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(rules_json->'required_claims', '[]'::jsonb)) elem
    WHERE elem->>'claim_type' = 'product_eligibility'
  );
`;

function claim(
  partial: Partial<CredentialClaimRecord> & Pick<CredentialClaimRecord, "claim_type">,
): CredentialClaimRecord {
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

interface PolicyRow {
  id: string;
  partner_id: string;
  version: number;
  status: string;
  rules_json: PartnerPolicyRules & Record<string, unknown>;
}

async function loadPolicyRows(client: Client): Promise<PolicyRow[]> {
  const { rows } = await client.query<PolicyRow>(
    `SELECT id, partner_id, version, status, rules_json
       FROM public.partner_policies
      WHERE id = $1
      ORDER BY version`,
    [POLICY_ID],
  );
  return rows;
}

async function countProductEligibilityRules(client: Client, version: number): Promise<number> {
  const { rows } = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM public.partner_policies pp,
            jsonb_array_elements(COALESCE(pp.rules_json->'required_claims', '[]'::jsonb)) elem
      WHERE pp.id = $1
        AND pp.version = $2
        AND elem->>'claim_type' = 'product_eligibility'
        AND elem->>'must_equal' = 'over_21'`,
    [POLICY_ID, version],
  );
  return Number(rows[0]?.count ?? 0);
}

describe("migration 075 compatibility shim — static SQL contract", () => {
  const migration075 = readFileSync(MIGRATION_075_PATH, "utf8");
  const migration076 = readFileSync(MIGRATION_076_PATH, "utf8");
  const rollback075 = readFileSync(ROLLBACK_075_PATH, "utf8");
  const rollback076 = readFileSync(ROLLBACK_076_PATH, "utf8");

  it("075 defers to 076 when immutability trigger is present", () => {
    expect(migration075).toMatch(/trg_partner_policies_immutability/);
    expect(migration075).toMatch(/deferred to migration 076/i);
    expect(migration075).toMatch(/P0001|good-trouble-retail-v1\.1/i);
  });

  it("075 retains legacy pre-055 UPDATE branch for historical environments", () => {
    expect(migration075).toMatch(/UPDATE public\.partner_policies/);
    expect(migration075).toMatch(/product_eligibility/);
  });

  it("076 inserts a draft successor without publishing", () => {
    expect(migration076).toMatch(/INSERT INTO public\.partner_policies/i);
    expect(migration076).toMatch(/ambiguous state/i);
    expect(migration076).toMatch(/product_eligibility/);
    expect(migration076).not.toMatch(/^\s*select\s+public\.publish_partner_policy_draft/im);
    expect(migration076).not.toMatch(/UPDATE public\.partner_policies[\s\S]*SET rules_json/i);
  });

  it("075 rollback is conditional on immutability trigger", () => {
    expect(rollback075).toMatch(/trg_partner_policies_immutability/);
    expect(rollback075).toMatch(/076 rollback/i);
  });

  it("076 rollback deletes draft only and never updates active rows", () => {
    expect(rollback076).toMatch(/DELETE FROM public\.partner_policies/i);
    expect(rollback076).toMatch(/status = 'draft'/);
    expect(rollback076).not.toMatch(/UPDATE public\.partner_policies/i);
    expect(rollback076).toMatch(/product_eligibility/);
  });
});

describe("failed migration 075 UPDATE (P0001 regression)", () => {
  const migration075 = readFileSync(MIGRATION_075_PATH, "utf8");

  it("documents the exact Production failure mode", () => {
    expect(migration075).toMatch(/good-trouble-retail-v1\.1/);
    expect(migration075).toMatch(/P0001|cannot mutate rules_json/i);
  });

  it("preserves the invalid in-place UPDATE for regression reproduction", () => {
    expect(FAILED_075_UPDATE).toMatch(/UPDATE public\.partner_policies/);
    expect(FAILED_075_UPDATE).toMatch(/good-trouble-retail-v1/);
    expect(FAILED_075_UPDATE).toMatch(/product_eligibility/);
  });
});

describe("stored required_claims evaluation boundary", () => {
  it("does not expand minimum_age into product_eligibility", () => {
    const expanded = expandRequiredClaimsForMinimumAge({
      minimum_age: 21,
      required_claims: [{ claim_type: "identity_verified" }],
    });
    expect(expanded.filter((r) => r.claim_type === "product_eligibility")).toHaveLength(0);
  });

  it("preserves explicit product_eligibility in stored rules", () => {
    const migratedRule = {
      claim_type: "product_eligibility",
      must_equal: "over_21",
      max_age_hours: 8760,
      min_assurance: "L2" as const,
    };
    const expanded = expandRequiredClaimsForMinimumAge({
      minimum_age: 21,
      required_claims: [migratedRule],
    });
    expect(expanded.filter((r) => r.claim_type === "product_eligibility")).toHaveLength(1);
  });
});

describe("conflicting product_eligibility rules fail closed", () => {
  it("denies evaluation when migrated minimum_age conflicts with existing eligibility rule", () => {
    const rules: PartnerPolicyRules = {
      minimum_age: 21,
      required_claims: [{ claim_type: "product_eligibility", must_equal: "under_21" }],
    };
    expect(hasConflictingProductEligibilityRule(rules)).toBe(true);
    const result = evaluatePolicyRules(rules, []);
    expect(result.decision).toBe("denied");
    expect(result.reason_codes).toContain("policy_conflict:product_eligibility");
  });
});

describe("Good Trouble claim matrix with product_eligibility", () => {
  const gtClaims = [
    claim({ claim_type: "identity_verified" }),
    claim({ claim_type: "liveness_passed" }),
    claim({ claim_type: "wallet_binding_confirmed" }),
    claim({ claim_type: "residency_country", claim_value: { country: "US", state: "MO" } }),
  ];

  it("denies when product_eligibility is missing from required claims", () => {
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
});

describe("migration 076 SQL parity (requires MIGRATION_076_PG_URL)", () => {
  if (!PG_URL) {
    it.skip("requires MIGRATION_076_PG_URL (database parity runs via scripts/ci/run-migration-076-sql-parity.sh)", () => {});
    return;
  }

  let client: Client;
  let activeSnapshot: string;

  beforeAll(async () => {
    client = new Client({ connectionString: PG_URL });
    await client.connect();

    const rows = await loadPolicyRows(client);
    const active = rows.find((r) => r.status === "active");
    expect(active).toBeDefined();
    activeSnapshot = JSON.stringify(active!.rules_json);
  });

  afterAll(async () => {
    await client?.end();
  });

  it("075 shim leaves active v1 unchanged on fresh sequential path", async () => {
    const rows = await loadPolicyRows(client);
    const active = rows.find((r) => r.status === "active" && r.version === 1);
    expect(active).toBeDefined();
    expect(await countProductEligibilityRules(client, 1)).toBe(0);
    expect(active!.rules_json.minimum_age).toBe(21);
  });

  it("rejects the exact failed 075 in-place UPDATE with P0001", async () => {
    await expect(client.query(FAILED_075_UPDATE)).rejects.toMatchObject({
      code: "P0001",
      message: expect.stringMatching(/cannot mutate rules_json on active policy version good-trouble-retail-v1\.1/i),
    });
  });

  it("leaves the active policy byte-for-byte unchanged after 076", async () => {
    const rows = await loadPolicyRows(client);
    const active = rows.find((r) => r.status === "active" && r.version === 1);
    expect(active).toBeDefined();
    expect(JSON.stringify(active!.rules_json)).toBe(activeSnapshot);
    expect(await countProductEligibilityRules(client, 1)).toBe(0);
  });

  it("creates exactly one draft successor with one product_eligibility rule", async () => {
    const rows = await loadPolicyRows(client);
    const drafts = rows.filter((r) => r.status === "draft");
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.version).toBe(2);
    expect(await countProductEligibilityRules(client, drafts[0]!.version)).toBe(1);

    const active = rows.find((r) => r.status === "active")!;
    const draft = drafts[0]!;
    const activeClaims = (active.rules_json.required_claims ?? []) as Array<{ claim_type: string }>;
    const draftClaims = (draft.rules_json.required_claims ?? []) as Array<{ claim_type: string }>;
    expect(draftClaims.length).toBe(activeClaims.length + 1);
    expect(draftClaims.filter((c) => c.claim_type === "product_eligibility")).toHaveLength(1);
  });

  it("selects active policy without version ambiguity (getPartnerPolicy contract)", async () => {
    const { rows } = await client.query<PolicyRow>(
      `SELECT id, partner_id, version, status, rules_json
         FROM public.partner_policies
        WHERE id = $1
          AND status = 'active'`,
      [POLICY_ID],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.version).toBe(1);
    expect(rows[0]!.partner_id).toBe(PARTNER_ID);
  });

  it("is idempotent on repeated 076 application", async () => {
    const before = await loadPolicyRows(client);
    await client.query(readFileSync(MIGRATION_076_PATH, "utf8"));
    const after = await loadPolicyRows(client);
    expect(after).toHaveLength(before.length);
    expect(after.map((r) => `${r.version}:${r.status}`)).toEqual(
      before.map((r) => `${r.version}:${r.status}`),
    );
  });

  it("rollback 076 removes draft without mutating active policy history", async () => {
    const activeBefore = (await loadPolicyRows(client)).find((r) => r.status === "active")!;
    const activeJsonBefore = JSON.stringify(activeBefore.rules_json);

    await client.query(readFileSync(ROLLBACK_076_PATH, "utf8"));

    const rows = await loadPolicyRows(client);
    expect(rows.filter((r) => r.status === "draft")).toHaveLength(0);
    expect(rows.filter((r) => r.status === "active")).toHaveLength(1);

    const activeAfter = rows.find((r) => r.status === "active")!;
    expect(JSON.stringify(activeAfter.rules_json)).toBe(activeJsonBefore);
    expect(activeAfter.version).toBe(1);
  });
});
