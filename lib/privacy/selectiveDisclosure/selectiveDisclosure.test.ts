// FILE: lib/privacy/selectiveDisclosure/selectiveDisclosure.test.ts
// Pack profiles, serializers, fail-closed, planner classification, leak detector.

import { describe, expect, it } from "vitest";
import { POLICY_PACK_LIST } from "@/lib/partner/launchpad/policyPacks";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience/brief";
import { toPublicView } from "@/lib/decisionReceipts/views";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildPartnerWebhookPayload } from "@/lib/partner/webhooks/webhookPayloadContract";
import { WEBHOOK_PAYLOAD_ALLOWED_KEYS } from "@/lib/partner/webhooks/webhookPayloadContract";
import { SHARED_SURFACE_FIELDS } from "./contract";
import {
  SELECTIVE_DISCLOSURE_NOTICE,
  SELECTIVE_DISCLOSURE_PROFILES,
  GENERIC_MINIMAL_PROFILE,
  applyDisclosureProfile,
  detectDisclosureLeaks,
  failClosedDisclosureError,
  pickAllowedKeys,
  rejectClientDisclosureConfig,
  resolveDisclosureProfile,
} from "./index";

const FORBIDDEN_SAMPLE = {
  legal_name: "Jane Doe",
  email: "holder@example.com",
  date_of_birth: "1990-01-01",
  wallet_address: "0x" + "ab".repeat(20),
  selfie: "raw",
  credential_jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig",
  provider_payload: { raw: true },
  oauth_token: "secret",
  admin_note: "SQLSTATE 42P01 relation does not exist",
  receipt_id: "dr_secret",
  signature: "sig_secret",
};

function receiptRecord(): DecisionReceiptRecord {
  return {
    id: "dr_public_ok",
    schema_version: "1.0.0",
    verification_decision_id: "dec-1",
    consent_receipt_id: null,
    policy_id: "acme-age_21_retail-v1",
    policy_version: 1,
    partner_id: "acme",
    subject_pseudonym_id: "pseudo_1",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: ["eligible"],
    evaluated_claim_refs: [{
      claim_id: "cl_1",
      claim_type: "age_over_21",
      issuer_id: "issuer",
      status: "active",
      issued_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
    }],
    issuer_refs: ["issuer"],
    decision_context: "sandbox_only",
    evaluated_at: "2026-01-01T00:00:00.000Z",
    expires_at: null,
    status: "active",
    payload_hash: "hash",
    signature: "sig",
    signing_key_id: "k1",
    anchor_reference: null,
    revoked_at: null,
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("selective disclosure profiles", () => {
  it("defines one catalog-derived profile per pack/version surface", () => {
    expect(POLICY_PACK_LIST.length).toBeGreaterThan(0);
    for (const pack of POLICY_PACK_LIST) {
      const profile = SELECTIVE_DISCLOSURE_PROFILES[pack.id];
      expect(profile.pack_id).toBe(pack.id);
      expect(profile.result_category).toBe(pack.disclosed_result);
      expect(profile.partner_visible_result).toBe(pack.partner_receives);
      expect([...profile.withheld]).toEqual([...pack.partner_does_not_receive]);
      expect(profile.public_receipt_fields).toEqual(SHARED_SURFACE_FIELDS.public_receipt);
      expect(profile.sandbox_only === true || profile.production_use === "reviewed_production").toBe(true);
    }
  });

  it("fails closed for missing and invalid disclosure metadata", () => {
    expect(resolveDisclosureProfile(null).ok).toBe(false);
    expect(resolveDisclosureProfile("not-a-pack").ok).toBe(false);
    expect(resolveDisclosureProfile("age_21_retail", 99).ok).toBe(false);
    expect(resolveDisclosureProfile("age_21_retail").ok).toBe(true);
    const missing = applyDisclosureProfile({ status: "ok" }, GENERIC_MINIMAL_PROFILE, "launchpad_summary");
    expect(missing.ok).toBe(true);
    const invalid = applyDisclosureProfile(["not-an-object"], GENERIC_MINIMAL_PROFILE, "holder_brief");
    expect(invalid.ok).toBe(false);
    expect(failClosedDisclosureError("disclosure_unavailable")).toEqual({ error: "disclosure_unavailable" });
    expect(failClosedDisclosureError("SQLSTATE boom")).toEqual({ error: "disclosure_unavailable" });
  });
});

describe("selective disclosure serializers", () => {
  it("keeps holder permitted fields and strips forbidden material", () => {
    const brief = buildHolderRequestBrief({
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      environment: "sandbox",
    });
    expect(brief.shared_result_category.toLowerCase()).toContain("age_eligible");
    expect(brief.environment_detail.toLowerCase()).toContain("not production-usable");
    const mixed = applyDisclosureProfile({ ...brief, ...FORBIDDEN_SAMPLE }, SELECTIVE_DISCLOSURE_PROFILES.age_21_retail, "holder_brief");
    expect(mixed.ok).toBe(true);
    if (mixed.ok) {
      expect(mixed.payload.legal_name).toBeUndefined();
      expect(mixed.payload.email).toBeUndefined();
      expect(mixed.payload.receipt_id).toBeUndefined();
      expect(mixed.payload.requestor).toBe(brief.requestor);
      expect(detectDisclosureLeaks(mixed.payload)).toEqual([]);
    }
  });

  it("preserves public receipt, kit, and webhook contracts that already include receipt crypto", () => {
    const view = toPublicView(receiptRecord());
    expect(view.receipt_id).toBe("dr_public_ok");
    expect(view.signature).toBe("sig");
    expect(view.payload_hash).toBe("hash");
    expect((view as Record<string, unknown>).legal_name).toBeUndefined();

    const webhook = buildPartnerWebhookPayload({
      eventId: "evt_1",
      eventType: "receipt.issued",
      occurredAt: "2026-01-01T00:00:00.000Z",
      partnerId: "acme",
      policyId: "acme-age_21_retail-v1",
      receiptId: "dr_public_ok",
      reasonCode: "eligible",
    });
    expect(webhook.receipt_id).toBe("dr_public_ok");
    expect(Object.keys(webhook).every((key) => (WEBHOOK_PAYLOAD_ALLOWED_KEYS as readonly string[]).includes(key))).toBe(true);
    expect(webhook).not.toHaveProperty("legal_name");

    const kit = pickAllowedKeys({
      kit_version: "1.1.0",
      outcome: "permitted",
      action: "permit",
      errors: [],
      receipt_id: "dr_public_ok",
      decision_result: "approved",
      status: "active",
      policy_id: "acme-age_21_retail-v1",
      partner_id: "acme",
      production_usable: false,
      callback_trusted: false,
      google_sign_in_is_not_eligibility: "account only",
      replay_behavior: "not consume",
      legal_name: "Jane",
    }, SHARED_SURFACE_FIELDS.partner_kit);
    expect(kit?.receipt_id).toBe("dr_public_ok");
    expect(kit?.legal_name).toBeUndefined();
  });

  it("strips forbidden fields from action-contract, consent, passport, and launchpad summaries", () => {
    const surfaces = [
      "action_contract",
      "consent_preview",
      "passport_activity",
      "launchpad_summary",
      "trading_action",
      "payment_action",
    ] as const;
    for (const surface of surfaces) {
      const sealed = applyDisclosureProfile(
        { allowed: true, reason: "permitted", request_id: "vr_1", partner_id: "acme", policy_id: "p", status: "ok", outcome: "ok", ...FORBIDDEN_SAMPLE },
        SELECTIVE_DISCLOSURE_PROFILES.age_21_retail,
        surface,
      );
      expect(sealed.ok, surface).toBe(true);
      if (sealed.ok) {
        expect(sealed.payload.legal_name).toBeUndefined();
        expect(sealed.payload.email).toBeUndefined();
        expect(sealed.payload.wallet_address).toBeUndefined();
        expect(sealed.payload.credential_jwt).toBeUndefined();
      }
    }
  });
});

describe("selective disclosure security", () => {
  it("rejects browser disclosure configuration", () => {
    expect(rejectClientDisclosureConfig({ disclosure_profile: { pack_id: "age_21_retail" } }).ok).toBe(false);
    expect(rejectClientDisclosureConfig({ claim_allowlist: ["email"] }).ok).toBe(false);
    expect(rejectClientDisclosureConfig({ policy_version: 9 }).ok).toBe(false);
    expect(rejectClientDisclosureConfig({ environment: "production" }).ok).toBe(false);
    expect(rejectClientDisclosureConfig({ select: "planning" }).ok).toBe(true);
  });

  it("detects recursive leaks as a secondary check", () => {
    const leaks = detectDisclosureLeaks({
      nested: { email: "a@b.co", inner: { private_key: "k", note: "SQLSTATE 42P01 relation does not exist" } },
    });
    expect(leaks.some((hit) => hit.includes("email"))).toBe(true);
    expect(leaks.some((hit) => hit.includes("private_key"))).toBe(true);
    expect(leaks.some((hit) => hit.includes("sql_error"))).toBe(true);
  });

  it("does not treat withheld labels as leaked emails", () => {
    expect(detectDisclosureLeaks({ withheld: ["email", "legal name"] })).toEqual([]);
  });

  it("states the privacy notice without claiming ZK", () => {
    expect(SELECTIVE_DISCLOSURE_NOTICE.toLowerCase()).toContain("policy result");
    expect(SELECTIVE_DISCLOSURE_NOTICE.toLowerCase()).not.toContain("zero-knowledge");
  });
});
