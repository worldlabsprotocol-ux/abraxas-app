// FILE: lib/passport/passportVerifyAccess.test.ts

import { describe, expect, it } from "vitest";
import { computePassportSetupState } from "@/lib/idv/identityVerificationStates";
import {
  buildPassportSetupHref,
  passportVerifyNeedsSetup,
  passportVerifySetupBlockedReason,
} from "./passportVerifyAccess";

describe("passportVerifyAccess", () => {
  it("blocks credential verify tools until sign-in and wallet bind", () => {
    const signedOut = computePassportSetupState({
      walletDone: false,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: false,
    });
    expect(passportVerifyNeedsSetup(signedOut)).toBe(true);
    expect(passportVerifySetupBlockedReason(signedOut)).toBe("sign_in");

    const needsBind = computePassportSetupState({
      walletDone: true,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: false,
    });
    expect(passportVerifyNeedsSetup(needsBind)).toBe(true);
    expect(passportVerifySetupBlockedReason(needsBind)).toBe("bind_wallet");

    const ready = computePassportSetupState({
      walletDone: true,
      identityStatus: "not_started",
      credentialStatus: "not_issued",
      walletBindingL3: true,
    });
    expect(passportVerifyNeedsSetup(ready)).toBe(false);
    expect(passportVerifySetupBlockedReason(ready)).toBeNull();
  });

  it("preserves partner-flow query params when routing back to setup", () => {
    const params = new URLSearchParams({
      verify_request: "vr_123",
      policy_id: "abraxas-core-v1",
      partner_id: "demo-partner",
      return: encodeURIComponent("https://partner.example/callback"),
      verification: "pending",
      view: "verify",
      mode: "credential",
    });

    const href = buildPassportSetupHref(params);
    expect(href).toContain("/passport?");
    expect(href).toContain("verify_request=vr_123");
    expect(href).toContain("policy_id=abraxas-core-v1");
    expect(href).toContain("partner_id=demo-partner");
    expect(href).toContain("return=");
    expect(href).toContain("verification=pending");
    expect(href).not.toContain("view=verify");
    expect(href).not.toContain("mode=credential");
  });
});
