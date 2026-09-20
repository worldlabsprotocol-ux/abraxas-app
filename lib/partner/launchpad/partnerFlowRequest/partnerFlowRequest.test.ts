import { describe, expect, it } from "vitest";
import { POLICY_PACK_CATALOG_VERSION } from "@/lib/partner/launchpad/policyPacks";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience";
import { parsePartnerFlowRequestBody } from "@/lib/partner/launchpad/partnerFlowRequest/validate";
import { storedConfigFromActivityRows } from "@/lib/partner/launchpad/partnerFlowRequest/activity";
import {
  capabilityAuthorityError,
  enabledPartnerFlowCapabilities,
} from "@/lib/partner/launchpad/partnerFlowRequest/capabilities";
import {
  buildPartnerFlowRequestView,
  partnerFlowViewLeaks,
  sandboxStartLink,
} from "@/lib/partner/launchpad/partnerFlowRequest/view";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { PARTNER_FLOW_REQUEST_EVENT_TYPE } from "@/lib/partner/launchpad/partnerFlowRequest/contract";

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
      enabledCapabilities: ["webhooks"],
    });
    expect(view.capabilities).toEqual(["webhooks"]);
    expect(view.enabled_capabilities).toEqual(["webhooks"]);
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

  it("ignores a later unrelated activity and uses the latest configuration event", () => {
    const allowed = ["http://localhost:3000/callback"];
    const rows = [
      {
        application_id: "app-1",
        partner_id: "acme",
        event_type: PARTNER_FLOW_REQUEST_EVENT_TYPE,
        metadata: {
          purpose: "Confirm adult retail eligibility",
          action: "retail_access",
          callback_ref: "not-persisted-url",
          callback_index: 0,
        },
        created_at: "2026-09-20T10:00:00.000Z",
      },
      {
        application_id: "app-1",
        partner_id: "acme",
        event_type: "sandbox_readiness_run",
        public_code: "trading_preflight",
        metadata: {
          purpose: "Ignore this later sandbox run",
          action: "wallet_bound_action",
          callback_url: "https://evil.example/callback",
        },
        created_at: "2026-09-20T11:00:00.000Z",
      },
    ];
    const stored = storedConfigFromActivityRows(rows, "app-1", "acme", allowed);
    expect(stored.purpose).toBe("Confirm adult retail eligibility");
    expect(stored.action).toBe("retail_access");
    expect(stored.callback_url).toBe("http://localhost:3000/callback");
  });

  it("lets a later configuration activity supersede an earlier one", () => {
    const stored = storedConfigFromActivityRows([
      {
        application_id: "app-1",
        partner_id: "acme",
        event_type: PARTNER_FLOW_REQUEST_EVENT_TYPE,
        metadata: {
          purpose: "Confirm adult retail eligibility",
          action: "retail_access",
          callback_index: 0,
        },
        created_at: "2026-09-20T10:00:00.000Z",
      },
      {
        application_id: "app-1",
        partner_id: "acme",
        event_type: PARTNER_FLOW_REQUEST_EVENT_TYPE,
        metadata: {
          purpose: "Confirm member lounge eligibility",
          action: "membership_access",
          callback_index: 1,
        },
        created_at: "2026-09-20T12:00:00.000Z",
      },
    ], "app-1", "acme", ["http://localhost:3000/callback", "http://localhost:3000/members"]);
    expect(stored.purpose).toBe("Confirm member lounge eligibility");
    expect(stored.action).toBe("membership_access");
    expect(stored.callback_url).toBe("http://localhost:3000/members");
  });

  it("falls back safely when no configuration activity exists", () => {
    const stored = storedConfigFromActivityRows([
      {
        application_id: "app-1",
        partner_id: "acme",
        event_type: "disclosure_viewed",
        metadata: { purpose: "Not configuration" },
        created_at: "2026-09-20T10:00:00.000Z",
      },
    ], "app-1", "acme");
    expect(stored).toEqual({
      purpose: null,
      action: null,
      callback_url: null,
      capabilities: [],
      display_label: null,
    });
  });

  it("rejects forged capabilities that are not already enabled and accepts enabled ones", () => {
    const enabled = enabledPartnerFlowCapabilities({
      webhookConfigured: true,
      starterKitCapabilities: [],
    });
    expect(enabled).toEqual(["webhooks"]);
    expect(capabilityAuthorityError(["webhooks"], enabled)).toBeNull();
    expect(capabilityAuthorityError(["trading_venue"], enabled)).toBe("capability_rejected");
    expect(capabilityAuthorityError(["payment_authorization"], enabled)).toBe("capability_rejected");
    expect(capabilityAuthorityError(["wallet_standard_binding"], enabled)).toBe("capability_rejected");
    expect(capabilityAuthorityError(["solana_gate"], enabled)).toBe("capability_rejected");
    expect(capabilityAuthorityError(["webhooks", "trading_venue"], enabled)).toBe("capability_rejected");
  });
});
