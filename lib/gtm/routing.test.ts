// FILE: lib/gtm/routing.test.ts
// Exhaustive routing truth-table — precedence and conflict cases.

import { describe, expect, it } from "vitest";
import type { GtmDiscoveryAnswers } from "./contract";
import { routeFromDiscovery } from "./routing";

function answers(
  partial: Partial<GtmDiscoveryAnswers> & Pick<GtmDiscoveryAnswers, "industry" | "app_count_band" | "has_kyc_vendor" | "primary_pain">,
): GtmDiscoveryAnswers {
  return partial;
}

describe("routeFromDiscovery truth table", () => {
  it("falls back to generic reusable when discovery is missing", () => {
    const route = routeFromDiscovery(null);
    expect(route.proof_pack).toBe("generic_reusable");
    expect(route.show_institutional_reference).toBe(true);
    expect(route.show_good_trouble).toBe(true);
  });

  it("precedence: age-restricted commerce beats fintech multi-app reuse", () => {
    const route = routeFromDiscovery(
      answers({
        industry: "age_restricted_commerce",
        app_count_band: "4_plus",
        has_kyc_vendor: "yes",
        primary_pain: "repeat_verification",
      }),
    );
    expect(route.proof_pack).toBe("narrow_disclosure");
    expect(route.show_institutional_reference).toBe(false);
    expect(route.show_good_trouble).toBe(true);
  });

  it("precedence: over_collection beats institutional reuse", () => {
    const route = routeFromDiscovery(
      answers({
        industry: "fintech_digital_assets",
        app_count_band: "4_plus",
        has_kyc_vendor: "yes",
        primary_pain: "over_collection",
      }),
    );
    expect(route.proof_pack).toBe("narrow_disclosure");
    expect(route.show_institutional_reference).toBe(false);
  });

  it("precedence: slow_launches beats institutional reuse", () => {
    const route = routeFromDiscovery(
      answers({
        industry: "fintech_digital_assets",
        app_count_band: "4_plus",
        has_kyc_vendor: "yes",
        primary_pain: "slow_launches",
      }),
    );
    expect(route.proof_pack).toBe("policy_integration");
    expect(route.show_institutional_reference).toBe(false);
    expect(route.show_good_trouble).toBe(false);
  });

  it("fintech + 2_3 apps + KYC + repeat_verification → institutional reuse", () => {
    const route = routeFromDiscovery(
      answers({
        industry: "fintech_digital_assets",
        app_count_band: "2_3",
        has_kyc_vendor: "yes",
        primary_pain: "repeat_verification",
      }),
    );
    expect(route.proof_pack).toBe("institutional_reuse");
    expect(route.emphasize_keep_provider).toBe(true);
    expect(route.show_institutional_reference).toBe(true);
    expect(route.show_good_trouble).toBe(false);
  });

  it("fintech + 1 app + KYC does not qualify for institutional reuse", () => {
    const route = routeFromDiscovery(
      answers({
        industry: "fintech_digital_assets",
        app_count_band: "1",
        has_kyc_vendor: "yes",
        primary_pain: "repeat_verification",
      }),
    );
    expect(route.proof_pack).toBe("generic_reusable");
    expect(route.show_institutional_reference).toBe(true);
  });

  it("fintech + 4+ apps + no KYC still routes via repeat_verification pain", () => {
    const route = routeFromDiscovery(
      answers({
        industry: "fintech_digital_assets",
        app_count_band: "4_plus",
        has_kyc_vendor: "no",
        primary_pain: "repeat_verification",
      }),
    );
    expect(route.proof_pack).toBe("institutional_reuse");
    expect(route.emphasize_keep_provider).toBe(false);
  });

  it("multi-app repeat_verification without fintech/KYC still routes to institutional reuse", () => {
    const route = routeFromDiscovery(
      answers({
        industry: "marketplace",
        app_count_band: "2_3",
        has_kyc_vendor: "no",
        primary_pain: "repeat_verification",
      }),
    );
    expect(route.proof_pack).toBe("institutional_reuse");
    expect(route.show_good_trouble).toBe(true);
  });

  it("other + repeat_verification + single app stays generic", () => {
    const route = routeFromDiscovery(
      answers({
        industry: "other",
        app_count_band: "1",
        has_kyc_vendor: "no",
        primary_pain: "repeat_verification",
      }),
    );
    expect(route.proof_pack).toBe("generic_reusable");
  });

  it("wallet infrastructure + auditability + multi-app + KYC → institutional reuse", () => {
    const route = routeFromDiscovery(
      answers({
        industry: "wallet_infrastructure",
        app_count_band: "4_plus",
        has_kyc_vendor: "yes",
        primary_pain: "auditability",
      }),
    );
    expect(route.proof_pack).toBe("institutional_reuse");
  });

  it("recommended studio href is deterministic per proof pack", () => {
    const narrow = routeFromDiscovery(
      answers({
        industry: "age_restricted_commerce",
        app_count_band: "1",
        has_kyc_vendor: "no",
        primary_pain: "other",
      }),
    );
    expect(narrow.recommended_studio_href).toContain("narrow_without_extra_id");

    const policy = routeFromDiscovery(
      answers({
        industry: "fintech_digital_assets",
        app_count_band: "1",
        has_kyc_vendor: "yes",
        primary_pain: "slow_launches",
      }),
    );
    expect(policy.recommended_studio_href).toContain("new_eligibility_rule");
  });
});
