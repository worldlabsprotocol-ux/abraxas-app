import { describe, expect, it } from "vitest";
import { auditBuild549Prerequisites } from "./environmentAudit";
import { runBuild549Certification } from "./generateReport";

describe("Build #549 live institutional certification", () => {
  it("audits prerequisites without printing secret values", () => {
    const audit = auditBuild549Prerequisites({
      LAUNCHPAD_STAGING_URL: "https://preview.example.vercel.app",
      VERCEL_PROTECTION_BYPASS: "test-bypass",
    });
    expect(audit.configured).toContain("LAUNCHPAD_STAGING_URL");
    expect(audit.missing.some((m) => m.includes("PARTNER_FLOW_RP_PARTNER_ID"))).toBe(true);
  });

  it("generates report with live institutional blocked when holder creds missing", async () => {
    const report = await runBuild549Certification();
    expect(report.build).toBe("549");
    expect(report.summary.live_institutional_certification).toBe("blocked");
    expect(report.cases.some((c) => c.test_id === "live_holder_passport_to_receipt")).toBe(true);
    expect(report.summary.fail).toBe(0);
  });
});
