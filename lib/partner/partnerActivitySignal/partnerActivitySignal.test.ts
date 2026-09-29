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
  activityCategoriesForPack,
  assertNoSensitiveActivityClientKeys,
  bindingIntegrityHash,
  hashActivitySignalBinding,
  resolveEffectiveActivityCategories,
  validatePartnerActivitySignal,
  verifyBindingIntegrityHash,
  preflightPartnerActivitySignal,
  type AbraxasPartnerActivitySignalAdapterOptions,
  type PartnerActivitySignalBinding,
} from "@/lib/partner/partnerActivitySignal";
import {
  ACTIVITY_REF_PARTNER_ID,
  ACTIVITY_REF_POLICY_ID,
  activityFixtureReceipt,
} from "@/lib/partner/partnerActivitySignal/fixtures";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { resetTradingVenueNonceStoreForTests } from "@/lib/partner/tradingVenue/nonceStore";
import { validateStarterKitInput, generateStarterKit } from "@/lib/partner/starterKit";
import { studioPublicCatalog } from "@/lib/partner/integrationStudio/catalog";

function adapter(overrides?: Partial<AbraxasPartnerActivitySignalAdapterOptions>) {
  return new AbraxasPartnerActivitySignalAdapter({
    partnerId: ACTIVITY_REF_PARTNER_ID,
    policyId: ACTIVITY_REF_POLICY_ID,
    policyVersion: 1,
    environment: "sandbox",
    allowedCategories: [...PARTNER_ACTIVITY_SIGNAL_TYPES],
    policyPack: POLICY_PACKS.collector_redemption,
    purpose: "Confirm one named market-access decision",
    actionScope: "sandbox:market_access",
    ...overrides,
  });
}

async function preflightWithBinding(input: {
  client: AbraxasPartnerActivitySignalAdapter;
  fixture?: ReturnType<typeof activityFixtureReceipt>;
  signal?: { type: string; source: "partner_records"; consent_recorded: true };
  binding?: PartnerActivitySignalBinding | { ok: false };
  payloadHash?: string;
}) {
  const client = input.client;
  const fixture = input.fixture ?? activityFixtureReceipt("approved");
  const result = client.evaluateFetchedReceipt(fixture);
  const signal = input.signal ?? {
    type: "repeat_participant",
    source: "partner_records" as const,
    consent_recorded: true as const,
  };
  const binding = input.binding ?? client.issueActivityBinding({
    receipt_id: result.receipt_id!,
    receipt_payload_hash: input.payloadHash ?? ACTIVITY_FIXTURE_PAYLOAD_HASH,
    activity_signal_type: signal.type,
  });
  if ("ok" in binding) throw new Error("binding");
  return client.preflight({
    result,
    receipt_payload_hash: input.payloadHash ?? ACTIVITY_FIXTURE_PAYLOAD_HASH,
    signal,
    binding,
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

  it("resolves effective categories as system ∩ pack ∩ partner configuration", () => {
    expect(resolveEffectiveActivityCategories({
      packCategories: ["repeat_participant", "holder_loyalty"],
      partnerCategories: ["repeat_participant", "high_activity"],
    })).toEqual(["repeat_participant"]);
    expect(resolveEffectiveActivityCategories({
      packCategories: [],
      partnerCategories: ["repeat_participant"],
    })).toEqual([]);
    expect(activityCategoriesForPack(POLICY_PACKS.age_21_retail, ["repeat_participant", "high_activity"]))
      .toEqual(["repeat_participant"]);
    expect(activityCategoriesForPack(POLICY_PACKS.residency_us, ["repeat_participant"])).toEqual([]);
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
    expect(verifyBindingIntegrityHash(binding)).toBe(true);
    expect(binding.binding_integrity_hash).toBe(bindingIntegrityHash(binding));
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
      policyPack: POLICY_PACKS.age_21_retail,
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
    expect(validateStarterKitInput({
      pack_id: "residency_us",
      path: "hosted_partner_flow",
      runtime: "typescript_nextjs",
      capabilities: ["partner_activity_signal"],
    }).ok).toBe(false);
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
    expect(blob).toContain("allowed_activity_categories");
    expect(blob).not.toMatch(/zkLogin|createTransfer|placeOrder|wallet_address/i);
    expect(assertNoSensitiveActivityClientKeys({ allowed: true, reason: "permitted" })).toEqual([]);
  });

  describe("security and binding integrity", () => {
    it("rejects client-forged bindings without a valid binding_integrity_hash", async () => {
      const client = adapter();
      const forged = {
        partner_id: ACTIVITY_REF_PARTNER_ID,
        policy_id: ACTIVITY_REF_POLICY_ID,
        policy_version: 1,
        receipt_id: "dr_activity_fixture",
        receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
        activity_signal_type: "repeat_participant",
        purpose: "Confirm one named market-access decision",
        action_scope: "sandbox:market_access",
        environment: "sandbox",
        receipt_requirement: "current_public_receipt",
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        nonce: "forged-nonce",
        binding_integrity_hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      };
      const result = await preflightWithBinding({ client, binding: forged as PartnerActivitySignalBinding });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("binding_integrity_mismatch");
    });

    it("rejects tampered receipt_id, partner_id, policy, environment, purpose, scope, category, and expiry", async () => {
      const client = adapter();
      const base = client.issueActivityBinding({
        receipt_id: "dr_activity_fixture",
        receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
        activity_signal_type: "repeat_participant",
      });
      if ("ok" in base) throw new Error("binding");

      const tamperCases: Array<{ label: string; binding: PartnerActivitySignalBinding }> = [
        { label: "receipt_id", binding: { ...base, receipt_id: "dr_other_receipt" } },
        { label: "partner_id", binding: { ...base, partner_id: "other-partner" } },
        { label: "policy_id", binding: { ...base, policy_id: "other-policy" } },
        { label: "policy_version", binding: { ...base, policy_version: 99 } },
        { label: "environment", binding: { ...base, environment: "production" } },
        { label: "purpose", binding: { ...base, purpose: "Forged purpose" } },
        { label: "action_scope", binding: { ...base, action_scope: "forged:scope" } },
        { label: "activity_signal_type", binding: { ...base, activity_signal_type: "high_activity" } },
        { label: "expires_at", binding: { ...base, expires_at: new Date(Date.now() + 3_600_000).toISOString() } },
      ];

      for (const { binding } of tamperCases) {
        const outcome = await preflightWithBinding({ client, binding });
        expect(outcome.allowed, JSON.stringify(binding)).toBe(false);
        expect([
          "binding_integrity_mismatch",
          "receipt_binding_mismatch",
          "partner_mismatch",
          "policy_mismatch",
          "environment_mismatch",
          "activity_category_denied",
          "binding_expired",
          "invalid",
        ]).toContain(outcome.reason);
      }
    });

    it("rejects bindings with undeclared keys", async () => {
      const client = adapter();
      const issued = client.issueActivityBinding({
        receipt_id: "dr_activity_fixture",
        receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
        activity_signal_type: "repeat_participant",
      });
      if ("ok" in issued) throw new Error("binding");
      const withExtra = { ...issued, raw_wallet_history: "never" };
      const extra = await preflightWithBinding({ client, binding: withExtra as PartnerActivitySignalBinding });
      expect(extra.allowed).toBe(false);
      expect(extra.reason).toBe("invalid");
    });

    it("rejects expired bindings", async () => {
      const client = adapter();
      const result = client.evaluateFetchedReceipt(activityFixtureReceipt("approved"));
      const binding = client.issueActivityBinding({
        receipt_id: result.receipt_id!,
        receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
        activity_signal_type: "repeat_participant",
        now: new Date("2020-01-01T00:00:00.000Z"),
        ttlMs: 30_000,
      });
      if ("ok" in binding) throw new Error("binding");
      const expired = await preflightPartnerActivitySignal({
        kit: client.kit,
        result,
        receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
        signal: { type: "repeat_participant", source: "partner_records", consent_recorded: true },
        binding,
        allowed_categories: client.allowedCategories,
        expected_purpose: client.purpose,
        expected_action_scope: client.actionScope,
        now: Date.now(),
      });
      expect(expired.allowed).toBe(false);
      expect(expired.reason).toBe("binding_expired");
    });

    it("rejects signal category mismatch after binding issuance", async () => {
      const client = adapter();
      const result = client.evaluateFetchedReceipt(activityFixtureReceipt("approved"));
      const binding = client.issueActivityBinding({
        receipt_id: result.receipt_id!,
        receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
        activity_signal_type: "repeat_participant",
      });
      if ("ok" in binding) throw new Error("binding");
      const outcome = await client.preflight({
        result,
        receipt_payload_hash: ACTIVITY_FIXTURE_PAYLOAD_HASH,
        signal: {
          type: "holder_loyalty",
          source: "partner_records",
          consent_recorded: true,
        },
        binding,
      });
      expect(outcome.allowed).toBe(false);
      expect(outcome.reason).toBe("receipt_binding_mismatch");
    });
  });
});
