// FILE: lib/protocolVerification/executeVerification.test.ts

import { describe, expect, it } from "vitest";
import { bindVerificationRequest, executeProtocolVerification } from "./executeVerification";
import { runEphemeralProtocolSandboxVerification } from "./runSandboxVerification";
import { resetEphemeralSandboxTestStoreForTests } from "@/lib/auth/ephemeralWallet/sandboxTestVerification";

describe("protocol verification", () => {
  it("approves wallet_control with wallet session binding evidence", async () => {
    const request = bindVerificationRequest({
      requestId: "req_test_wallet",
      partnerId: "ephemeral_wallet_sandbox",
      policyId: "wallet_control",
      policyVersion: 1,
      operation: "sandbox:verification:test",
      resource: "abraxas:sandbox:ws1:policy:wallet_control",
      walletAddress: "7EqQdE8f7P8K9m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b",
    });
    const outcome = await executeProtocolVerification({
      context: "sandbox_only",
      request,
      evidence: [{
        kind: "wallet_session_binding",
        wallet_address: "7EqQdE8f7P8K9m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b",
      }],
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.decision).toBe("approved");
    expect(outcome.receipt.test_only).toBe(true);
    expect(outcome.receipt.production_usable).toBe(false);
    expect(outcome.receipt.signature_valid).toBe(true);
  });

  it("rejects age_21_retail when only wallet binding is presented", async () => {
    const request = bindVerificationRequest({
      requestId: "req_test_age",
      partnerId: "ephemeral_wallet_sandbox",
      policyId: "age_21_retail",
      policyVersion: 1,
      operation: "sandbox:verification:test",
      resource: "abraxas:sandbox:ws1:policy:age_21_retail",
      walletAddress: "7EqQdE8f7P8K9m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b",
    });
    const outcome = await executeProtocolVerification({
      context: "sandbox_only",
      request,
      evidence: [{
        kind: "wallet_session_binding",
        wallet_address: "7EqQdE8f7P8K9m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b",
      }],
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe("insufficient_evidence_for_policy");
  });

  it("returns unsupported for unknown issuer presentations", async () => {
    const request = bindVerificationRequest({
      requestId: "req_unsupported",
      partnerId: "ephemeral_wallet_sandbox",
      policyId: "wallet_control",
      policyVersion: 1,
      operation: "sandbox:verification:test",
      resource: "abraxas:sandbox:ws1:policy:wallet_control",
      walletAddress: "7EqQdE8f7P8K9m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b",
    });
    const outcome = await executeProtocolVerification({
      context: "sandbox_only",
      request,
      evidence: [{ kind: "unsupported_issuer", issuer_id: "issuer:unknown_vendor" }],
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.unsupported).toBe(true);
    expect(outcome.code).toBe("issuer_not_supported");
  });

  it("stores sandbox protocol results for independent validation", async () => {
    resetEphemeralSandboxTestStoreForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.ABRAXAS_EPHEMERAL_REDIS_URL;
    const run = await runEphemeralProtocolSandboxVerification({
      workspaceId: "ws_protocol_1",
      walletAddress: "7EqQdE8f7P8K9m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b",
      policyId: "wallet_control",
    });
    expect(run.ok).toBe(true);
    if (!run.ok) return;
    expect(run.result.workspace_id).toBe("ws_protocol_1");
    expect(run.result.signature_valid).toBe(true);
  });
});
