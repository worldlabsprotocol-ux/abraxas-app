import { beforeEach, describe, expect, it, vi } from "vitest";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "network-capability-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});

import {
  NETWORK_CAPABILITY_REGISTRY,
  buildNetworkReadinessView,
  evaluateNetworkAction,
  getNetworkCapability,
  publicNetworkMatrix,
  rejectNetworkClientOverride,
} from "@/lib/partner/networkCapability";
import type { GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";
import {
  AbraxasPortableActionAdapter,
  assertNoSensitivePortableClientKeys,
} from "@/lib/partner/portableActionContract";
import {
  AbraxasTradingVenueAdapter,
  venueFixtureReceipt,
  VENUE_REF_PARTNER_ID,
  VENUE_REF_POLICY_ID,
} from "@/lib/partner/tradingVenue";
import { AbraxasPaymentAuthorizationAdapter } from "@/lib/partner/paymentAuthorization";
import { AbraxasSolanaPartnerAdapter } from "@/lib/partner/solana";
import { CIRCLE_FEATURE, CIRCLE_SETTLEMENT_LABEL } from "@/lib/settlement/circle/constants";
import { resetFakeWalletStandardBackend } from "@/lib/partner/walletStandard/fakeDurableBackend";

function evidence(overrides: Partial<GoLiveEvidence> = {}): GoLiveEvidence {
  return {
    applicationId: "app-1",
    partnerId: "acme",
    status: "active",
    environment: "sandbox",
    policyId: "acme-age_21_retail-v1",
    policyVersion: 1,
    policyTemplateId: "age_21_retail",
    allowedReturnUrls: ["https://partner.example/callback"],
    activeSandboxKey: true,
    webhookConfigured: false,
    webhookEnabled: false,
    latestDeliveryStatus: null,
    verifiedHostnames: ["partner.example"],
    starterKitEvidenced: false,
    starterKitRuntime: null,
    request: null,
    ...overrides,
  };
}

function portable() {
  return new AbraxasPortableActionAdapter({
    partnerId: VENUE_REF_PARTNER_ID,
    policyId: VENUE_REF_POLICY_ID,
    policyVersion: 1,
    environment: "sandbox",
  });
}

describe("mainnet multi-chain readiness layer", () => {
  beforeEach(() => {
    resetFakeWalletStandardBackend();
  });
  it("publishes a server-owned registry that never claims live execution", () => {
    expect(NETWORK_CAPABILITY_REGISTRY.length).toBeGreaterThan(0);
    for (const entry of NETWORK_CAPABILITY_REGISTRY) {
      expect(entry.abraxas_executes).toBe(false);
      expect(entry.funds_movement).toBe(false);
      expect(JSON.stringify(entry)).not.toMatch(/https?:\/\/|api[_-]?key|rpc|entity_secret|wallet_id/i);
    }
    const matrix = publicNetworkMatrix();
    expect(matrix.every((row) => row.live === false)).toBe(true);
    expect(getNetworkCapability("arc_circle_testnet")?.status).toBe("configured");
    expect(getNetworkCapability("arc_circle_mainnet")?.status).toBe("disabled");
    expect(getNetworkCapability("solana_devnet")?.status).toBe("configured");
    expect(getNetworkCapability("solana_mainnet")?.status).toBe("production_review_required");
    expect(getNetworkCapability("evm_mainnet")?.status).toBe("production_review_required");
    expect(getNetworkCapability("evm_sandbox")?.status).toBe("configured");
    expect(getNetworkCapability("hyperliquid_trading_venue")?.status).toBe("configured");
  });

  it("denies production-review and disabled networks", () => {
    const review = evaluateNetworkAction({
      networkId: "evm_mainnet",
      context: {
        productionAccessApproved: true,
        kitEnvironment: "production",
        receiptCurrentlyValid: true,
        durableReplaySatisfied: true,
        partnerExecutionIntegration: true,
        actionType: "enable_protocol_access",
      },
    });
    expect(review).toMatchObject({ ok: false, reason: "production_review_required" });
    const disabled = evaluateNetworkAction({
      networkId: "arc_circle_mainnet",
      context: {
        productionAccessApproved: true,
        kitEnvironment: "production",
        receiptCurrentlyValid: true,
        durableReplaySatisfied: true,
        partnerExecutionIntegration: true,
        actionType: "authorize_checkout",
      },
    });
    expect(disabled).toMatchObject({ ok: false, reason: "disabled" });
  });

  it("keeps testnet distinct from Mainnet", () => {
    const testnet = evaluateNetworkAction({
      networkId: "arc_circle_testnet",
      context: {
        productionAccessApproved: false,
        kitEnvironment: "sandbox",
        receiptCurrentlyValid: true,
        durableReplaySatisfied: true,
        partnerExecutionIntegration: false,
        actionType: "authorize_checkout",
      },
    });
    expect(testnet.ok).toBe(true);
    const mix = evaluateNetworkAction({
      networkId: "arc_circle_testnet",
      context: {
        productionAccessApproved: true,
        kitEnvironment: "production",
        receiptCurrentlyValid: true,
        durableReplaySatisfied: true,
        partnerExecutionIntegration: true,
        actionType: "authorize_checkout",
      },
    });
    expect(mix).toMatchObject({ ok: false, reason: "environment_mismatch" });
  });

  it("requires reviewed Production access before Mainnet", () => {
    const denied = evaluateNetworkAction({
      networkId: "solana_mainnet",
      context: {
        productionAccessApproved: false,
        kitEnvironment: "production",
        receiptCurrentlyValid: true,
        durableReplaySatisfied: true,
        partnerExecutionIntegration: true,
        actionType: "partner_protocol_action",
      },
    });
    expect(denied).toMatchObject({ ok: false, reason: "production_review_required" });
  });

  it("denies unsupported actions on a configured network", () => {
    const denied = evaluateNetworkAction({
      networkId: "hyperliquid_trading_venue",
      context: {
        productionAccessApproved: false,
        kitEnvironment: "sandbox",
        receiptCurrentlyValid: true,
        durableReplaySatisfied: true,
        partnerExecutionIntegration: false,
        actionType: "authorize_checkout",
      },
    });
    expect(denied).toMatchObject({ ok: false, reason: "unsupported_action" });
  });

  it("binds network, action, and requires current receipt plus durable replay", () => {
    expect(evaluateNetworkAction({
      networkId: "hyperliquid_trading_venue",
      context: {
        productionAccessApproved: false,
        kitEnvironment: "sandbox",
        receiptCurrentlyValid: false,
        durableReplaySatisfied: true,
        partnerExecutionIntegration: false,
        actionType: "enable_market_access",
      },
    })).toMatchObject({ ok: false, reason: "receipt_not_current" });
    expect(evaluateNetworkAction({
      networkId: "hyperliquid_trading_venue",
      context: {
        productionAccessApproved: false,
        kitEnvironment: "sandbox",
        receiptCurrentlyValid: true,
        durableReplaySatisfied: false,
        partnerExecutionIntegration: false,
        actionType: "enable_market_access",
      },
    })).toMatchObject({ ok: false, reason: "replay_required" });
    const ok = evaluateNetworkAction({
      networkId: "hyperliquid_trading_venue",
      context: {
        productionAccessApproved: false,
        kitEnvironment: "sandbox",
        receiptCurrentlyValid: true,
        durableReplaySatisfied: true,
        partnerExecutionIntegration: false,
        actionType: "enable_market_access",
      },
    });
    expect(ok.ok).toBe(true);
  });

  it("rejects client network, RPC, wallet, and Production overrides", () => {
    expect(rejectNetworkClientOverride({ network_id: "evm_mainnet" })).toBe(true);
    expect(rejectNetworkClientOverride({ rpc_url: "https://example.invalid" })).toBe(true);
    expect(rejectNetworkClientOverride({ wallet_address: "0xabc" })).toBe(true);
    expect(rejectNetworkClientOverride({ activate_production: true })).toBe(true);
    expect(rejectNetworkClientOverride({ note: "please review" })).toBe(false);
  });

  it("does not leak secrets, wallets, RPC, or transactions from the Launchpad view", () => {
    const view = buildNetworkReadinessView(evidence());
    expect(view.activates_mainnet).toBe(false);
    expect(view.executes_action).toBe(false);
    expect(view.funds_movement).toBe(false);
    const blob = JSON.stringify(view);
    expect(blob).not.toMatch(/abx_(test|live)|entity_secret|rpc_url|wallet_id|0x[a-f0-9]{20,}/i);
    const mainnet = view.networks.find((row) => row.network_id === "arc_circle_mainnet");
    expect(mainnet?.eligible_for_this_app).toBe(false);
    expect(mainnet?.why_unavailable).toMatch(/not configured|disabled/i);
    expect(view.networks.find((row) => row.network_id === "evm_mainnet")?.readiness_reason).toBe("production_review_required");
  });

  it("never executes or moves funds, and keeps Trading/Payment/Solana/Circle compatibility", () => {
    const venue = new AbraxasTradingVenueAdapter({
      partnerId: VENUE_REF_PARTNER_ID,
      policyId: VENUE_REF_POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
    });
    const pay = new AbraxasPaymentAuthorizationAdapter({
      partnerId: VENUE_REF_PARTNER_ID,
      policyId: VENUE_REF_POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
    });
    const solana = new AbraxasSolanaPartnerAdapter({
      partnerId: VENUE_REF_PARTNER_ID,
      policyId: VENUE_REF_POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
    });
    expect(venue.createsTrades).toBe(false);
    expect(pay.createsPayments).toBe(false);
    expect(solana.createsTransactions).toBe(false);
    expect(CIRCLE_FEATURE).toBe("circle_arc_testnet_settlement");
    expect(CIRCLE_SETTLEMENT_LABEL).toContain("testnet");
  });

  it("issues a server-derived network_context only when the registry permits the action", async () => {
    const client = portable();
    const issued = client.issueActionContract({
      action_type: "enable_market_access",
      action_scope: "sandbox:market_access",
      network_id: "hyperliquid_trading_venue",
    });
    if ("ok" in issued) throw new Error("expected contract");
    expect(issued.network_context?.network_id).toBe("hyperliquid_trading_venue");
    const result = client.evaluateFetchedReceipt(venueFixtureReceipt("approved"));
    const bound = await client.preflight({ result, contract: issued });
    expect(bound.allowed).toBe(true);
    expect(assertNoSensitivePortableClientKeys(bound)).toEqual([]);

    const denied = client.issueActionContract({
      action_type: "enable_market_access",
      action_scope: "sandbox:market_access",
      network_id: "evm_mainnet",
    });
    expect(denied).toMatchObject({ ok: false, reason: "action_mismatch" });

    const mainnet = client.issueActionContract({
      action_type: "authorize_checkout",
      action_scope: "sandbox:checkout",
      network_id: "arc_circle_mainnet",
    });
    if ("ok" in mainnet) throw new Error("expected issued then denied at preflight");
    const blocked = await client.preflight({
      result,
      contract: mainnet,
    });
    expect(blocked.allowed).toBe(false);

    const forged = await client.preflight({
      result,
      contract: {
        ...issued,
        network_id: "evm_mainnet",
        rpc_url: "https://example.invalid",
      } as typeof issued,
    });
    expect(forged.allowed).toBe(false);
    expect(forged.reason).toBe("invalid");
  });
});
