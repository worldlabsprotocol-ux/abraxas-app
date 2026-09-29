// FILE: lib/partner/partnerActivitySignal/partnerActivitySignal.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "partner-activity-signal-test-secret";

vi.mock("@/lib/supabase/admin", async () => {
  const { requireWalletStandardTestAdmin } = await import("@/lib/partner/walletStandard/fakeDurableBackend");
  return { requireSupabaseAdmin: requireWalletStandardTestAdmin };
});
import {
  AbraxasPartnerActivitySignalAdapter,
  ACTIVITY_FIXTURE_PAYLOAD_HASH,
  PARTNER_ACTIVITY_SIGNAL_TYPES,
  assertNoSensitiveActivityClientKeys,
  hashActivitySignalBinding,
  validatePartnerActivitySignal,
} from "@/lib/partner/partnerActivitySignal";
import {
  ACTIVITY_REF_PARTNER_ID,
  ACTIVITY_REF_POLICY_ID,
  activityFixtureReceipt,
} from "@/lib/partner/partnerActivitySignal/fixtures";
import { resetTradingVenueNonceStoreForTests } from "@/lib/partner/tradingVenue/nonceStore";
import { validateStarterKitInput, generateStarterKit } from "@/lib/partner/starterKit";
import { studioPublicCatalog } from "@/lib/partner/integrationStudio/catalog";

function adapter() {
  return new AbraxasPartnerActivitySignalAdapter({
    partnerId: ACTIVITY_REF_PARTNER_ID,
    policyId: ACTIVITY_REF_POLICY_ID,
    policyVersion: 1,
    environment: "sandbox",
    allowedCategories: [...PARTNER_ACTIVITY_SIGNAL_TYPES],
    purpose: "Confirm one named market-access decision",
    actionScope: "sandbox:market_access",
  });
}

describe("partner activity signal", () => {
  afterEach(() => {
    resetTradingVenueNonceStoreForTests();
  });

  it("accepts only narrow, consented partner activity categories", () => {
    expect(validatePartnerActivitySignal({
      type: "holder_loyalty",
      source: "partner_records",
      consent_recorded: true,
    })).toEqual({
      ok: true,
      signal: { type: "holder_loyalty", source: "partner_records", consent_recorded: true },
    });
    expect(validatePartnerActivitySignal({
      type: "holder_loyalty",
      source: "partner_records",
      consent_recorded: true,
      wallet_address: "never-send-this",
    })).toEqual({ ok: false, code: "raw_activity_forbidden" });
    expect(validatePartnerActivitySignal({
      type: "whale",
      source: "partner_records",
      consent_recorded: true,
    })).toEqual({ ok: false, code: "invalid_activity_signal" });
  });

  it("binds a consented category to the current receipt without raw activity data", async () => {
    const client = adapter();
    const result = client.evaluateFetchedReceipt(activityFixtureReceipt("approved"));
    const binding = client.issueActivityBinding({
      receipt_id: result.receipt_id!,
      receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
      activity_signal_type: "repeat_participant",
    });
    if ("ok" in binding) throw new Error("binding");
    expect(hashActivitySignalBinding(binding)).toMatch(/^[0-9a-f]{64}$/);
    const first = await client.preflight({
      result,
      receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
      signal: {
        type: "repeat_participant",
        source: "partner_records",
        consent_recorded: true,
      },
      binding,
    });
    expect(first.allowed).toBe(true);
    expect(first.activity_binding.receipt_bound).toBe(true);
    expect(first.activity_binding.activity_signal_type).toBe("repeat_participant");
    const replay = await client.preflight({
      result,
      receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
      signal: {
        type: "repeat_participant",
        source: "partner_records",
        consent_recorded: true,
      },
      binding,
    });
    expect(replay.allowed).toBe(false);
    expect(replay.reason).toBe("replayed");
  });

  it("fails closed on denied, expired, revoked, mismatched, and disallowed categories", async () => {
    const client = adapter();
    const approved = client.evaluateFetchedReceipt(activityFixtureReceipt("approved"));
    const signal = {
      type: "high_activity" as const,
      source: "partner_records" as const,
      consent_recorded: true as const,
    };
    async function bindingFor(fixture: ReturnType<typeof activityFixtureReceipt>) {
      const result = client.evaluateFetchedReceipt(fixture);
      const binding = client.issueActivityBinding({
        receipt_id: result.receipt_id!,
        receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
        activity_signal_type: "high_activity",
      });
      if ("ok" in binding) throw new Error("binding");
      return { result, binding };
    }
    const denied = await bindingFor(activityFixtureReceipt("denied"));
    expect((await client.preflight({
      result: denied.result,
      receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
      signal,
      binding: denied.binding,
    })).reason).toBe("policy_denied");
    const expired = await bindingFor(activityFixtureReceipt("expired"));
    expect((await client.preflight({
      result: expired.result,
      receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
      signal,
      binding: expired.binding,
    })).reason).toBe("receipt_expired");
    const revoked = await bindingFor(activityFixtureReceipt("revoked"));
    expect((await client.preflight({
      result: revoked.result,
      receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
      signal,
      binding: revoked.binding,
    })).reason).toBe("receipt_revoked");
    const approvedBinding = client.issueActivityBinding({
      receipt_id: approved.receipt_id!,
      receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
      activity_signal_type: "high_activity",
    });
    if ("ok" in approvedBinding) throw new Error("binding");
    expect((await client.preflight({
      result: approved,
      receipt_payload_hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      signal,
      binding: approvedBinding,
    })).reason).toBe("receipt_binding_mismatch");
    const narrow = new AbraxasPartnerActivitySignalAdapter({
      partnerId: ACTIVITY_REF_PARTNER_ID,
      policyId: ACTIVITY_REF_POLICY_ID,
      policyVersion: 1,
      environment: "sandbox",
      allowedCategories: ["holder_loyalty"],
      purpose: "Confirm one named market-access decision",
      actionScope: "sandbox:market_access",
    });
    expect((await narrow.preflight({
      result: approved,
      receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
      signal,
      binding: approvedBinding,
    })).reason).toBe("activity_category_denied");
  });

  it("does not require wallet, zkLogin, API keys, or payments", () => {
    const client = adapter();
    expect(client.requiresApiKeys).toBe(false);
    expect(client.requiresZkLogin).toBe(false);
    expect(client.connectsWallet).toBe(false);
    expect(client.fundsMovement).toBe(false);
    expect(client.createsTransactions).toBe(false);
  });

  it("exposes partner_activity_signal as an optional starter-kit capability", () => {
    expect(studioPublicCatalog().starter_kit.optional_capabilities).toContain("partner_activity_signal");
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "trading_venue",
      runtime: "typescript_nextjs",
      capabilities: ["partner_activity_signal", "trading_venue"],
      venue_profile_id: "tokenized_securities_venue",
    });
    expect(validated.ok).toBe(false);
    const ok = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "hosted_partner_flow",
      runtime: "typescript_nextjs",
      capabilities: ["partner_activity_signal"],
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    const kit = generateStarterKit(ok.selection);
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    const blob = kit.files.map((file) => file.contents).join("\n");
    expect(blob).toContain("AbraxasPartnerActivitySignalAdapter");
    expect(blob).not.toMatch(/zkLogin|createTransfer|placeOrder|wallet_address/i);
    expect(assertNoSensitiveActivityClientKeys({ allowed: true, reason: "permitted" })).toEqual([]);
  });
});
