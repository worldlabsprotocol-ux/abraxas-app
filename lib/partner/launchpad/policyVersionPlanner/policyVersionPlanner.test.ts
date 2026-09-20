import { describe, expect, it } from "vitest";
import { POLICY_PACK_CATALOG_VERSION } from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { buildPolicyVersionPlannerView, policyVersionPlannerLeaks } from "@/lib/partner/launchpad/policyVersionPlanner/view";
import { comparePolicyVersionSurfaces } from "@/lib/partner/launchpad/policyVersionPlanner/compare";
import { studioPolicyVersionHandoffHref } from "@/lib/partner/launchpad/policyVersionPlanner/contract";
import { surfaceFromPack, applySuccessor, resolvePackForPlanner } from "@/lib/partner/launchpad/policyVersionPlanner/surface";
import { resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";

function app(overrides: Partial<LaunchpadApplicationRow> = {}): LaunchpadApplicationRow {
  return {
    id: "app-1",
    public_slug: "acme-retail",
    partner_id: "acme",
    application_name: "Acme retail",
    display_name: "Acme",
    environment: "sandbox",
    policy_id: "acme-age_21_retail-v1",
    policy_version: 1,
    policy_template_id: "age_21_retail",
    allowed_return_urls: ["http://localhost:3000/callback"],
    api_key_id: "key-1",
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: "2026-09-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("Policy Version Change Planner", () => {
  it("pins the current version from the sandbox app, not the client", () => {
    const view = buildPolicyVersionPlannerView(app({ policy_version: 1 }));
    expect(view.pinned_version).toBe(1);
    expect(view.pack_id).toBe("age_21_retail");
    expect(view.current?.version).toBe(1);
    expect(view.mutates_policy_pin).toBe(false);
    expect(view.issues_production_key).toBe(false);
    expect(view.activates_production).toBe(false);
    expect(POLICY_PACK_CATALOG_VERSION).toBe(1);
  });

  it("reports no newer catalog version when none exist", () => {
    const view = buildPolicyVersionPlannerView(app({
      policy_id: "acme-age_18_retail-v1",
      policy_template_id: "age_18_retail",
    }));
    expect(view.availability).toBe("no_newer");
    expect(view.comparison).toBeNull();
  });

  it("compares a compatible newer planning version without mutation", () => {
    const view = buildPolicyVersionPlannerView(app());
    expect(view.availability).toBe("newer_planning");
    expect(view.comparison?.compatibility).toBe("unchanged");
    expect(view.mutates_policy_pin).toBe(false);
    expect(view.studio_handoff).toBe(studioPolicyVersionHandoffHref("age_21_retail", 2));
  });

  it("marks a method-category successor as sandbox retest", () => {
    const view = buildPolicyVersionPlannerView(app({
      policy_id: "acme-residency_us-v1",
      policy_template_id: "residency_us",
    }));
    expect(view.comparison?.compatibility).toBe("sandbox_retest");
    expect(view.comparison?.method_category.changed).toBe(true);
  });

  it("marks a result or withheld successor as policy review", () => {
    const view = buildPolicyVersionPlannerView(app({
      policy_id: "acme-identity_liveness-v1",
      policy_template_id: "identity_liveness",
    }));
    expect(view.comparison?.compatibility).toBe("policy_review");
    expect(view.comparison?.result_category.changed).toBe(true);
  });

  it("reports deprecated catalog state for the sandbox demo pack", () => {
    const view = buildPolicyVersionPlannerView(app({
      policy_id: "acme-sandbox_economic_demo-v1",
      policy_template_id: "sandbox_economic_demo",
    }));
    expect(view.availability).toBe("deprecated");
  });

  it("reports unknown catalog state when the pack cannot be resolved", () => {
    const view = buildPolicyVersionPlannerView(app({
      policy_id: "partner-unknown-pack",
      policy_template_id: "custom_sandbox",
    }));
    expect(view.availability).toBe("catalog_unknown");
    expect(view.current).toBeNull();
  });

  it("keeps comparison leak-free and uses a safe Studio handoff", () => {
    const view = buildPolicyVersionPlannerView(app());
    expect(policyVersionPlannerLeaks(view)).toEqual([]);
    expect(JSON.stringify(view)).not.toMatch(/abx_(test|live)|private_key|receipt_id|0x[a-f0-9]{20,}/i);
    expect(view.studio_handoff).toContain("/developers/integration-studio?pack=age_21_retail");
    expect(view.next_actions.some((item) => item.id === "create_sandbox")).toBe(true);
  });

  it("does not treat injected client versions as authority when building from the app row", () => {
    const view = buildPolicyVersionPlannerView(app({ policy_version: 1 }));
    expect(view.pinned_version).not.toBe(99);
    const pack = resolvePolicyPack("age_21_retail")!;
    const from = surfaceFromPack({ pack, version: 1, status: "current" });
    const to = applySuccessor(from, { pack_id: "age_21_retail", version: 2, status: "planning" });
    expect(comparePolicyVersionSurfaces(from, to).compatibility).toBe("unchanged");
    expect(resolvePackForPlanner("age_21_retail", "x")).toBe(pack);
  });

  it("classifies allowed output field changes as policy review", () => {
    const pack = resolvePolicyPack("age_21_retail")!;
    const from = surfaceFromPack({ pack, version: 1, status: "current" });
    const to = applySuccessor(from, {
      pack_id: "age_21_retail",
      version: 2,
      status: "planning",
      allowed_output_fields: [...from.allowed_output_fields, "legal_name"],
    });
    expect(comparePolicyVersionSurfaces(from, to).compatibility).toBe("policy_review");
    expect(comparePolicyVersionSurfaces(from, to).allowed_output_fields.changed).toBe(true);
  });
});
