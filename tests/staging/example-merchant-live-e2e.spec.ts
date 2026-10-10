// FILE: tests/staging/example-merchant-live-e2e.spec.ts

import { test, expect } from "@playwright/test";
import { runStagingLiveE2ePreflight } from "@/lib/partner/universalIntegration/stagingConfigContract";

test.describe.configure({ mode: "serial" });

test("Example Merchant live E2E preflight (staging env required)", async () => {
  const preflight = runStagingLiveE2ePreflight(process.env);
  if (!preflight.ok) {
    test.skip(true, `Staging not configured: ${preflight.errors.join(", ")}`);
  }
  expect(preflight.config?.rp.partnerId).toBeTruthy();
  expect(preflight.config?.rp.policyId).toBeTruthy();
});
