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
    const previous = process.env.ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER;
    delete process.env.ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER;
    const row = resolveSandboxPolicyAvailability("age_21_retail");
    expect(row?.can_request_verification).toBe(false);
    expect(row?.execution_status).toBe("evidence_unavailable");
    if (previous === undefined) delete process.env.ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER;
    else process.env.ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER = previous;
  });

  it("enables age 21 when authorized test issuer is configured", () => {
    const previous = process.env.ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER;
    process.env.ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER = "1";
    const row = resolveSandboxPolicyAvailability("age_21_retail");
    expect(row?.can_request_verification).toBe(true);
    expect(row?.execution_status).toBe("ready");
    expect(row?.age_experience).toBe("age_21_test");
    if (previous === undefined) delete process.env.ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER;
    else process.env.ABRAXAS_EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER = previous;
  });
});
