// FILE: lib/institutionalCertification/build762/build762.test.ts

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generateBuild762InstitutionalTrustReport } from "./generateReport";
import { runEphemeralSandboxTrustHappyPath } from "./ephemeralSandboxTrustJourney";

const REPORT_PATH =
  process.env.BUILD_762_REPORT?.trim()
  || "reports/build-762-institutional-trust-transaction.json";

describe("institutional trust transaction runner", () => {
  it("executes holder authorization, policy decision, and independent verification", async () => {
    const happy = await runEphemeralSandboxTrustHappyPath();
    expect(happy.decision).toBe("approved");
    expect(happy.independent.signature_authentic).toBe(true);
    expect(happy.independent.currently_acceptable).toBe(true);
    expect(happy.receipt.test_only).toBe(true);
  });

  it("generates a complete certification report with passing negative cases", async () => {
    const report = await generateBuild762InstitutionalTrustReport();
    expect(report.status.implemented).toBe(true);
    expect(report.status.issuer_operational).toBe(false);
    expect(report.status.production_authorized).toBe(false);
    expect(report.independent_verification.without_wallet_session).toBe(true);
    const failedNegatives = report.negative_cases.filter((c) => c.verdict !== "pass");
    expect(failedNegatives, JSON.stringify(failedNegatives, null, 2)).toEqual([]);
    expect(report.independent_verification.signature_authentic).toBe(true);
    expect(report.status.cryptographically_tested).toBe(true);

    if (process.env.BUILD_762_WRITE_REPORT === "1") {
      const outPath = resolve(process.cwd(), REPORT_PATH);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    }
  });
});
