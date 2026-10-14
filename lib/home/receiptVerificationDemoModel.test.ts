import { describe, expect, it } from "vitest";
import {
  deriveReceiptDemoState,
  type ReceiptDemoCheckStatus,
} from "./receiptVerificationDemoModel";

function statuses(checks: { status: ReceiptDemoCheckStatus }[]): ReceiptDemoCheckStatus[] {
  return checks.map((c) => c.status);
}

describe("receiptVerificationDemoModel scenarios", () => {
  it("VALID: all checks PASS and PERMIT", () => {
    const state = deriveReceiptDemoState("valid");
    expect(statuses(state.authenticityChecks)).toEqual(["PASS", "PASS", "PASS", "PASS"]);
    expect(statuses(state.authorizationChecks)).toEqual(["PASS", "PASS", "PASS", "PASS"]);
    expect(state.outcome).toBe("PERMIT");
    expect(state.signatureValid).toBe(true);
  });

  it("EXPIRED: authenticity PASS, expiration/freshness FAIL, DENY", () => {
    const state = deriveReceiptDemoState("expired");
    expect(statuses(state.authenticityChecks)).toEqual(["PASS", "PASS", "PASS", "PASS"]);
    expect(state.authorizationChecks.find((c) => c.id === "expiration")?.status).toBe("FAIL");
    expect(state.authorizationChecks.find((c) => c.id === "freshness")?.status).toBe("FAIL");
    expect(state.authorizationChecks.find((c) => c.id === "revocation")?.status).toBe("PASS");
    expect(state.signatureValid).toBe(true);
    expect(state.validityWindowOk).toBe(false);
    expect(state.outcome).toBe("DENY");
    expect(state.aggregateStatus).toBe("EXPIRED");
  });

  it("REVOKED: signature and freshness PASS, revocation FAIL, DENY", () => {
    const state = deriveReceiptDemoState("revoked");
    expect(state.signatureValid).toBe(true);
    expect(state.validityWindowOk).toBe(true);
    expect(state.freshnessOk).toBe(true);
    expect(state.revocationClear).toBe(false);
    expect(state.authorizationChecks.find((c) => c.id === "revocation")?.status).toBe("FAIL");
    expect(state.outcome).toBe("DENY");
    expect(state.currentlyAuthorized).toBe(false);
  });

  it("UNAVAILABLE: all checks UNKNOWN, never FAIL signature", () => {
    const state = deriveReceiptDemoState("unavailable");
    expect(statuses(state.authenticityChecks)).toEqual(["UNKNOWN", "UNKNOWN", "UNKNOWN", "UNKNOWN"]);
    expect(statuses(state.authorizationChecks)).toEqual(["UNKNOWN", "UNKNOWN", "UNKNOWN", "UNKNOWN"]);
    expect(state.signatureValid).toBe(false);
    expect(state.authenticityChecks.find((c) => c.id === "signature_integrity")?.status).toBe(
      "UNKNOWN",
    );
    expect(state.verifierReachable).toBe(false);
    expect(state.outcome).toBe("DENY");
    expect(state.aggregateStatus).toBe("UNAVAILABLE");
  });
});
