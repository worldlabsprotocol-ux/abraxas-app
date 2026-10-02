// FILE: lib/operations/scaleReadiness/scaleReadiness.test.ts

import { describe, expect, it } from "vitest";
import { buildScaleReadinessReport } from "./evaluate";
import { SCALE_READINESS_SCOPE_NOTICE } from "./contract";
import { INTEGRATION_STUDIO_PROVISION } from "@/lib/partner/integrationStudio/contract";

describe("scale readiness report", () => {
  it("returns machine-readable checks without vanity percentages", async () => {
    const report = await buildScaleReadinessReport();
    expect(report.schema_version).toBe("1.0.0");
    expect(report.scope_notice).toBe(SCALE_READINESS_SCOPE_NOTICE);
    expect(report.checks.length).toBeGreaterThan(5);
    const checksJson = JSON.stringify(report.checks);
    expect(checksJson).not.toMatch(/internet scale|enterprise scale|infinitely scalable/i);
    expect(report.checks.some((row) => row.id === "production_review_gate")).toBe(true);
  });

  it("reports durable provenance, consent, and oauth JTI stores", async () => {
    const report = await buildScaleReadinessReport();
    const provenance = report.checks.find((row) => row.id === "provenance_session_store");
    const consent = report.checks.find((row) => row.id === "organization_consent_store");
    const oauth = report.checks.find((row) => row.id === "oauth_jti_replay_guard");
    expect(provenance?.signal).toBe("healthy");
    expect(consent?.signal).toBe("healthy");
    expect(oauth?.signal).toBe("healthy");
    expect(oauth?.detail).not.toContain("process-local");
  });

  it("confirms sandbox self-service is enabled", async () => {
    const report = await buildScaleReadinessReport();
    const sandbox = report.checks.find((row) => row.id === "sandbox_self_service");
    expect(sandbox?.signal).toBe(INTEGRATION_STUDIO_PROVISION.self_serve_sandbox ? "healthy" : "blocked");
  });
});
