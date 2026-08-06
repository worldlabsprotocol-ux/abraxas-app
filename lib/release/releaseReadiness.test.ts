import { describe, expect, it } from "vitest";
import {
  formatReleaseReadinessReport,
  runReleaseReadiness,
} from "@/lib/release/releaseReadinessRunner";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");

describe("runReleaseReadiness", () => {
  it("never claims full IAT or security review on current walkthrough doc", async () => {
    const result = await runReleaseReadiness(
      {
        baseUrl: null,
        rootDir: ROOT,
        walkthroughPath: "docs/PRODUCTION_WALKTHROUGH_RESULTS.md",
        securityReviewArtifactPath: "reports/external-security-review/independent-review.md",
        runRegression: false,
        runIatAutomated: false,
      },
      {
        fetch: globalThis.fetch,
        readFile: (path) => readFileSync(path, "utf8"),
        fileExists: (path) => {
          try {
            readFileSync(path);
            return true;
          } catch {
            return false;
          }
        },
        env: {},
        exec: () => {},
      },
    );

    expect(result.fullIatClaimed).toBe(false);
    expect(result.securityReviewClaimed).toBe(false);
    expect(result.checks.find(c => c.id === "iat-scenarios-a-d")?.status).toBe("human_required");
    expect(result.checks.find(c => c.id === "external-security-review")?.status).toBe("blocked");
    expect(result.exitCode).toBe(0);
  });

  it("formats PASS / FAIL / PENDING / HUMAN_REQUIRED / BLOCKED in report", async () => {
    const result = await runReleaseReadiness(
      {
        baseUrl: null,
        rootDir: ROOT,
        walkthroughPath: "docs/PRODUCTION_WALKTHROUGH_RESULTS.md",
        securityReviewArtifactPath: "reports/external-security-review/independent-review.md",
        runRegression: false,
        runIatAutomated: false,
      },
      {
        fetch: globalThis.fetch,
        readFile: (path) => readFileSync(path, "utf8"),
        fileExists: (path) => {
          try {
            readFileSync(path);
            return true;
          } catch {
            return false;
          }
        },
        env: {},
        exec: () => {},
      },
    );

    const report = formatReleaseReadinessReport(result);
    expect(report).toContain("Implemented and deployed");
    expect(report).toContain("Human evidence still required");
    expect(report).toContain("Independent security review pending");
    expect(report).toContain("Second relying-party pilot pending");
    expect(report).toContain("Beta tag pending");
    expect(report).toContain("Full IAT claimed: No");
    expect(report).toContain("Security review claimed: No");
  });
});
