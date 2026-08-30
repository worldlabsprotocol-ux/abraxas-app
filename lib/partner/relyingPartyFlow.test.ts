import { describe, expect, it } from "vitest";
import {
  resolvePartnerFlowStep,
  buildPassportUrl,
  buildPartnerVerifyUrl,
} from "@/lib/partner/relyingPartyFlow";
import {
  buildPartnerVerificationResult,
  sanitizePartnerPayload,
} from "@/lib/partner/partnerVerificationResult";
import {
  computeSessionReceiptExpiresAt,
  isSessionReceiptExpired,
} from "@/lib/partner/sessionReceipt";
import { buildPartnerVerifyUrl as buildRefVerifyUrl } from "@/lib/partner/referenceIntegration";
import { GOOD_TROUBLE_INTEGRATION } from "@/lib/goodTrouble/partnerIntegration";
import type { PartnerPolicyRules } from "@/lib/policy/types";

describe("resolvePartnerFlowStep", () => {
  it("requires authentication first", () => {
    expect(resolvePartnerFlowStep({
      credentialStatus: "none",
      policyDecision: "approved",
      authenticated: false,
    })).toBe("authenticate");
  });

  it("returns enter for returning user with approved policy", () => {
    expect(resolvePartnerFlowStep({
      credentialStatus: "active",
      policyDecision: "approved",
      authenticated: true,
    })).toBe("enter");
  });

  it("skips passport for returning approved user", () => {
    const step = resolvePartnerFlowStep({
      credentialStatus: "active",
      policyDecision: "approved",
      authenticated: true,
    });
    expect(step).not.toBe("passport");
  });

  it("routes expired credential to passport", () => {
    expect(resolvePartnerFlowStep({
      credentialStatus: "expired",
      policyDecision: "approved",
      authenticated: true,
    })).toBe("passport");
  });

  it("routes revoked credential to passport", () => {
    expect(resolvePartnerFlowStep({
      credentialStatus: "revoked",
      policyDecision: "approved",
      authenticated: true,
    })).toBe("passport");
  });

  it("denies under-21 / failed policy", () => {
    expect(resolvePartnerFlowStep({
      credentialStatus: "active",
      policyDecision: "denied",
      authenticated: true,
    })).toBe("denied");
  });

  it("pending review when credential under review", () => {
    expect(resolvePartnerFlowStep({
      credentialStatus: "pending_review",
      policyDecision: "approved",
      authenticated: true,
    })).toBe("pending_review");
  });
});

describe("session receipt TTL", () => {
  it("uses configurable hours from policy", () => {
    const rules: PartnerPolicyRules = { session_receipt_hours: 12 };
    const now = new Date("2026-07-18T12:00:00Z");
    const expires = computeSessionReceiptExpiresAt(rules, now);
    expect(expires).toBe("2026-07-19T00:00:00.000Z");
  });

  it("defaults to 24 hours", () => {
    const now = new Date("2026-07-18T12:00:00Z");
    const expires = computeSessionReceiptExpiresAt({}, now);
    expect(expires).toBe("2026-07-19T12:00:00.000Z");
  });

  it("detects expired receipts", () => {
    expect(isSessionReceiptExpired("2020-01-01T00:00:00Z")).toBe(true);
    expect(isSessionReceiptExpired("2099-01-01T00:00:00Z")).toBe(false);
  });
});

describe("partner verification result — no PII", () => {
  it("strips forbidden PII keys", () => {
    const payload = sanitizePartnerPayload({
      decision: "approved",
      passport_image: "secret",
      date_of_birth: "1990-01-01",
      receipt_id: "dr_test",
    });
    expect(payload).not.toHaveProperty("passport_image");
    expect(payload).not.toHaveProperty("date_of_birth");
    expect(payload.receipt_id).toBe("dr_test");
  });

  it("returns over_21 only when product_eligibility is explicitly required and verified", () => {
    const result = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: "cred-123",
      issuer: "https://abraxas.example",
      evaluatedAt: "2026-07-18T12:00:00Z",
      receiptId: "dr_abc",
      receiptExpiresAt: "2026-07-19T12:00:00Z",
      policyId: "good-trouble-retail-v1",
      partnerId: "good-trouble-cannabis",
      identityVerified: true,
      minimumAge: 21,
      assuranceLevel: "L2",
      productEligibilityRequired: true,
      productEligibilityVerified: true,
    });
    expect(result.over_21).toBe(true);
    expect(result).not.toHaveProperty("date_of_birth");
    expect(result).not.toHaveProperty("legal_name");
  });

  it("returns over_21 false when minimum_age is set but product_eligibility is not explicitly required", () => {
    const result = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: "cred-123",
      issuer: "https://abraxas.example",
      evaluatedAt: "2026-07-18T12:00:00Z",
      receiptId: "dr_abc",
      receiptExpiresAt: "2026-07-19T12:00:00Z",
      policyId: "good-trouble-retail-v1",
      partnerId: "good-trouble-cannabis",
      identityVerified: true,
      minimumAge: 21,
      assuranceLevel: "L2",
    });
    expect(result.over_21).toBe(false);
  });

  it("returns over_21 false when product_eligibility is required but not verified", () => {
    const result = buildPartnerVerificationResult({
      decision: "approved",
      credentialJti: "cred-123",
      issuer: "https://abraxas.example",
      evaluatedAt: "2026-07-18T12:00:00Z",
      receiptId: "dr_abc",
      receiptExpiresAt: "2026-07-19T12:00:00Z",
      policyId: "good-trouble-retail-v1",
      partnerId: "good-trouble-cannabis",
      identityVerified: true,
      minimumAge: 21,
      assuranceLevel: "L2",
      productEligibilityRequired: true,
      productEligibilityVerified: false,
    });
    expect(result.over_21).toBe(false);
  });

  it("denies over_21 when decision denied", () => {
    const result = buildPartnerVerificationResult({
      decision: "denied",
      credentialJti: "cred-123",
      issuer: "https://abraxas.example",
      evaluatedAt: "2026-07-18T12:00:00Z",
      receiptId: "dr_abc",
      receiptExpiresAt: "2026-07-19T12:00:00Z",
      policyId: "good-trouble-retail-v1",
      partnerId: "good-trouble-cannabis",
      identityVerified: false,
      minimumAge: 21,
      reasonCodes: ["missing:identity_verified"],
    });
    expect(result.over_21).toBe(false);
    expect(result.decision).toBe("denied");
  });
});

describe("partner URL builders", () => {
  it("builds passport URL with return param", () => {
    const url = buildPassportUrl({
      verificationRequestId: "req-1",
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
      returnUrl: "https://example.com/enter",
    });
    expect(url).toContain("verify_request=req-1");
    expect(url).toContain("return=");
    expect(url).toContain("partner_id=good-trouble-cannabis");
  });

  it("builds generic partner verify URL from config", () => {
    const url = buildRefVerifyUrl(GOOD_TROUBLE_INTEGRATION, {
      origin: "https://abraxas-app.vercel.app",
    });
    expect(url).toContain("/partner/verify?");
    expect(url).toContain("partner_id=good-trouble-cannabis");
    expect(url).toContain("policy_id=good-trouble-retail-v1");
    expect(url).toContain("return_url=");
  });

  it("buildPartnerVerifyUrl includes policy and return", () => {
    const url = buildPartnerVerifyUrl({
      partnerId: "p1",
      policyId: "pol1",
      returnUrl: "https://partner.com/callback",
    });
    expect(url).toContain("partner_id=p1");
    expect(url).toContain("policy_id=pol1");
    expect(url).toContain("return_url=");
  });
});

describe("Good Trouble reference integration", () => {
  it("uses config not hardcoded flow logic", () => {
    expect(GOOD_TROUBLE_INTEGRATION.partnerId).toBe("good-trouble-cannabis");
    expect(GOOD_TROUBLE_INTEGRATION.enterPath).toBe("/good-trouble/enter");
  });
});
