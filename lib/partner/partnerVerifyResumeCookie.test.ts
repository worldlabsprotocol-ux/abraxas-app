// FILE: lib/partner/partnerVerifyResumeCookie.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import {
  signPartnerContinueBindingCookie,
  signPartnerVerifyResumeCookie,
  verifyPartnerContinueBindingCookie,
  verifyPartnerVerifyResumeCookie,
} from "./partnerVerifyResumeCookie";

describe("partnerVerifyResumeCookie", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-resume-cookie-secret";
  });

  it("round-trips only an opaque jti", async () => {
    const token = await signPartnerVerifyResumeCookie({ jti: "continuation-jti-1" });
    expect(token).toBeTruthy();

    const verified = await verifyPartnerVerifyResumeCookie(token!);
    expect(verified).toEqual({ jti: "continuation-jti-1" });
    expect(JSON.stringify(verified)).not.toMatch(/partner|policy|return|receipt/i);
  });

  it("rejects cookies that still carry partner or return fields", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode("test-resume-cookie-secret");
    const token = await new SignJWT({
      jti: "jti-1",
      partnerId: "good-trouble-cannabis",
      returnUrl: "https://evil.example/callback",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30m")
      .sign(secret);

    expect(await verifyPartnerVerifyResumeCookie(token)).toBeNull();
  });

  it("continue binding cookie is only a verify_request pointer", async () => {
    const token = await signPartnerContinueBindingCookie({ verifyRequestId: "vr-1" });
    const verified = await verifyPartnerContinueBindingCookie(token!);
    expect(verified).toEqual({ verifyRequestId: "vr-1" });
    expect(JSON.stringify(verified)).not.toMatch(/return|partner|policy/i);
  });
});
