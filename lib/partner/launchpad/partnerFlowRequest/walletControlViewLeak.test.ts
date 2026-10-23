import { describe, expect, it } from "vitest";
import { buildPartnerFlowRequestView, partnerFlowViewLeaks } from "./view";
import { resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

describe("wallet_control partner flow view safety", () => {
  it("does not fail leak scan for default wallet-control configuration", () => {
    const pack = resolvePolicyPack("wallet_control");
    const app = {
      id: "fbea93d2-6660-428d-85c3-8c4e12d89b05",
      public_slug: "accept-wc",
      partner_id: "studio-accept-wc-1792620888278-6a4a2447dfc8",
      application_name: "Acceptance",
      display_name: "Acceptance accept-wc",
      environment: "sandbox",
      policy_id: "studio--accept-wc--1792620888278--6a4a2447dfc8--wallet_control-v1",
      policy_version: 1,
      policy_template_id: "wallet_control",
      allowed_return_urls: ["https://demo.abraxasworld.xyz/partner/callback"],
      status: "active",
    } satisfies Partial<LaunchpadApplicationRow> as LaunchpadApplicationRow;

    const view = buildPartnerFlowRequestView({
      application: app,
      stored: {
        purpose: pack?.holder_explanation ?? "Prove wallet control for this request.",
        action: "wallet_bound_action",
        callback_url: "https://demo.abraxasworld.xyz/partner/callback",
        capabilities: [],
        display_label: "Acceptance",
      },
      starterKitEvidenced: false,
      enabledCapabilities: [],
    });

    expect(partnerFlowViewLeaks(view)).toEqual([]);
  });
});
