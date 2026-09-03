// FILE: lib/passport/passportCustomerStatus.test.ts

import { describe, expect, it } from "vitest";
import { buildPassportProofSummary, resolvePassportCustomerStatus } from "./passportCustomerStatus";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";

describe("passportCustomerStatus", () => {
  it("reports setup needed when wallet is not secured", () => {
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
    expect(status.label).toBe("Setup needed");
  });

  it("does not claim verified without credential evidence", () => {
    const setup = computePassportSetupState({
      walletDone: true,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: true,
    });
    const proof = buildPassportProofSummary({ walletBound: true, identityUi: "not_started" });
    expect(proof).toContain("Eligibility not yet verified");
    expect(proof).not.toContain("Verified information on file");
  });

  it("shows verified proof only with verified identity state", () => {
    const proof = buildPassportProofSummary({ walletBound: true, identityUi: "verified" });
    expect(proof).toContain("Verified information on file");
  });
});
