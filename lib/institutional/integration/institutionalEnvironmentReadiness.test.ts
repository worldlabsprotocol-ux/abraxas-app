import { describe, expect, it } from "vitest";
import { evaluateInstitutionalEnvironmentReadiness } from "@/lib/institutional/integration/institutionalEnvironmentReadiness";

describe("evaluateInstitutionalEnvironmentReadiness", () => {
  it("never equates deployment success with production readiness", async () => {
    const report = await evaluateInstitutionalEnvironmentReadiness();
    expect(report.vercel_ready_is_not_production_ready).toBe(true);
    expect(report.checks.some(c => c.id === "vercel_not_production")).toBe(true);
    expect(["PASS", "FAIL", "BLOCKED"]).toContain(report.overall);
  });
});
