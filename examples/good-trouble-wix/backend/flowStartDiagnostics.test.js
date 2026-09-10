// FILE: examples/good-trouble-wix/backend/flowStartDiagnostics.test.js

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ALLOWLISTED_FLOW_START_ERROR_CODES,
  buildFlowStartFailure,
  buildFlowStartSuccess,
  logFlowStartFailure,
  mapThrownErrorToStartCode,
} from "./flowStartDiagnostics.js";

describe("flowStartDiagnostics", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs only allowlisted fields", () => {
    logFlowStartFailure({
      stage: "capacity_precheck",
      code: "rate_limited",
      purpose: "purchase",
      policyId: "good-trouble-retail-v1",
      correlationId: "abc123",
    });

    expect(console.info).toHaveBeenCalledOnce();
    const payload = JSON.parse(String(console.info.mock.calls[0][0]));
    expect(payload).toEqual({
      event: "abraxas_flow_start_failed",
      stage: "capacity_precheck",
      code: "rate_limited",
      purpose: "purchase",
      policyId: "good-trouble-retail-v1",
      correlationId: "abc123",
    });
    expect(JSON.stringify(payload)).not.toMatch(/verifier|challenge|receipt|token|dob/i);
  });

  it("maps invalid Wix count throws to capacity_count_invalid", () => {
    expect(
      mapThrownErrorToStartCode(new Error("Invalid pending-flow count returned by Wix Data")),
    ).toBe("capacity_count_invalid");
  });

  it("returns diagnostic envelope for failures", () => {
    const failure = buildFlowStartFailure({
      code: "nonce_insert_failed",
      stage: "nonce_insert",
      purpose: "purchase",
      policyId: "good-trouble-retail-v1",
      correlationId: "corr_1",
    });

    expect(failure).toEqual({
      error: "nonce_insert_failed",
      diagnostic: {
        code: "nonce_insert_failed",
        stage: "nonce_insert",
        purpose: "purchase",
        policyId: "good-trouble-retail-v1",
        correlationId: "corr_1",
      },
    });
    expect(ALLOWLISTED_FLOW_START_ERROR_CODES.has(failure.error)).toBe(true);
  });

  it("requires verifyUrl, gtf_ flowId, and verifier on success", () => {
    const success = buildFlowStartSuccess({
      verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
      flowId: `gtf_${"a".repeat(64)}`,
      verifier: "b".repeat(64),
      purpose: "purchase",
      policyId: "good-trouble-retail-v1",
      correlationId: "corr_2",
    });

    expect(success.verifyUrl).toContain("/partner/verify");
    expect(success.flowId).toMatch(/^gtf_[a-f0-9]{64}$/);
    expect(success.verifier).toHaveLength(64);
    expect(success.error).toBeUndefined();
  });
});
