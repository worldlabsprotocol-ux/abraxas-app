import { describe, expect, it } from "vitest";
import { POLICY_PACK_CATALOG_VERSION, POLICY_PACK_LIST } from "@/lib/partner/launchpad/policyPacks";
import {
  POLICY_FIT_ACTION_CATEGORIES,
  POLICY_FIT_CATEGORY_TO_PACK,
  POLICY_FIT_NO_FIT,
  POLICY_FIT_REVIEW_NOTICE,
} from "@/lib/partner/integrationStudio/policyFit/contract";
import {
  copyablePolicyFitSummary,
  designPartnerHandoffHref,
  matchPolicyFit,
  parsePolicyFitInput,
  policyFitViewLeaks,
  type PolicyFitIntent,
} from "@/lib/partner/integrationStudio/policyFit/match";
import { studioCapsFromFit } from "./match";

function intent(overrides: Partial<PolicyFitIntent> = {}): PolicyFitIntent {
  return {
    action: "retail_access",
    category: "age_21",
    environment: "sandbox",
    capabilities: ["reusable_result"],
    ...overrides,
  };
}

describe("Integration Studio policy fit", () => {
  it("matches each existing pack from structured choices", () => {
    const cases: PolicyFitIntent[] = [
      intent({ action: "retail_access", category: "age_18" }),
      intent({ action: "retail_access", category: "age_21" }),
      intent({ action: "residency_access", category: "residency" }),
      intent({ action: "membership_access", category: "membership" }),
      intent({ action: "wallet_bound_action", category: "wallet_control" }),
      intent({ action: "redemption_access", category: "collector_redemption" }),
      intent({ action: "higher_assurance_identity", category: "identity_liveness" }),
      intent({ action: "sandbox_demo", category: "sandbox_demo" }),
    ];
    const packs = new Set<string>();
    for (const item of cases) {
      const view = matchPolicyFit(item);
      expect(view.fit).toBe(true);
      expect(view.recommended?.pack_id).toBe(POLICY_FIT_CATEGORY_TO_PACK[item.category]);
      expect(view.recommended?.catalog_version).toBe(POLICY_PACK_CATALOG_VERSION);
      expect(view.studio_selection.pack_id).toBe(view.recommended?.pack_id);
      packs.add(view.recommended!.pack_id);
    }
    expect(packs.size).toBe(POLICY_PACK_LIST.length);
  });

  it("returns a no-fit path for mismatched or Production-only sandbox packs", () => {
    const mismatch = matchPolicyFit(intent({ action: "retail_access", category: "identity_liveness" }));
    expect(mismatch.fit).toBe(false);
    expect(mismatch.recommended).toBeNull();
    expect(mismatch.no_fit_message).toBe(POLICY_FIT_NO_FIT);
    expect(mismatch.design_partner_href).toContain("/design-partner?");
    expect(mismatch.design_partner_href).toContain("source=integration-studio-policy-fit");

    const sandboxOnly = matchPolicyFit(intent({
      action: "redemption_access",
      category: "collector_redemption",
      environment: "future_production",
    }));
    expect(sandboxOnly.fit).toBe(false);
    expect(sandboxOnly.review_notice).toBe(POLICY_FIT_REVIEW_NOTICE);
  });

  it("emits safe structured output without policy internals or secrets", () => {
    const view = matchPolicyFit(intent({
      capabilities: ["reusable_result", "webhook", "solana_gate"],
    }));
    const blob = JSON.stringify(view).toLowerCase();
    expect(view.recommended?.policy_result.toLowerCase()).toContain("age_eligible_21");
    expect(view.recommended?.withheld.length).toBeGreaterThan(0);
    expect(blob).not.toMatch(/policy graph|claim ontology|assurance lattice|judge/);
    expect(blob).not.toMatch(/abx_|service_role|private_key|signature|receipt_id/);
    expect(policyFitViewLeaks(view)).toEqual([]);
    expect(view.copyable_summary).toContain(copyablePolicyFitSummary(view.intent, view.recommended!.pack_id).split("\n")[0]);
  });

  it("rejects unknown categories, capabilities, versions, and extra keys", () => {
    expect(parsePolicyFitInput({ action: "retail_access", category: "sanctions", environment: "sandbox" }).ok).toBe(false);
    expect(parsePolicyFitInput({ action: "retail_access", category: "age_21", environment: "sandbox", capabilities: ["circle"] }).ok).toBe(false);
    expect(parsePolicyFitInput({
      action: "retail_access",
      category: "age_21",
      environment: "sandbox",
      policy_version: 99,
    }).ok).toBe(false);
    expect(parsePolicyFitInput({
      action: "retail_access",
      category: "age_21",
      environment: "sandbox",
      production_activation: true,
    }).ok).toBe(false);
    expect(parsePolicyFitInput({
      action: "retail_access",
      category: "age_21",
      environment: "sandbox",
      extra: "nope",
    }).ok).toBe(false);
  });

  it("keeps pack id and catalog version server-authoritative", () => {
    const view = matchPolicyFit(intent());
    expect(view.recommended?.pack_id).toBe("age_21_retail");
    expect(view.recommended?.catalog_version).toBe(POLICY_PACK_CATALOG_VERSION);
    expect(view.recommended?.sandbox_only).toBe(false);
    expect(view.recommended?.production_path.toLowerCase()).toContain("reviewed");
  });

  it("preselects Studio pack, path, and starter-kit capabilities", () => {
    const view = matchPolicyFit(intent({
      capabilities: ["reusable_result", "trading_preflight"],
    }));
    expect(view.studio_selection).toEqual({
      pack_id: "age_21_retail",
      path: "trading_venue",
      capabilities: ["reusable_result", "trading_preflight"],
    });
    expect(studioCapsFromFit(view.studio_selection.capabilities)).toEqual(["trading_venue"]);
  });

  it("builds a Design Partner handoff with structured choices only", () => {
    const href = designPartnerHandoffHref(intent({ environment: "future_production" }));
    expect(href.startsWith("/design-partner?")).toBe(true);
    expect(href).toContain("action=retail_access");
    expect(href).toContain("category=age_21");
    expect(href).not.toMatch(/email|wallet|secret|receipt/);
  });

  it("states Google is account-only and identity appears only when required", () => {
    const retail = matchPolicyFit(intent());
    expect(retail.recommended?.google_is_account_only.toLowerCase()).toContain("account");
    expect(retail.recommended?.identity_appears_only_when_required.toLowerCase()).toContain("not the default path");
    const identity = matchPolicyFit(intent({
      action: "higher_assurance_identity",
      category: "identity_liveness",
    }));
    expect(identity.recommended?.identity_appears_only_when_required.toLowerCase()).toContain("requires it");
  });

  it("covers every action-to-category mapping used by the planner", () => {
    expect(Object.keys(POLICY_FIT_ACTION_CATEGORIES).length).toBe(7);
    expect(Object.keys(POLICY_FIT_CATEGORY_TO_PACK).length).toBe(8);
  });
});
