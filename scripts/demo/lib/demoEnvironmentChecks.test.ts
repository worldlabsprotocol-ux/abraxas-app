import { describe, expect, it } from "vitest";
import {
  formatValidationReport,
  runEnvironmentChecks,
} from "./demoEnvironmentChecks";
import {
  assertReadOnlyPolicyModules,
  findReadOnlyPolicyViolations,
} from "./demoReadOnlyPolicy";

function makeClient(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    partners: { count: 1, row: { partner_id: "abraxas-partner-sandbox", status: "sandbox" } },
    partner_policies: {
      row: {
        id: "partner-sandbox-gate-v1",
        partner_id: "abraxas-partner-sandbox",
        status: "active",
        rules_json: {
          sandbox_only: true,
          required_claims: [
            { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
            { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
            { claim_type: "screening_outcome", max_age_hours: 24, must_equal: "clear" },
          ],
        },
      },
    },
    credential_issuers: { row: { id: "issuer:abraxas-sandbox", issuer_status: "active" } },
    partner_webhook_configs: { row: null },
    verification_decisions: { ok: true },
    identity_verifications: { row: null },
  };

  const config = { ...defaults, ...overrides };

  return {
    from(table: string) {
      const state = {
        filters: [] as Array<[string, string]>,
        selected: "*",
      };

      const builder = {
        select(_cols: string, _opts?: unknown) {
          return builder;
        },
        eq(column: string, value: string) {
          state.filters.push([column, value]);
          return builder;
        },
        or(_expr: string) {
          return builder;
        },
        limit(_n: number) {
          return builder;
        },
        maybeSingle: async () => {
          const entry = config[table] as { row?: unknown; error?: { message: string; code?: string } } | undefined;
          if (!entry) {
            return { data: null, error: null, count: 0 };
          }
          if (entry && typeof entry === "object" && "error" in entry && entry.error) {
            return { data: null, error: entry.error, count: 0 };
          }
          if (entry && typeof entry === "object" && "row" in entry) {
            return { data: entry.row, error: null, count: entry.row ? 1 : 0 };
          }
          if (entry && typeof entry === "object" && "ok" in entry) {
            return { data: null, error: null, count: 0 };
          }
          if (entry && typeof entry === "object" && "count" in entry) {
            return { data: null, error: null, count: (entry as { count: number }).count };
          }
          return { data: null, error: null, count: 1 };
        },
        then(onFulfilled: (value: unknown) => unknown) {
          const entry = config[table] as { count?: number; error?: { message: string; code?: string } } | undefined;
          if (entry?.error) {
            return Promise.resolve(onFulfilled({ data: null, error: entry.error, count: null }));
          }
          return Promise.resolve(onFulfilled({ data: null, error: null, count: entry?.count ?? 1 }));
        },
      };

      return builder;
    },
  };
}

describe("demoEnvironmentChecks", () => {
  it("scans validator runtime modules with the read-only policy", () => {
    expect(() => assertReadOnlyPolicyModules()).not.toThrow();
  });

  it("returns exit 1 when required table missing", async () => {
    const client = makeClient({
      decision_receipts: { error: { message: 'relation "decision_receipts" does not exist', code: "42P01" } },
    });

    const report = await runEnvironmentChecks({ client: client as never });
    expect(report.exitCode).toBe(1);
    expect(report.results.some((r) => r.id === "table_decision_receipts" && r.status === "fail")).toBe(true);
  });

  it("returns exit 1 when a required extension probe reports missing", async () => {
    const client = makeClient();
    const report = await runEnvironmentChecks({
      client: client as never,
      extensionProbe: async () => "missing",
    });
    expect(report.exitCode).toBe(1);
    expect(report.results.some((r) => r.id === "extension_pgcrypto" && r.status === "fail")).toBe(true);
  });

  it("reports catalog checks as UNVERIFIABLE instead of PASS", async () => {
    const client = makeClient();
    const report = await runEnvironmentChecks({ client: client as never });
    const catalog = report.results.find((r) => r.id === "catalog_pg_policies");
    expect(catalog?.status).toBe("unverifiable");
    expect(catalog?.evidence).toContain("pg_catalog");
  });

  it("returns exit 2 for invalid demo subject configuration", async () => {
    const client = makeClient();
    const report = await runEnvironmentChecks({
      client: client as never,
      demoSubjectId: "not-an-address",
    });
    expect(report.exitCode).toBe(2);
    expect(report.results.some((r) => r.id === "demo_subject_config" && r.status === "fail")).toBe(true);
  });

  it("reports optional webhook infrastructure without requiring delivery", async () => {
    const client = makeClient({
      partner_webhook_configs: { row: null },
    });
    const report = await runEnvironmentChecks({ client: client as never });
    const webhook = report.results.find((r) => r.id === "webhook_delivery");
    expect(webhook?.status).toBe("pass");
    expect(webhook?.optional).toBe(true);
    expect(webhook?.evidence).toContain("partner_webhook_configs");
  });

  it("formats validation report without secrets", () => {
    const output = formatValidationReport({
      exitCode: 0,
      results: [
        { id: "x", label: "Test", status: "pass", detail: "ok", evidence: "client.from(\"partners\")" },
      ],
    });
    expect(output).toContain("Result: READY");
    expect(output).toContain("evidence:");
    expect(output).not.toContain("service-role");
  });
});

describe("demoMigrationManifest", () => {
  it("lists provenance for core tables", async () => {
    const { OBJECT_PROVENANCE } = await import("./demoMigrationManifest");
    expect(OBJECT_PROVENANCE.identity_verifications).toBe("006_abraxas_id.sql");
    expect(OBJECT_PROVENANCE.partner_webhook_outbox).toBe("062_partner_webhook_outbox.sql");
  });
});

describe("demoReadOnlyPolicy", () => {
  it("rejects representative forbidden patterns in sample source", () => {
    const sample = `
      await client.from("partners").insert({ partner_id: "x" });
      await client.from("partners").update({ status: "sandbox" });
      await client.from("partners").upsert({ partner_id: "x" });
      await client.from("partners").delete().eq("partner_id", "x");
      await client.rpc("publish_partner_policy_draft");
      await fetch("/api/demo", { method: "POST", body: "{}" });
      await client.storage.from("bucket").upload("path", file);
    `;

    const violations = findReadOnlyPolicyViolations(sample, "sample.ts");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.pattern.includes("insert"))).toBe(true);
    expect(violations.some((v) => v.pattern.includes("rpc"))).toBe(true);
  });
});
