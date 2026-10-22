import { beforeEach, describe, expect, it } from "vitest";
import {
  sharingConsentMatchesBinding,
  signPartnerSharingConsentCookie,
  verifyPartnerSharingConsentCookie,
} from "./partnerSharingConsentCookie";

describe("partnerSharingConsentCookie", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-sharing-consent-secret";
  });

  it("signs and verifies a request-bound sharing consent record", async () => {
    const token = await signPartnerSharingConsentCookie({
      verifyRequestId: "vr_demo0001",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      policyVersion: 1,
    });
    expect(token).toBeTruthy();
    const record = await verifyPartnerSharingConsentCookie(token!);
    expect(record).toEqual({
      verifyRequestId: "vr_demo0001",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      policyVersion: 1,
    });
    expect(sharingConsentMatchesBinding({
      record,
      verifyRequestId: "vr_demo0001",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      policyVersion: 1,
    })).toBe(true);
    expect(sharingConsentMatchesBinding({
      record,
      verifyRequestId: "vr_other0001",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
    })).toBe(false);
  });
});
