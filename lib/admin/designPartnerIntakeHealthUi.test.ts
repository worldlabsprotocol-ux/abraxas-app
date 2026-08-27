// FILE: lib/admin/designPartnerIntakeHealthUi.test.ts

import { describe, expect, it } from "vitest";
import {
  DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER,
  MIGRATION_071_OPERATOR_ATTESTATION,
  resolveOverallStatus,
  type DesignPartnerIntakeHealthReport,
} from "@/lib/admin/designPartnerIntakeHealthContract";
import {
  intakeHealthBlockers,
  intakeHealthHeadline,
  parseDesignPartnerIntakeHealthResponse,
} from "@/lib/admin/designPartnerIntakeHealthUi";

function buildReport(
  overrides: Partial<Record<(typeof DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER)[number], "pass" | "fail">>,
  runtime: "production" | "non_production" = "production",
): DesignPartnerIntakeHealthReport {
  const checks = DESIGN_PARTNER_INTAKE_HEALTH_CHECK_ORDER.map((key) => ({
    key,
    status: overrides[key] ?? "pass",
  }));
  const report: DesignPartnerIntakeHealthReport = {
    generated_at: "2026-08-27T00:00:00.000Z",
    overall_status: "ready",
    runtime_environment: runtime,
    checks,
    operator_attestation: {
      migration_071: MIGRATION_071_OPERATOR_ATTESTATION,
    },
  };
  report.overall_status = resolveOverallStatus(report);
  return report;
}

describe("designPartnerIntakeHealthUi", () => {
  it("uses the same rollup table as the contract", () => {
    const report = buildReport({
      rate_limiting_enabled: "fail",
      production_intake_rate_limit_ready: "fail",
    });
    expect(resolveOverallStatus(report)).toBe("misconfigured");
    expect(parseDesignPartnerIntakeHealthResponse(report).overall_status).toBe("misconfigured");
  });

  it("marks non-production disabled rate limiting as degraded", () => {
    const report = buildReport({ rate_limiting_enabled: "fail" }, "non_production");
    expect(resolveOverallStatus(report)).toBe("degraded");
    expect(intakeHealthHeadline(report.overall_status)).toBe("Degraded");
  });

  it("rejects malformed responses", () => {
    expect(() => parseDesignPartnerIntakeHealthResponse({ overall_status: "ready" })).toThrow();
  });

  it("returns fixed blocker copy without env interpolation", () => {
    const report = buildReport({ intake_route_configured: "fail" });
    expect(intakeHealthBlockers(report)).toEqual([
      "Application intake database configuration is missing.",
    ]);
  });
});
