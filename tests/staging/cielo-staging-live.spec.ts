// FILE: tests/staging/cielo-staging-live.spec.ts
// Reuses Build #499 Playwright staging gate — no fake sessions.

import { test, expect } from "@playwright/test";
import { buildCieloStagingActivationReport } from "@/lib/cielo/cieloStagingActivation";

test.describe.configure({ mode: "serial" });

test("Cielo staging preflight (demo Supabase + preview URL required)", async () => {
  const report = await buildCieloStagingActivationReport(process.env);
  if (report.overall === "blocked" || report.overall === "operator_setup_required") {
    test.skip(true, `Staging blocked: ${report.blockers.join(", ")}`);
  }
  expect(report.overall).toBe("ready_to_execute");
  expect(report.merchant.partner_id).toBe("cielo");
  expect(report.merchant.policy_id).toBe("cielo-verified-guest-v1");
});
