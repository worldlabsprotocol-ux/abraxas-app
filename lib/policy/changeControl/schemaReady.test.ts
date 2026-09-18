import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PolicyChangeControlError,
  assertPolicyVersionIssuable,
  evaluatePolicyVersionGate,
} from "@/lib/policy/changeControl";
import {
  isPolicySchemaMissingError,
  probePolicyChangeControlSchema,
  assertPolicyChangeControlSchemaReady,
  policySchemaUnavailableResult,
} from "@/lib/policy/changeControl/schemaReady";
import type { PartnerPolicy } from "@/lib/policy/types";

function clientReturning(errors: Record<string, { code?: string; message?: string } | null>) {
  return {
    from(table: string) {
      return {
        select(columns?: string) {
          const key = table === "partner_policies" && columns === "deprecate_effective_at"
            ? "partner_policies.deprecate_effective_at"
            : table;
          const error = Object.prototype.hasOwnProperty.call(errors, key)
            ? errors[key]
            : Object.prototype.hasOwnProperty.call(errors, table)
              ? errors[table]
              : null;
          return {
            limit: async () => ({ data: null, error, count: 0 }),
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

const READY = {
  "partner_policy_lifecycle_audit": null,
  "partner_policy_adoptions": null,
  "partner_policies.deprecate_effective_at": null,
} as const;

describe("Policy Change Control schema readiness", () => {
  it("classifies 42P01, PGRST202/PGRST205, and does-not-exist as missing schema", () => {
    expect(isPolicySchemaMissingError({ code: "42P01", message: 'relation "x" does not exist' })).toBe(true);
    expect(isPolicySchemaMissingError({ code: "PGRST202", message: "Could not find the function" })).toBe(true);
    expect(isPolicySchemaMissingError({ code: "PGRST205", message: "Could not find the table in the schema cache" })).toBe(true);
    expect(isPolicySchemaMissingError({ message: 'column "deprecate_effective_at" does not exist' })).toBe(true);
    expect(isPolicySchemaMissingError({ code: "PGRST204", message: "Could not find the 'deprecate_effective_at' column of 'partner_policies' in the schema cache" })).toBe(true);
    expect(isPolicySchemaMissingError({ code: "42501", message: "permission denied" })).toBe(false);
  });

  it("fails closed when the lifecycle audit table is missing", async () => {
    const probe = await probePolicyChangeControlSchema(clientReturning({
      ...READY,
      partner_policy_lifecycle_audit: { code: "42P01", message: 'relation "partner_policy_lifecycle_audit" does not exist' },
    }));
    expect(probe.lifecycle_audit).toBe(false);
    expect(probe.ready).toBe(false);
    expect(JSON.stringify(probe)).not.toMatch(/42P01|does not exist|partner_policy_lifecycle_audit"/);
  });

  it("fails closed when the adoptions table is missing", async () => {
    const probe = await probePolicyChangeControlSchema(clientReturning({
      ...READY,
      partner_policy_adoptions: { code: "PGRST205", message: "Could not find the table 'public.partner_policy_adoptions' in the schema cache" },
    }));
    expect(probe.adoptions).toBe(false);
    expect(probe.ready).toBe(false);
    expect(JSON.stringify(probe)).not.toContain("PGRST205");
  });

  it("fails closed when deprecate_effective_at is missing", async () => {
    const probe = await probePolicyChangeControlSchema(clientReturning({
      ...READY,
      "partner_policies.deprecate_effective_at": {
        code: "PGRST204",
        message: "Could not find the 'deprecate_effective_at' column of 'partner_policies' in the schema cache",
      },
    }));
    expect(probe.deprecate_effective_at).toBe(false);
    expect(probe.ready).toBe(false);
  });

  it("requires all three capabilities before becoming ready", async () => {
    const probe = await probePolicyChangeControlSchema(clientReturning(READY));
    expect(probe).toEqual({
      ready: true,
      lifecycle_audit: true,
      adoptions: true,
      deprecate_effective_at: true,
    });
    await expect(assertPolicyChangeControlSchemaReady(clientReturning(READY))).resolves.toBeUndefined();
    await expect(assertPolicyChangeControlSchemaReady(clientReturning({
      ...READY,
      partner_policy_adoptions: { code: "PGRST202", message: "Could not find the relationship" },
    }))).rejects.toBeInstanceOf(PolicyChangeControlError);
  });

  it("returns a stable typed unavailable result without raw database errors", () => {
    const result = policySchemaUnavailableResult({ application_id: "app-1", pinned_version: 1 });
    expect(result).toEqual({
      ok: false,
      code: "policy_schema_unavailable",
      error: "policy_schema_unavailable",
      available: false,
      feature: "policy_change_control",
      application_id: "app-1",
      pinned_version: 1,
    });
    expect(JSON.stringify(result)).not.toMatch(/42P01|PGRST|does not exist/);
  });

  it("keeps active-policy issuance working without a Launchpad policy context", () => {
    const policy: PartnerPolicy = {
      id: "partner-acme-age_21_retail-v1",
      partner_id: "partner-acme",
      version: 1,
      name: "Age 21",
      status: "active",
      effective_at: "2026-01-01T00:00:00.000Z",
      rules_json: { required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }] },
    };
    const gate = evaluatePolicyVersionGate({
      policy,
      partnerId: "partner-acme",
      mode: "production_receipt",
    });
    expect(gate.ok).toBe(true);
    expect(assertPolicyVersionIssuable({
      policy,
      partnerId: "partner-acme",
    }).version).toBe(1);
  });
});
