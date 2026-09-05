// FILE: lib/policy/resolveEffectivePolicyRules.test.ts

import { describe, expect, it } from "vitest";
import { resolveEffectivePolicyRules, resolvePolicyOverlayDecision } from "./resolveEffectivePolicyRules";
import {
  GOOD_TROUBLE_RETAIL_V2_PENDING_RULES,
  PRODUCTION_PARTNER_POLICIES,
} from "./productionPolicyContract";
import { GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";
import type { PartnerPolicy } from "./types";

describe("resolveEffectivePolicyRules", () => {
  const gtV1 = PRODUCTION_PARTNER_POLICIES.find(p => p.id === GOOD_TROUBLE_RETAIL_POLICY_ID)!;

  function asPartnerPolicy(rules: typeof gtV1.rules, version = 1): PartnerPolicy {
    return {
      id: GOOD_TROUBLE_RETAIL_POLICY_ID,
      partner_id: "good-trouble-cannabis",
      name: "Good Trouble Retail",
      version,
      status: "active",
      rules_json: rules,
    };
  }

  it("overlays v2 rules for sandbox GT retail v1 with minimum_age metadata", () => {
    const effective = resolveEffectivePolicyRules(asPartnerPolicy(gtV1.rules));
    expect(effective.required_claims?.some(c => c.claim_type === "product_eligibility")).toBe(true);
    expect(effective).toEqual(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES);
  });

  it("returns stored rules when product_eligibility already explicit", () => {
    const effective = resolveEffectivePolicyRules(
      asPartnerPolicy(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, 2),
    );
    expect(effective).toEqual(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES);
  });

  it("does not overlay when sandbox_only is false", () => {
    const rules = { ...gtV1.rules, sandbox_only: false };
    const decision = resolvePolicyOverlayDecision(asPartnerPolicy(rules));
    expect(decision.overlay_applied).toBe(false);
    expect(decision.effective_rules).toEqual(rules);
  });

  it("uses published registry after v2 publish — overlay ignored", () => {
    const published = asPartnerPolicy(GOOD_TROUBLE_RETAIL_V2_PENDING_RULES, 2);
    const decision = resolvePolicyOverlayDecision(published);
    expect(decision.overlay_applied).toBe(false);
    expect(decision.overlay_reason).toBe("published_registry");
  });

  it("does not overlay non-GT policies", () => {
    const booking = PRODUCTION_PARTNER_POLICIES.find(p => p.id === "abraxas-booking-v1")!;
    const effective = resolveEffectivePolicyRules({
      id: booking.id,
      partner_id: booking.partnerId,
      name: booking.id,
      version: 1,
      status: "active",
      rules_json: booking.rules,
    });
    expect(effective).toEqual(booking.rules);
  });
});
