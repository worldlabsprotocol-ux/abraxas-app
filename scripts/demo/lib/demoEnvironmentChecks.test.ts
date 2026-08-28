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
  const selectProbes: string[] = [];
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
          selectProbes.push(table);
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
          const entry = config[table] as {
            row?: unknown;
            error?: { message: string; code?: string };
            status?: number;
          } | undefined;
          if (!entry) {
            return { data: null, error: null, count: 0, status: 200 };
          }
          if (entry && typeof entry === "object" && "error" in entry && entry.error) {
            return {
              data: null,
              error: entry.error,
              count: 0,
              status: entry.status ?? 400,
            };
          }
          if (entry && typeof entry === "object" && "row" in entry) {
            return { data: entry.row, error: null, count: entry.row ? 1 : 0, status: 200 };
          }
          if (entry && typeof entry === "object" && "ok" in entry) {
            return { data: null, error: null, count: 0, status: 200 };
          }
          if (entry && typeof entry === "object" && "count" in entry) {
            return {
              data: null,
              error: null,
              count: (entry as { count: number }).count,
              status: (entry as { status?: number }).status ?? 200,
            };
          }
          return { data: null, error: null, count: 1, status: 200 };
        },
        then(onFulfilled: (value: unknown) => unknown) {
          const entry = config[table] as {
            count?: number;
            error?: { message: string; code?: string };
            status?: number;
          } | undefined;
          if (entry?.error) {
            return Promise.resolve(
              onFulfilled({
                data: null,
                error: entry.error,
                count: null,
                status: entry.status ?? 400,
              }),
            );
          }
          return Promise.resolve(
            onFulfilled({
              data: null,
              error: null,
              count: entry?.count ?? 1,
              status: entry?.status ?? 200,
            }),
          );
        },
      };

      return builder;
    },
    getSelectProbes() {
      return [...selectProbes];
    },
  };
}

describe("demoEnvironmentChecks", () => {
  it("scans validator runtime modules with the read-only policy", () => {
    expect(() => assertReadOnlyPolicyModules()).not.toThrow();
  });

  it("classifies permission_denied for required table probe", async () => {
    const client = makeClient({
      partners: { error: { message: "permission denied for table partners", code: "42501" } },
    });

    const report = await runEnvironmentChecks({ client: client as never });
    const partners = report.results.find((r) => r.id === "table_partners");
    expect(partners?.detail).toContain("permission_denied");
    expect(partners?.detail).toContain("42501");
    expect(partners?.detail).not.toContain("permission denied for table");
  });

  it("classifies schema cache errors for required table probe", async () => {
    const client = makeClient({
      partners: { error: { message: "", code: "PGRST205" }, status: 404 },
    });

    const report = await runEnvironmentChecks({ client: client as never });
    const partners = report.results.find((r) => r.id === "table_partners");
    expect(partners?.detail).toContain("schema_cache_unavailable");
    expect(partners?.detail).toContain("http=404");
    expect(partners?.detail).toContain("op=head_count");
    expect(partners?.detail).not.toBe("Query error: ");
  });

  it("surfaces HTTP status for uniform unknown REST failures", async () => {
    const client = makeClient({
      partners: { error: { message: "", code: "" }, status: 401 },
      partner_policies: { error: { message: "", code: "" }, status: 401 },
      credential_issuers: { error: { message: "", code: "" }, status: 401 },
    });

    const report = await runEnvironmentChecks({ client: client as never });
    const partners = report.results.find((r) => r.id === "table_partners");
    expect(partners?.detail).toContain("authentication_failed");
    expect(partners?.detail).toContain("http=401");
    expect(partners?.detail).toContain("fp=");
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

  it("does not SELECT-probe audit_events and still exits READY", async () => {
    const client = makeClient({
      audit_events: {
        error: { message: "", code: "" },
        status: 403,
      },
    });

    const report = await runEnvironmentChecks({ client: client as never });
    const auditEvents = report.results.find((r) => r.id === "table_audit_events");

    expect(client.getSelectProbes()).not.toContain("audit_events");
    expect(auditEvents?.status).toBe("unverifiable");
    expect(auditEvents?.catalogValidatedOnly).toBe(true);
    expect(auditEvents?.detail).toContain("No REST SELECT probe");
    expect(auditEvents?.evidence).toContain("No REST SELECT probe");
    expect(auditEvents?.evidence).not.toContain("authorization_denied");
    expect(report.exitCode).toBe(0);
  });

  it("fails closed when a SELECT-expected table returns HTTP 403", async () => {
    const client = makeClient({
      partners: { error: { message: "", code: "" }, status: 403 },
    });

    const report = await runEnvironmentChecks({ client: client as never });
    const partners = report.results.find((r) => r.id === "table_partners");

    expect(client.getSelectProbes()).toContain("partners");
    expect(partners?.status).toBe("fail");
    expect(partners?.detail).toContain("authorization_denied");
    expect(partners?.detail).toContain("http=403");
    expect(partners?.detail).not.toContain("secret");
    expect(report.exitCode).toBe(1);
  });

  it("does not emit mutation patterns in write-only table evidence", async () => {
    const client = makeClient();
    const report = await runEnvironmentChecks({ client: client as never });
    const auditEvents = report.results.find((r) => r.id === "table_audit_events");
    const serialized = JSON.stringify(report.results);

    expect(auditEvents?.evidence).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
    expect(serialized).not.toContain("service_role");
    expect(serialized).not.toMatch(/Bearer\s|eyJ[a-zA-Z0-9_-]+\./);
  });

  it("sets catalogValidatedOnly only on frozen write-only required tables", async () => {
    const client = makeClient();
    const report = await runEnvironmentChecks({ client: client as never });
    const catalogValidated = report.results.filter((r) => r.catalogValidatedOnly);

    expect(catalogValidated.map((r) => r.id)).toEqual(["table_audit_events"]);
    expect(report.results.every((r) => r.status !== "fail" || !r.catalogValidatedOnly)).toBe(true);
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
