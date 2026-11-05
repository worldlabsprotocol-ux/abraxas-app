import { describe, expect, it } from "vitest";
import { presentIntegrationTestFailure } from "./integrationTestFailure";

describe("integration test failure presentation", () => {
  it("identifies unavailable durable receipt issuance as an action-required state", () => {
    expect(presentIntegrationTestFailure(503, {
      code: "launchpad_signing_unavailable",
      error: "Sandbox receipt issuance is temporarily unavailable",
    })).toEqual({
      kind: "action_required",
      headline: "Sandbox receipt service unavailable",
      detail: "Abraxas could not issue the verifiable sandbox receipt, so no test was run. Check again after the receipt service is restored.",
      actionLabel: "Check again",
      refreshSession: false,
    });
  });

  it("routes an ended partner session through sign-in recovery", () => {
    expect(presentIntegrationTestFailure(401, { code: "launchpad_unauthorized" })).toMatchObject({
      kind: "action_required",
      headline: "Sign-in required",
      actionLabel: "Resume sign-in",
      refreshSession: true,
    });
  });

  it("preserves safe structured callback and rate-limit explanations", () => {
    expect(presentIntegrationTestFailure(400, {
      code: "launchpad_return_url_rejected",
      error: "That callback URL is not allowed.",
    }).detail).toBe("That callback URL is not allowed.");
    expect(presentIntegrationTestFailure(429, {
      code: "launchpad_rate_limited",
      retry_after_sec: 12,
    }).detail).toContain("12 seconds");
  });

  it("labels an unknown execution error as a failed test without exposing raw codes", () => {
    const presented = presentIntegrationTestFailure(500, { code: "internal_database_detail" });
    expect(presented.kind).toBe("test_failed");
    expect(presented.detail).not.toContain("internal_database_detail");
  });
});

