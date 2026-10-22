import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { enforceWalletControlCompleteAuthorization } from "./walletControlCompleteAuthorization";
import { signPartnerSharingConsentCookie } from "./partnerSharingConsentCookie";

const requireQualifiedPartnerMethod = vi.fn();

vi.mock("@/lib/partner/requirePartnerMethodQualification", () => ({
  requireQualifiedPartnerMethod: (...args: unknown[]) => requireQualifiedPartnerMethod(...args),
}));

describe("enforceWalletControlCompleteAuthorization", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "wallet-control-authz-secret";
    requireQualifiedPartnerMethod.mockReset();
  });

  it("fails closed without sharing consent cookie", async () => {
    requireQualifiedPartnerMethod.mockResolvedValue({
      ok: true,
      record: {
        verifyRequestId: "vr_demo",
        partnerId: "p1",
        policyId: "p1-wallet_control-v1",
        methodId: "wallet_control",
        state: "qualified",
        qualified: true,
        issuedReceipt: false,
        sandboxOnly: true,
      },
    });

    const req = new NextRequest("http://localhost/complete", { method: "POST" });
    const result = await enforceWalletControlCompleteAuthorization({
      request: req,
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      verifyRequestId: "vr_demo",
      sessionSubject: "0xabc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("sharing_consent_required");
  });

  it("passes when method qualification and sharing consent cookies match the request", async () => {
    requireQualifiedPartnerMethod.mockResolvedValue({
      ok: true,
      record: {
        verifyRequestId: "vr_demo",
        partnerId: "p1",
        policyId: "p1-wallet_control-v1",
        methodId: "wallet_control",
        state: "qualified",
        qualified: true,
        issuedReceipt: false,
        sandboxOnly: true,
      },
    });

    const sharingToken = await signPartnerSharingConsentCookie({
      verifyRequestId: "vr_demo",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      subjectId: "0xabc",
    });
    expect(sharingToken).toBeTruthy();

    const req = new NextRequest("http://localhost/complete", { method: "POST" });
    req.cookies.set("abraxas_partner_sharing_consent", sharingToken!);

    const result = await enforceWalletControlCompleteAuthorization({
      request: req,
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      verifyRequestId: "vr_demo",
      sessionSubject: "0xabc",
    });
    expect(result).toEqual({ ok: true });
  });

  it("fails when sharing consent is bound to a different verify_request", async () => {
    requireQualifiedPartnerMethod.mockResolvedValue({
      ok: true,
      record: {
        verifyRequestId: "vr_demo",
        partnerId: "p1",
        policyId: "p1-wallet_control-v1",
        methodId: "wallet_control",
        state: "qualified",
        qualified: true,
        issuedReceipt: false,
        sandboxOnly: true,
      },
    });

    const sharingToken = await signPartnerSharingConsentCookie({
      verifyRequestId: "vr_other",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      subjectId: "0xabc",
    });

    const req = new NextRequest("http://localhost/complete", { method: "POST" });
    req.cookies.set("abraxas_partner_sharing_consent", sharingToken!);

    const result = await enforceWalletControlCompleteAuthorization({
      request: req,
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      verifyRequestId: "vr_demo",
      sessionSubject: "0xabc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("sharing_consent_required");
  });

  it("fails when sharing consent was issued for a different holder session", async () => {
    requireQualifiedPartnerMethod.mockResolvedValue({
      ok: true,
      record: {
        verifyRequestId: "vr_demo",
        partnerId: "p1",
        policyId: "p1-wallet_control-v1",
        methodId: "wallet_control",
        state: "qualified",
        qualified: true,
        issuedReceipt: false,
        sandboxOnly: true,
      },
    });

    const sharingToken = await signPartnerSharingConsentCookie({
      verifyRequestId: "vr_demo",
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      subjectId: "0xoriginal_holder",
    });

    const req = new NextRequest("http://localhost/complete", { method: "POST" });
    req.cookies.set("abraxas_partner_sharing_consent", sharingToken!);

    const result = await enforceWalletControlCompleteAuthorization({
      request: req,
      partnerId: "p1",
      policyId: "p1-wallet_control-v1",
      verifyRequestId: "vr_demo",
      sessionSubject: "0xattacker",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("sharing_consent_required");
  });
});
