// FILE: lib/auth/ephemeralWallet/sandboxReceiptValidationResponse.test.ts

import { describe, expect, it } from "vitest";
import { issueEphemeralSandboxTestResult, storeEphemeralSandboxTestResult } from "./sandboxTestVerification";
import {
  buildSandboxReceiptValidationPayload,
  isPresentedSandboxTestReceipt,
} from "./sandboxReceiptValidationResponse";
import { resolveEphemeralSandboxTestPolicy } from "./sandboxTestPolicies";

describe("sandboxReceiptValidationResponse", () => {
  it("validates presented sandbox receipt without server cache", async () => {
    const policy = resolveEphemeralSandboxTestPolicy("wallet_control");
    expect(policy).toBeTruthy();
    const receipt = issueEphemeralSandboxTestResult({
      workspaceId: "ws_1",
      walletAddress: "11111111111111111111111111111111",
      policy: policy!,
    });
    expect(isPresentedSandboxTestReceipt(receipt)).toBe(true);
    const payload = await buildSandboxReceiptValidationPayload({
      receipt,
      source: "presented_receipt",
    });
    expect(payload.signature_authentic).toBe(true);
    expect(payload.source).toBe("presented_receipt");
  });

  it("rejects presented receipt when signature field was altered", async () => {
    const policy = resolveEphemeralSandboxTestPolicy("wallet_control");
    expect(policy).toBeTruthy();
    const receipt = issueEphemeralSandboxTestResult({
      workspaceId: "ws_1",
      walletAddress: "11111111111111111111111111111111",
      policy: policy!,
    });
    await storeEphemeralSandboxTestResult(receipt);
    const tampered = { ...receipt, signature: "invalid" };
    const payload = await buildSandboxReceiptValidationPayload({
      receipt: tampered,
      source: "presented_receipt",
    });
    expect(payload.signature_authentic).toBe(false);
  });
});
