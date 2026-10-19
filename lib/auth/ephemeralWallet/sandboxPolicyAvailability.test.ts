// FILE: lib/auth/ephemeralWallet/sandboxPolicyAvailability.test.ts

import { describe, expect, it } from "vitest";
import { resolveSandboxPolicyAvailability } from "./sandboxPolicyAvailability";

describe("resolveSandboxPolicyAvailability", () => {
  it("marks wallet control as ready to test", () => {
    const row = resolveSandboxPolicyAvailability("wallet_control");
    expect(row?.can_request_verification).toBe(true);
    expect(row?.execution_status).toBe("ready");
  });

  it("blocks age 21 before authorization when issuer evidence is unavailable", () => {
    const row = resolveSandboxPolicyAvailability("age_21_retail");
    expect(row?.can_request_verification).toBe(false);
    expect(row?.execution_status).toBe("evidence_unavailable");
  });
});
