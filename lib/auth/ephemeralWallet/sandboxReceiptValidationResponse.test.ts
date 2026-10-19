// FILE: lib/auth/ephemeralWallet/sandboxReceiptValidationResponse.test.ts

import { describe, expect, it } from "vitest";
import {
  issueEphemeralSandboxTestResult,
  resetEphemeralSandboxTestStoreForTests,
  storeEphemeralSandboxTestResult,
  validateEphemeralSandboxTestResult,
} from "./sandboxTestVerification";
import {
  buildSandboxReceiptValidationPayload,
  isPresentedSandboxTestReceipt,
} from "./sandboxReceiptValidationResponse";
import { resolveEphemeralSandboxTestPolicy } from "./sandboxTestPolicies";

describe("sandboxReceiptValidationResponse", () => {
  it("validates presented sandbox receipt against server record", async () => {
    const policy = resolveEphemeralSandboxTestPolicy("wallet_control");
    expect(policy).toBeTruthy();
    const receipt = issueEphemeralSandboxTestResult({
      workspaceId: "ws_1",
      walletAddress: "11111111111111111111111111111111",
      policy: policy!,
    });
    await storeEphemeralSandboxTestResult(receipt);
    expect(isPresentedSandboxTestReceipt(receipt)).toBe(true);
    const payload = await buildSandboxReceiptValidationPayload({
      receipt,
      source: "presented_receipt",
    });
    expect(payload.server_record_integrity_verified).toBe(true);
    expect(payload.standalone_cryptographic_verification).toBe(false);
    expect(payload.signature_authentic).toBe(true);
    expect(payload.signature_authentic_basis).toBe("sandbox_server_record_and_policy_gates");
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
    expect(payload.server_record_integrity_verified).toBe(false);
    expect(payload.signature_authentic).toBe(false);
  });

  it("fail-closes when server record is missing", async () => {
    resetEphemeralSandboxTestStoreForTests();
    const policy = resolveEphemeralSandboxTestPolicy("wallet_control");
    const receipt = issueEphemeralSandboxTestResult({
      workspaceId: "ws_1",
      walletAddress: "11111111111111111111111111111111",
      policy: policy!,
    });
    const validation = await validateEphemeralSandboxTestResult(receipt, {
      mode: "presented_receipt",
    });
    expect(validation.server_record_integrity_verified).toBe(false);
    expect(validation.trust.signature_valid).toBe(false);
    expect(validation.trust.invalidation_reasons).toContain("server_record_not_found");
  });

  it("fail-closes when payload_hash is missing on presented receipt", async () => {
    const policy = resolveEphemeralSandboxTestPolicy("wallet_control");
    const receipt = issueEphemeralSandboxTestResult({
      workspaceId: "ws_1",
      walletAddress: "11111111111111111111111111111111",
      policy: policy!,
    });
    await storeEphemeralSandboxTestResult(receipt);
    const validation = await validateEphemeralSandboxTestResult(
      { ...receipt, payload_hash: undefined },
      { mode: "presented_receipt" },
    );
    expect(validation.server_record_integrity_verified).toBe(false);
    expect(validation.trust.invalidation_reasons).toContain("payload_hash_missing");
  });

  it("fail-closes when receipt_id does not match stored record", async () => {
    const policy = resolveEphemeralSandboxTestPolicy("wallet_control");
    const receipt = issueEphemeralSandboxTestResult({
      workspaceId: "ws_1",
      walletAddress: "11111111111111111111111111111111",
      policy: policy!,
    });
    await storeEphemeralSandboxTestResult(receipt);
    const validation = await validateEphemeralSandboxTestResult(
      { ...receipt, receipt_id: "dr_pv_altered_id" },
      { mode: "presented_receipt" },
    );
    expect(validation.server_record_integrity_verified).toBe(false);
    expect(validation.trust.invalidation_reasons).toContain("server_record_not_found");
  });

  it("does not trust client-forged signature_valid when server record mismatches", async () => {
    const policy = resolveEphemeralSandboxTestPolicy("wallet_control");
    const receipt = issueEphemeralSandboxTestResult({
      workspaceId: "ws_1",
      walletAddress: "11111111111111111111111111111111",
      policy: policy!,
    });
    await storeEphemeralSandboxTestResult(receipt);
    const forged = {
      ...receipt,
      signature: "invalid",
      signature_valid: true,
      currently_valid: true,
    };
    const payload = await buildSandboxReceiptValidationPayload({
      receipt: forged,
      source: "presented_receipt",
    });
    expect(payload.server_record_integrity_verified).toBe(false);
    expect(payload.signature_authentic).toBe(false);
  });
});
