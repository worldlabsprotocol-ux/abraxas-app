import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationEligibilityRecord } from "./types";

const durable = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  unavailable: false,
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "organization_eligibility_records") throw new Error("unexpected_table");
      const filters = new Map<string, unknown>();
      const matches = () => Array.from(durable.rows.values()).filter((row) =>
        Array.from(filters.entries()).every(([key, value]) => row[key] === value),
      );
      const result = () => durable.unavailable
        ? { data: null, error: { code: "42P01", message: "unavailable" } }
        : { data: matches(), error: null };
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters.set(key, value);
          return query;
        },
        maybeSingle: async () => {
          const selected = result();
          return { ...selected, data: selected.data?.[0] ?? null };
        },
        upsert: async (row: Record<string, unknown>) => {
          if (durable.unavailable) return { error: { code: "42P01", message: "unavailable" } };
          durable.rows.set(String(row.organization_ref), row);
          return { error: null };
        },
        then: (resolve: (value: ReturnType<typeof result>) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve, reject),
      };
      return query;
    },
  }),
}));

import {
  findOrganizationByDerivation,
  findOrganizationBySubjectBinding,
  listOrganizationEligibilityMatching,
  loadOrganizationEligibility,
  resetOrganizationEligibilityForTests,
  saveOrganizationEligibility,
} from "./store";

const originalVitest = process.env.VITEST;

function record(): OrganizationEligibilityRecord {
  return {
    organization_ref: "org_durable_1",
    actor_ref: "act_durable_1",
    partner_hmac: "partner_hmac_1",
    audience_hash: "audience_1",
    issuer_ref: "issuer_1",
    method_category: "privacy_preserving",
    assurance_level: "L2",
    result_category: "organization_eligible",
    policy_id: "organization_eligible",
    policy_version: 1,
    purpose: "sandbox proof",
    action: "activate_protocol_access",
    action_scope: "sandbox:protocol_access",
    environment: "sandbox",
    status: "issued",
    consent_bound: true,
    currently_valid: true,
    issued_at: "2026-09-22T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    revoked_at: null,
    withdrawn_at: null,
    derivation_hash: "derivation_1",
    presentation_ref: null,
    subject_binding_hash: "subject_1",
  };
}

function matchingInput() {
  return {
    partner_hmac: "partner_hmac_1",
    result_category: "organization_eligible",
    policy_id: "organization_eligible",
    policy_version: 1,
    action: "activate_protocol_access",
    environment: "sandbox" as const,
  };
}

describe("organization eligibility durable reads", () => {
  beforeEach(() => {
    process.env.VITEST = "";
    durable.rows.clear();
    durable.unavailable = false;
    resetOrganizationEligibilityForTests();
  });

  afterEach(() => {
    process.env.VITEST = originalVitest;
    durable.rows.clear();
    durable.unavailable = false;
    resetOrganizationEligibilityForTests();
  });

  it("loads a persisted result after process memory is cleared", async () => {
    await saveOrganizationEligibility(record());
    resetOrganizationEligibilityForTests();
    expect((await loadOrganizationEligibility("org_durable_1"))?.currently_valid).toBe(true);
    expect(await findOrganizationByDerivation("derivation_1")).toMatchObject({ organization_ref: "org_durable_1" });
    expect(await findOrganizationBySubjectBinding({ partner_hmac: "partner_hmac_1", subject_binding_hash: "subject_1" }))
      .toMatchObject({ organization_ref: "org_durable_1" });
    expect(await listOrganizationEligibilityMatching(matchingInput())).toHaveLength(1);
    expect(await listOrganizationEligibilityMatching({ ...matchingInput(), result_category: "authorized_signer" })).toHaveLength(0);
  });

  it("sees a later revocation instead of a stale active memory entry", async () => {
    await saveOrganizationEligibility(record());
    expect((await loadOrganizationEligibility("org_durable_1"))?.currently_valid).toBe(true);
    const revoked = { ...record(), status: "revoked" as const, revoked_at: new Date().toISOString(), currently_valid: false };
    durable.rows.set(revoked.organization_ref, revoked);
    expect((await loadOrganizationEligibility("org_durable_1"))?.currently_valid).toBe(false);
    expect((await listOrganizationEligibilityMatching(matchingInput()))[0]?.status).toBe("revoked");
  });

  it("fails closed when the durable store cannot be read", async () => {
    await saveOrganizationEligibility(record());
    durable.unavailable = true;
    await expect(loadOrganizationEligibility("org_durable_1")).rejects.toMatchObject({ code: "schema_unavailable" });
    await expect(listOrganizationEligibilityMatching(matchingInput())).rejects.toMatchObject({ code: "schema_unavailable" });
    await expect(findOrganizationByDerivation("derivation_1")).rejects.toMatchObject({ code: "schema_unavailable" });
    await expect(findOrganizationBySubjectBinding({ partner_hmac: "partner_hmac_1", subject_binding_hash: "subject_1" }))
      .rejects.toMatchObject({ code: "schema_unavailable" });
  });
});
