// FILE: lib/passport/build582.productionActivationBoundary.test.ts

import { describe, expect, it } from "vitest";
import { buildProductionActivationBoundaryReport } from "./build582/productionActivationBoundary";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "@/lib/passport/productionMigrationRelease";

describe("Build #582 Production activation boundary report", () => {
  it("never claims Production migrations are applied without evidence", () => {
    const report = buildProductionActivationBoundaryReport({});
    expect(report.production_supabase_project_ref).toBe(PRODUCTION_SUPABASE_PROJECT_REF);
    expect(report.migrations_136_143_applied_in_production).toBe("blocked_by_gates");
    expect(report.passport_issuer_signing_in_production).toContain("blocked");
    expect(report.institutional_sandbox_partner_flow).toBe("available_without_founder");
    expect(report.blockers.some((b) => b.code === "production_ddl")).toBe(true);
  });

  it("separates tiers without collapsing readiness", () => {
    const report = buildProductionActivationBoundaryReport({});
    expect(Object.keys(report.tiers)).toHaveLength(6);
    expect(report.tiers.founder_authorization_blocked).toMatch(/Founder/i);
  });
});
