// FILE: lib/passport/passportCustomerStatus.test.ts

import { describe, expect, it } from "vitest";
import { buildPassportProofSummary, resolvePassportCustomerStatus } from "./passportCustomerStatus";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";

describe("passportCustomerStatus", () => {
  it("reports needs attention when wallet is not secured", () => {
    const setup = computePassportSetupState({
      walletDone: true,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: false,
    });
    const status = resolvePassportCustomerStatus({
      walletDone: true,
      setup,
      identityStatus: "not_started",
      hasCredential: false,
      idvProvider: "manual",
      via: null,
    });
    expect(status.label).toBe("Needs attention");
  });

  it("does not claim verified without credential evidence", () => {
    const setup = computePassportSetupState({
      walletDone: true,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: true,
    });
    const proof = buildPassportProofSummary({ walletBound: true, identityUi: "not_started" });
    expect(proof).toContain("Verified only when a partner requires it");
    expect(proof).not.toContain("Ready for eligible partner requests");
  });

  it("shows verified proof only with verified identity state", () => {
    const proof = buildPassportProofSummary({ walletBound: true, identityUi: "verified" });
    expect(proof).toContain("Ready for eligible partner requests");
  });
});
