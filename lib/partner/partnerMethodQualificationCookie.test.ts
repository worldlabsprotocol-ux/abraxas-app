import { beforeEach, describe, expect, it } from "vitest";
import {
  signPartnerMethodQualificationCookie,
  verifyPartnerMethodQualificationCookie,
} from "./partnerMethodQualificationCookie";
import type { MethodQualificationRecord } from "./partnerMethodQualification";

const RECORD: MethodQualificationRecord = {
  verifyRequestId: "vr-sandbox-1",
  partnerId: "circle-arc-demo-304",
  policyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
  policyVersion: 1,
  methodId: "privacy_preserving",
  state: "qualified",
  qualified: true,
  issuedReceipt: false,
  sandboxOnly: true,
};

describe("partner method qualification cookie", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-method-qualification-secret";
  });

  it("round-trips a sandbox qualification without treating it as a receipt", async () => {
    const token = await signPartnerMethodQualificationCookie(RECORD);
    expect(token).toBeTruthy();
    const verified = await verifyPartnerMethodQualificationCookie(token!);
    expect(verified?.qualified).toBe(true);
    expect(verified?.issuedReceipt).toBe(false);
    expect(verified?.sandboxOnly).toBe(true);
    expect(verified?.verifyRequestId).toBe(RECORD.verifyRequestId);
  });

  it("rejects extra claims so a browser-forged payload cannot qualify", async () => {
    const { SignJWT } = await import("jose");
    const key = new TextEncoder().encode(process.env.ABRAXAS_BROWSER_SESSION_SECRET);
    const forged = await new SignJWT({
      verifyRequestId: RECORD.verifyRequestId,
      partnerId: RECORD.partnerId,
      policyId: RECORD.policyId,
      methodId: RECORD.methodId,
      qualified: true,
      issuedReceipt: false,
      sandboxOnly: true,
      method_qualified: true,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30m")
      .sign(key);
    expect(await verifyPartnerMethodQualificationCookie(forged)).toBeNull();
  });
});
