import { describe, expect, it } from "vitest";
import { POLICY_PACK_CATALOG_VERSION } from "@/lib/partner/launchpad/policyPacks";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience";
import { parsePartnerFlowRequestBody } from "@/lib/partner/launchpad/partnerFlowRequest/validate";
import {
  buildPartnerFlowRequestView,
  partnerFlowViewLeaks,
  sandboxStartLink,
} from "@/lib/partner/launchpad/partnerFlowRequest/view";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

const app: LaunchpadApplicationRow = {
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
};

describe("Partner Flow request configuration", () => {
  it("accepts a valid purpose, action, and callback index", () => {
    const parsed = parsePartnerFlowRequestBody({
      purpose: "Confirm adult retail eligibility",
      action: "retail_access",
      callback_index: 0,
      display_label: "Acme Shop",
      capabilities: ["webhooks"],
    });
    expect(parsed.ok).toBe(true);
  });

  it("rejects invalid purpose, unknown action, extra keys, and client policy fields", () => {
    expect(parsePartnerFlowRequestBody({
      purpose: "too short",
      action: "retail_access",
      callback_index: 0,
    }).ok).toBe(false);
    expect(parsePartnerFlowRequestBody({
      purpose: "Confirm adult retail eligibility",
      action: "mint_token",
      callback_index: 0,
    }).ok).toBe(false);
    expect(parsePartnerFlowRequestBody({
      purpose: "Email us at ops@acme.test please",
      action: "retail_access",
      callback_index: 0,
    }).ok).toBe(false);
    expect(parsePartnerFlowRequestBody({
      purpose: "Confirm adult retail eligibility",
      action: "retail_access",
      callback_index: 0,
      policy_version: 9,
    }).ok).toBe(false);
    expect(parsePartnerFlowRequestBody({
      purpose: "Confirm adult retail eligibility",
      action: "retail_access",
      callback_index: 0,
      return_url: "https://evil.example/callback",
    }).ok).toBe(false);
  });

  it("keeps policy id and version server-pinned and preview leak-free", () => {
    const view = buildPartnerFlowRequestView({
      application: app,
      stored: {
        purpose: "Confirm adult retail eligibility",
        action: "retail_access",
        callback_url: "http://localhost:3000/callback",
        capabilities: ["webhooks"],
        display_label: "Acme",
      },
      starterKitEvidenced: false,
    });
    expect(view.policy_version).toBe(1);
    expect(view.policy_template_id).toBe("age_21_retail");
    expect(view.issues_production_key).toBe(false);
    expect(view.activates_production).toBe(false);
    expect(view.starts_oauth).toBe(false);
    expect(view.sandbox_start_link).toBe(sandboxStartLink("acme-retail"));
    expect(view.sandbox_start_link).not.toContain("return_url");
    expect(JSON.stringify(view.preview)).not.toContain("localhost");
    expect(JSON.stringify(view.preview)).not.toContain("callback");
    expect(view.callback_options[0].label).toBe("Approved callback 1");
    expect(partnerFlowViewLeaks(view)).toEqual([]);
    expect(view.next_steps.some((step) => step.id === "starter_kit")).toBe(true);
    const brief = buildHolderRequestBrief({
      partnerName: "Acme",
      policyId: app.policy_id,
      userExplanation: "Confirm adult retail eligibility",
      environment: "sandbox",
    });
    expect(view.preview?.purpose).toBe(brief.purpose);
    expect(view.preview?.result).toBe(brief.result);
    expect(view.preview?.shared_result_category).toBe(brief.shared_result_category);
    expect(POLICY_PACK_CATALOG_VERSION).toBe(1);
  });

  it("asks for an approved callback when none exist", () => {
    const view = buildPartnerFlowRequestView({
      application: { ...app, allowed_return_urls: [] },
      stored: {
        purpose: null,
        action: null,
        callback_url: null,
        capabilities: [],
        display_label: null,
      },
      starterKitEvidenced: true,
    });
    expect(view.sandbox_start_link).toBeNull();
    expect(view.next_steps.map((step) => step.id)).toContain("add_callback");
  });
});
