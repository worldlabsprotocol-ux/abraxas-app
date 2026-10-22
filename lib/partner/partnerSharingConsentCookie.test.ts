import { beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
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
      subjectId: "0xholder_a",
    });
    expect(token).toBeTruthy();
    const record = await verifyPartnerSharingConsentCookie(token!);
    expect(record).toEqual({
      verifyRequestId: "vr_demo0001",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      policyVersion: 1,
      subjectId: "0xholder_a",
    });
    expect(sharingConsentMatchesBinding({
      record,
      verifyRequestId: "vr_demo0001",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      policyVersion: 1,
      sessionSubject: "0xholder_a",
    })).toBe(true);
    expect(sharingConsentMatchesBinding({
      record,
      verifyRequestId: "vr_other0001",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      sessionSubject: "0xholder_a",
    })).toBe(false);
    expect(sharingConsentMatchesBinding({
      record,
      verifyRequestId: "vr_demo0001",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      sessionSubject: "0xother_holder",
    })).toBe(false);
  });

  it("rejects tokens signed with a different secret", async () => {
    const forged = await new SignJWT({
      verifyRequestId: "vr_demo0001",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      policyVersion: 1,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("0xholder_a")
      .sign(new TextEncoder().encode("wrong-secret"));
    expect(await verifyPartnerSharingConsentCookie(forged)).toBeNull();
  });

  it("rejects tokens missing subject binding", async () => {
    const noSub = await new SignJWT({
      verifyRequestId: "vr_demo0001",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("test-sharing-consent-secret"));
    expect(await verifyPartnerSharingConsentCookie(noSub)).toBeNull();
  });
});
