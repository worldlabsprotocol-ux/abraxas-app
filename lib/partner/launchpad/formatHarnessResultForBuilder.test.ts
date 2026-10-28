// FILE: lib/partner/launchpad/formatHarnessResultForBuilder.test.ts

import { describe, expect, it } from "vitest";
import { formatHarnessResultForBuilder } from "./formatHarnessResultForBuilder";

describe("formatHarnessResultForBuilder", () => {
  it("maps allow harness to plain success copy", () => {
    const view = formatHarnessResultForBuilder({
      scenario_id: "approved",
      simulated: false,
      passed: true,
      expected_access: "allow_sandbox",
      observed_access: "allow",
      validity: "active",
      invalidation_reasons: [],
      signature_valid: true,
      production_usable: false,
      callback_params: { receipt_id: "rcpt_1", decision: "approved", status: "active" },
      pii_scan_passed: true,
      signing_source: "harness_dev",
      persistence: { receipt_id: "rcpt_1", public_payload: {}, signature: "", expires_at: "" },
      replay_second_pass: true,
      verification_path: "test",
      policy_template_id: "wallet_control",
      policy_id: "pol_1",
      hosted_verify_url: "https://example.com/verify",
      return_url: "http://localhost:3000/callback",
      timestamp: new Date().toISOString(),
    });
    expect(view.headline).toBe("Your test worked.");
    expect(view.tone).toBe("success");
    expect(view.receiptId).toBe("rcpt_1");
  });
});
