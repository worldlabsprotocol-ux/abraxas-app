import { describe, expect, it } from "vitest";
import { sanitizePartnerContinueBrowserSearch } from "@/lib/partner/partnerFlowContinuation";
import { shouldShowPartnerConsent } from "@/lib/partner/partnerConsentVisibility";
import {
  buildHolderRequestBrief,
  holderCopyLeaks,
  holderSafeClientMessage,
  resolveHolderRecovery,
} from "@/lib/partner/holderExperience";
import { HOLDER_RECOVERY_STATES } from "@/lib/partner/holderExperience/contract";
import { GOOGLE_ACCOUNT_NOT_ELIGIBILITY } from "@/lib/partner/launchpad/policyPacks";

describe("holder verification experience", () => {
  it("builds a request brief without return URLs, receipt ids, or secrets", () => {
    const brief = buildHolderRequestBrief({
      partnerId: "acme-sandbox",
      policyId: "acme-age_21_retail-v1",
      purpose: "purchase",
      environment: "sandbox",
    });
    expect(brief.requestor).toBeTruthy();
    expect(brief.purpose.length).toBeGreaterThan(8);
    expect(brief.result.toLowerCase()).not.toContain("date of birth");
    expect(brief.withheld.join(" ").toLowerCase()).toContain("date of birth");
    expect(brief.shared_result_category.toLowerCase()).toContain("age_eligible_21");
    expect(brief.method_explanation).toBe("This policy requires an approved verification method.");
    expect(brief.identity_not_default.toLowerCase()).toContain("never the default");
    expect(holderCopyLeaks(JSON.stringify(brief))).toEqual([]);
    expect(JSON.stringify(brief)).not.toMatch(/https?:\/\//);
    expect(JSON.stringify(brief)).not.toMatch(/receipt/i);
  });

  it("labels sandbox-only packs as not Production-usable", () => {
    const brief = buildHolderRequestBrief({
      partnerId: "circle-arc-demo-304",
      policyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
    });
    expect(brief.environment_label).toMatch(/Sandbox/i);
    expect(brief.environment_detail.toLowerCase()).toContain("not production-usable");
  });

  it("binds restart and contact actions to stored partner home, never a query return URL", () => {
    const view = resolveHolderRecovery("expired", "Acme", "https://acme.example/");
    expect(view.href).toBe("https://acme.example/");
    expect(resolveHolderRecovery("missing", "Acme").href).toBeUndefined();
  });

  it("covers every recoverable state with a next action and leak-free copy", () => {
    for (const state of HOLDER_RECOVERY_STATES) {
      const view = resolveHolderRecovery(state, "Acme");
      expect(view.title.length).toBeGreaterThan(4);
      expect(view.explanation.length).toBeGreaterThan(12);
      expect(view.next_label.length).toBeGreaterThan(4);
      expect(holderCopyLeaks(`${view.title} ${view.explanation} ${view.next_label}`)).toEqual([]);
    }
  });

  it("never surfaces raw backend, oauth, jwt, or receipt text", () => {
    expect(holderSafeClientMessage("SQLSTATE 42P01 relation does not exist")).not.toMatch(/SQLSTATE|relation/i);
    expect(holderSafeClientMessage("receipt_id=dr_abc oauth token jwt")).not.toMatch(/receipt_id|oauth|jwt/i);
  });

  it("does not show consent when no method is selected or the method is unqualified", () => {
    expect(shouldShowPartnerConsent({
      verificationRequestId: "vr-1",
      consentDismissed: false,
      methodSelected: false,
      methodQualified: false,
      underReview: false,
      handoffReady: false,
    })).toBe(false);
    expect(shouldShowPartnerConsent({
      verificationRequestId: "vr-1",
      consentDismissed: false,
      methodSelected: true,
      methodQualified: false,
      underReview: false,
      handoffReady: false,
    })).toBe(false);
    expect(shouldShowPartnerConsent({
      verificationRequestId: "vr-1",
      consentDismissed: false,
      methodSelected: true,
      methodQualified: true,
      underReview: false,
      handoffReady: false,
    })).toBe(true);
  });

  it("keeps continue URLs to verify_request and rejects untrusted return parameters", () => {
    const sanitized = sanitizePartnerContinueBrowserSearch(new URLSearchParams({
      verify_request: "vr-safe",
      return_url: "https://evil.example/callback",
      receipt_id: "dr_secret",
      partner_id: "forged",
    }));
    expect(sanitized.search).toBe("verify_request=vr-safe");
    expect(sanitized.strippedUntrusted).toBe(true);
    expect(sanitized.search).not.toContain("return");
    expect(sanitized.search).not.toContain("receipt");
  });
});
