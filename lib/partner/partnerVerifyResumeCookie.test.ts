// FILE: lib/partner/partnerVerifyResumeCookie.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildResumePathFromPayload,
  signPartnerVerifyResumeCookie,
  verifyPartnerVerifyResumeCookie,
} from "./partnerVerifyResumeCookie";

const BROWSE_SAMPLE = {
  partnerId: "good-trouble-cannabis",
  policyId: "good-trouble-browse-v1",
  purpose: "browse",
  returnUrl: "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_abc123",
};

describe("partnerVerifyResumeCookie", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-resume-cookie-secret";
  });

  it("round-trips browse resume payload through signed cookie", async () => {
    const token = await signPartnerVerifyResumeCookie(BROWSE_SAMPLE);
    expect(token).toBeTruthy();

    const verified = await verifyPartnerVerifyResumeCookie(token!);
    expect(verified).toEqual(BROWSE_SAMPLE);
  });

  it("builds restorable partner verify path with browse purpose", () => {
    const path = buildResumePathFromPayload(BROWSE_SAMPLE);
    expect(path).toContain("/partner/verify?");
    expect(path).toContain("purpose=browse");
    expect(path).toContain("policy_id=good-trouble-browse-v1");
  });
});
