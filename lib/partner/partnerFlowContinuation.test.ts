// FILE: lib/partner/partnerFlowContinuation.test.ts

import { describe, expect, it } from "vitest";
import {
  buildPartnerContinuePath,
  continuationRequestsIdentity,
  isRestorablePartnerContinuePath,
  isSafePartnerContinuationReturnUrl,
  sanitizePartnerFlowContinuation,
} from "./partnerFlowContinuation";

describe("partnerFlowContinuation sanitizers", () => {
  it("allows https and localhost sandbox callbacks", () => {
    expect(isSafePartnerContinuationReturnUrl(
      "https://www.goodtroublecanna.com/age-verification-result?gtv=gtv_abc123",
    )).toBe(true);
    expect(isSafePartnerContinuationReturnUrl("http://localhost:3000/callback")).toBe(true);
    expect(isSafePartnerContinuationReturnUrl("http://evil.example/callback")).toBe(false);
    expect(isSafePartnerContinuationReturnUrl("javascript:alert(1)")).toBe(false);
  });

  it("continue paths omit callback params and secrets", () => {
    const path = buildPartnerContinuePath({
      verificationRequestId: "vr-1",
      partnerId: "acme",
      policyId: "acme-sandbox_economic_demo-v1",
      purpose: "sandbox_economic_demo",
    });
    expect(path).toContain("/partner/continue?");
    expect(path).not.toContain("return");
    expect(isRestorablePartnerContinuePath(`${path}&return=https://evil.example`)).toBe(false);
  });

  it("sandbox economic demo does not request identity; authoritative retail still does", () => {
    const sandbox = sanitizePartnerFlowContinuation({
      partnerId: "circle-arc-demo-304",
      policyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
      returnUrl: "http://localhost:3000/callback",
    });
    expect(sandbox?.policyId).toContain("sandbox_economic_demo");
    expect(continuationRequestsIdentity("circle-arc-demo-304-sandbox_economic_demo-v1")).toBe(false);
    expect(continuationRequestsIdentity("good-trouble-retail-v1")).toBe(true);
  });
});
