// FILE: tests/staging/launchpad-staging-smoke.spec.ts

import { test, expect } from "@playwright/test";
import { parseStagingTargetFromEnv } from "../../scripts/launchpad-staging-smoke/guards";
import { executeStagingSmoke } from "../../scripts/launchpad-staging-smoke/walkthrough";

test.describe.configure({ mode: "serial" });

test("Partner Launchpad staging smoke walkthrough", async () => {
  const config = parseStagingTargetFromEnv();
  const { report, reportPath } = await executeStagingSmoke(config);
  expect(report.overallVerdict, `Report: ${reportPath}`).toBe("PASS");
});
