import { describe, expect, it } from "vitest";
import { deriveReceiptDemoState } from "./receiptVerificationDemoModel";

describe("receiptVerificationDemoModel", () => {
  it("treats revoked receipts as cryptographically valid but not authorized", () => {
    const state = deriveReceiptDemoState("revoked");
    expect(state.signatureValid).toBe(true);
    expect(state.currentlyAuthorized).toBe(false);
    expect(state.outcome).toBe("DENY");
    expect(state.revocationClear).toBe(false);
  });

  it("treats expired receipts as signature-valid with failed freshness", () => {
    const state = deriveReceiptDemoState("expired");
    expect(state.signatureValid).toBe(true);
    expect(state.validityWindowOk).toBe(false);
    expect(state.outcome).toBe("DENY");
  });

  it("marks unavailable scenario as failing authenticity and authorization", () => {
    const state = deriveReceiptDemoState("unavailable");
    expect(state.signatureValid).toBe(false);
    expect(state.verifierReachable).toBe(false);
    expect(state.aggregateStatus).toBe("UNAVAILABLE");
  });
});
