// FILE: lib/partner/tradingVenue/profiles/venueProfiles.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "wallet-standard-durable-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import {
  AbraxasTradingVenueAdapter,
  TRADING_VENUE_CLIENT_VISIBLE_KEYS,
  VENUE_REF_PARTNER_ID,
  VENUE_REF_POLICY_ID,
  assertNoSensitiveVenueClientKeys,
  venueFixtureReceipt,
} from "@/lib/partner/tradingVenue";
import {
  VENUE_MAINNET_EXTERNAL_REQUIREMENTS,
  VENUE_PROFILE_NEXT_STEPS,
  getVenueProfile,
  publicVenueProfileMatrix,
  rejectVenueProfileClientOverride,
  selectableSandboxVenueProfiles,
} from "@/lib/partner/tradingVenue/profiles";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";
import { studioSnippetForPath, studioPublicCatalog } from "@/lib/partner/integrationStudio";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { buildSandboxTestConsoleView } from "@/lib/partner/launchpad/sandboxTestConsole/view";

function adapter(profileId?: string, environment: "sandbox" | "production" = "sandbox") {
  return new AbraxasTradingVenueAdapter({
    partnerId: VENUE_REF_PARTNER_ID,
    policyId: VENUE_REF_POLICY_ID,
    policyVersion: 1,
    environment,
    venueProfileId: profileId,
  });
}

describe("trading venue integration profiles", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
  });

  it("keeps the generic profile compatible with enable_market_access", async () => {
    const client = adapter("generic_trading_venue");
    const issued = client.issueActionContract({
      action_type: "enable_market_access",
      action_scope: "sandbox:market_access",
    });
    if ("ok" in issued) throw new Error("contract");
    expect(issued.network_context).toBeUndefined();
    expect(issued.wallet_binding).toBe("not_attached");
    const bound = await client.preflight({
      result: client.evaluateFetchedReceipt(venueFixtureReceipt("approved")),
      contract: issued,
    });
    expect(bound.allowed).toBe(true);
    expect(bound.reason).toBe("permitted");
    expect(Object.keys(bound).sort()).toEqual([...TRADING_VENUE_CLIENT_VISIBLE_KEYS].sort());
    expect(assertNoSensitiveVenueClientKeys(bound)).toEqual([]);
  });

  it("allows Hyperliquid sandbox preflight and denies production, unknown, planned, and disabled profiles", async () => {
    const hyper = adapter("hyperliquid_trading_venue");
    const issued = hyper.issueActionContract();
    if ("ok" in issued) throw new Error("contract");
    expect(issued.network_context?.network_id).toBe("hyperliquid_trading_venue");
    const allowed = await hyper.preflight({
      result: hyper.evaluateFetchedReceipt(venueFixtureReceipt("approved")),
      contract: issued,
    });
    expect(allowed.allowed).toBe(true);
    expect(hyper.callsVenueApi).toBe(false);

    expect(adapter("hyperliquid_trading_venue", "production").issueActionContract()).toEqual({
      ok: false,
      reason: "environment_mismatch",
    });
    expect(adapter("unknown_venue").issueActionContract()).toEqual({
      ok: false,
      reason: "profile_unknown",
    });
    expect(adapter("solana_trading_venue").issueActionContract()).toEqual({
      ok: false,
      reason: "profile_planned",
    });
    expect(adapter("evm_trading_venue").issueActionContract()).toEqual({
      ok: false,
      reason: "profile_planned",
    });
    expect(adapter("disabled_trading_venue").issueActionContract()).toEqual({
      ok: false,
      reason: "profile_disabled",
    });
    expect(getVenueProfile("solana_trading_venue")?.posture).toBe("planned");
    expect(getVenueProfile("evm_trading_venue")?.posture).toBe("planned");
    expect(getVenueProfile("disabled_trading_venue")?.posture).toBe("disabled");
  });

  it("rejects wrong partner/policy/version/action/scope, expired/revoked/denied receipts, and nonce replay", async () => {
    const client = adapter("hyperliquid_trading_venue");
    const result = client.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const contract = client.issueActionContract();
    if ("ok" in contract) throw new Error("contract");
    expect((await client.preflight({
      result: client.evaluateFetchedReceipt(venueFixtureReceipt("denied")),
      contract: client.issueActionContract() as Exclude<ReturnType<typeof client.issueActionContract>, { ok: false }>,
    })).reason).toBe("policy_denied");
    expect((await client.preflight({
      result: client.evaluateFetchedReceipt(venueFixtureReceipt("expired")),
      contract: client.issueActionContract() as Exclude<ReturnType<typeof client.issueActionContract>, { ok: false }>,
    })).reason).toBe("receipt_expired");
    expect((await client.preflight({
      result: client.evaluateFetchedReceipt(venueFixtureReceipt("revoked")),
      contract: client.issueActionContract() as Exclude<ReturnType<typeof client.issueActionContract>, { ok: false }>,
    })).reason).toBe("receipt_revoked");
    expect((await client.preflight({
      result: client.evaluateFetchedReceipt(venueFixtureReceipt("cross_partner")),
      contract: client.issueActionContract() as Exclude<ReturnType<typeof client.issueActionContract>, { ok: false }>,
    })).reason).toBe("partner_mismatch");
    expect((await client.preflight({
      result: client.evaluateFetchedReceipt(venueFixtureReceipt("altered_policy")),
      contract: client.issueActionContract() as Exclude<ReturnType<typeof client.issueActionContract>, { ok: false }>,
    })).reason).toBe("policy_mismatch");
    expect((await client.preflight({ result, contract, action_type: "place_order" })).reason).toBe("action_mismatch");
    expect((await client.preflight({ result, contract })).allowed).toBe(true);
    expect((await client.preflight({ result, contract })).reason).toBe("replayed");
  });

  it("rejects client profile overrides and never leaks venue API, RPC, wallet, order, or account fields", () => {
    expect(rejectVenueProfileClientOverride({ venue_profile_id: "hyperliquid_trading_venue" })).toBe(true);
    expect(rejectVenueProfileClientOverride({ action_type: "enable_market_access" })).toBe(false);
    expect(adapter().issueActionContract({
      action_type: "enable_market_access",
      venue_profile_id: "hyperliquid_trading_venue",
    } as never)).toEqual({ ok: false, reason: "invalid" });
    const src = [
      readFileSync(join(process.cwd(), "lib/partner/tradingVenue/adapter.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/partner/tradingVenue/profiles/registry.ts"), "utf8"),
    ].join("\n");
    expect(src).not.toMatch(/fetch\(|axios|placeOrder|getBalance|info\.hyperliquid|window\.ethereum/i);
    expect(selectableSandboxVenueProfiles().map((row) => row.profile_id)).toEqual([
      "generic_trading_venue",
      "hyperliquid_trading_venue",
    ]);
    expect(publicVenueProfileMatrix().every((row) => row.live === false && row.abraxas_executes === false)).toBe(true);
    expect(VENUE_MAINNET_EXTERNAL_REQUIREMENTS.length).toBeGreaterThanOrEqual(5);
    expect(VENUE_PROFILE_NEXT_STEPS.join(" ")).toContain("Production review");
  });

  it("covers Launchpad, Studio, and Starter Kit profile examples without execution code", () => {
    const snippet = studioSnippetForPath("trading_venue");
    expect(snippet.code).toContain("venueProfileId");
    expect(snippet.docs).toBe("/docs/trading-venue-profiles");
    expect(studioPublicCatalog().trading_venue.profiles?.length).toBeGreaterThanOrEqual(2);
    const view = buildSandboxTestConsoleView({
      application_id: "app-1",
      status: "active",
      environment: "sandbox",
      policy_version: 1,
      policy_template_id: "age_21_retail",
      allowed_return_urls: ["http://localhost:3000/callback"],
      has_sandbox_key: true,
      webhook_configured: true,
    }, ["trading_venue"]);
    expect(view.checks.find((item) => item.id === "trading_venue")?.next_step).toContain("receipt preflight");
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "trading_venue",
      runtime: "typescript_nextjs",
      capabilities: [],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kit = generateStarterKit(validated.selection);
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    const blob = kit.files.map((file) => file.contents).join("\n");
    expect(blob).toContain("generic_trading_venue");
    expect(blob).toContain("hyperliquid_trading_venue");
    expect(blob).not.toMatch(/placeOrder|getBalance|submitOrder/i);
    for (const runtime of ["universal_https", "typescript_nextjs", "typescript_express", "javascript_wix_velo", "typescript_serverless"] as const) {
      const platformKit = generateStarterKit({
        ...validated.selection,
        runtime,
        platform: runtime === "universal_https" ? "universal_https"
          : runtime === "typescript_nextjs" ? "nextjs"
            : runtime === "typescript_express" ? "express"
              : runtime === "javascript_wix_velo" ? "wix_velo"
                : "serverless",
      });
      expect(platformKit.ok).toBe(true);
      if (!platformKit.ok) continue;
      expect(platformKit.files.map((file) => file.contents).join("\n")).toContain("hyperliquid_trading_venue");
    }
  });
});
