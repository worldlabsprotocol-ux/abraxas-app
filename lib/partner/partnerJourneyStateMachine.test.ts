// FILE: lib/partner/partnerJourneyStateMachine.test.ts

import { describe, expect, it } from "vitest";
import { buildAssuranceBoundarySummary, TOKEN_HOLDINGS_NEVER_ELIGIBILITY } from "@/lib/partner/assuranceBoundary";
import { enrichPartnerFlowResponse } from "@/lib/partner/enrichPartnerFlowResponse";
import {
  mapFlowNextStepToJourneyState,
  mapServerSnapshotToJourneyState,
  partnerJourneyPartnerIntro,
  resolvePartnerJourneyPresentation,
} from "@/lib/partner/partnerJourneyStateMachine";
import { isPartnerFlowDemoModeActive, buildPartnerFlowDemoVerifyUrl } from "@/lib/partner/partnerFlowDemoMode";
import { buildPartnerEvidenceUrl } from "@/lib/partner/relyingPartyFlow";

describe("partner journey state machine", () => {
  it("maps server next steps to authoritative journey states", () => {
    expect(mapFlowNextStepToJourneyState("authenticate")).toBe("sign_in_required");
    expect(mapFlowNextStepToJourneyState("passport")).toBe("additional_verification_required");
    expect(mapFlowNextStepToJourneyState("enter")).toBe("approved");
    expect(mapFlowNextStepToJourneyState("denied")).toBe("denied");
    expect(mapFlowNextStepToJourneyState("pending_review")).toBe("manual_review_required");
  });

  it("maps client snapshots without trusting URL approval", () => {
    expect(mapServerSnapshotToJourneyState({ authenticated: false })).toBe("sign_in_required");
    expect(mapServerSnapshotToJourneyState({ authenticated: true, evaluating: true })).toBe("evaluating_policy");
    expect(mapServerSnapshotToJourneyState({ next: "enter", returning: true })).toBe("returning_to_partner");
    expect(mapServerSnapshotToJourneyState({ return_blocked: true })).toBe("return_failed");
  });

  it("provides one customer message and primary action per state", () => {
    const signIn = resolvePartnerJourneyPresentation("sign_in_required");
    expect(signIn.primary_action).toBe("sign_in");
    expect(signIn.customer_message.toLowerCase()).toContain("sign in");
    expect(signIn.customer_message.toLowerCase()).toContain("does not verify your age");

    const denied = resolvePartnerJourneyPresentation("denied");
    expect(denied.terminal).toBe(true);
    expect(denied.safe_retry).toBe(true);
  });

  it("enriches evaluate responses with journey fields", () => {
    const enriched = enrichPartnerFlowResponse({ next: "passport" });
    expect(enriched.journey_state).toBe("additional_verification_required");
    expect(enriched.customer_message.length).toBeGreaterThan(10);
    expect(enriched.primary_action).toBe("continue");
  });

  it("routes partner evidence to /partner/continue not /passport", () => {
    const url = buildPartnerEvidenceUrl({
      verificationRequestId: "vr_test",
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
      returnUrl: "https://www.goodtroublecanna.com/age-verification-result",
    });
    expect(url).toContain("/partner/continue?");
    expect(url).not.toContain("/passport?");
  });

  it("uses partner intro copy for Good Trouble", () => {
    const intro = partnerJourneyPartnerIntro("Good Trouble Cannabis");
    expect(intro).toContain("Good Trouble Cannabis uses Abraxas");
  });
});

describe("assurance boundary", () => {
  it("never treats authentication as age verification", () => {
    const summary = buildAssuranceBoundarySummary({
      policyId: "good-trouble-retail-v1",
      identityVerified: false,
      productEligibilityVerified: false,
      productEligibilityRequired: true,
      minimumAge: 21,
    });
    expect(summary.authentication_is_not_age_verification).toBe(true);
    expect(summary.authoritative_age_evidence_present).toBe(false);
    expect(summary.evidence_classes_required).toContain("authenticated_account");
    expect(summary.evidence_classes_required).toContain("reusable_authoritative_evidence");
  });

  it("marks authoritative evidence only when identity and eligibility satisfied", () => {
    const summary = buildAssuranceBoundarySummary({
      policyId: "good-trouble-retail-v1",
      identityVerified: true,
      productEligibilityVerified: true,
      productEligibilityRequired: true,
      minimumAge: 21,
    });
    expect(summary.authoritative_age_evidence_present).toBe(true);
  });

  it("never allows token holdings to affect eligibility", () => {
    expect(TOKEN_HOLDINGS_NEVER_ELIGIBILITY).toBe(true);
  });
});

describe("partner flow demo mode", () => {
  it("cannot activate in production runtime", () => {
    expect(isPartnerFlowDemoModeActive()).toBe(false);
    expect(() => buildPartnerFlowDemoVerifyUrl("https://example.com/cb")).toThrow();
  });
});
