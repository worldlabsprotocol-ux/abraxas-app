import { describe, expect, it } from "vitest";
import {
  AbraxasPartnerKit,
  CONFORMANCE_COMMAND_EXAMPLE,
  PARTNER_INTEGRATION_KIT_VERSION,
  PARTNER_INTEGRATION_REPLAY_BEHAVIOR,
  PARTNER_INTEGRATION_SOURCE_LEVEL,
  permitProtocolAction,
  parsePartnerCallbackParams,
} from "@/lib/partner/integrationKit";

function kit(overrides: Partial<ConstructorParameters<typeof AbraxasPartnerKit>[0]> = {}) {
  return new AbraxasPartnerKit({
    partnerId: "partner-acme",
    policyId: "partner-acme-age_21_retail-v1",
    policyVersion: 1,
    environment: "sandbox",
    ...overrides,
  });
}

describe("Partner Integration Kit", () => {

  it("never treats callback query parameters as authorization", async () => {
    const result = await kit().verifyCallback(new URLSearchParams({
      receipt_id: "dr_forged",
      decision: "approved",
      status: "active",
    }));
    expect(result.callback_trusted).toBe(false);
    expect(permitProtocolAction(result)).toBe(false);
  });

  it("rejects PII callback keys", () => {
    const parsed = parsePartnerCallbackParams(new URLSearchParams({
      receipt_id: "dr_1",
      email: "holder@example.com",
    }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors).toContain("pii_in_callback");
      expect(JSON.stringify(parsed.errors)).not.toContain("holder@example.com");
      expect(JSON.stringify(parsed.errors)).not.toContain("email");
    }
  });

  it("does not echo forged callback query values in kit client JSON", async () => {
    const result = await kit().verifyCallback(new URLSearchParams({
      receipt_id: "dr_forged",
      email: "holder@example.com",
      return_url: "https://evil.example/callback",
    }));
    const json = JSON.stringify(result);
    expect(result.callback_trusted).toBe(false);
    expect(result.errors).toContain("callback_untrusted");
    expect(json).not.toContain("holder@example.com");
    expect(json).not.toContain("evil.example");
    expect(json).not.toMatch(/SQLSTATE|oauth_token|0x[a-f0-9]{40}/i);
  });

  it("maps receipt trust failures to typed outcomes", () => {
    const client = kit();
    const base = {
      receipt_id: "dr_kit",
      schema_version: "1.0.0",
      partner_id: "partner-acme",
      policy_id: "partner-acme-age_21_retail-v1",
      policy_version: 1,
      decision_result: "approved",
      signature_valid: true,
      expires_at: "2099-01-01T00:00:00.000Z",
      status: "active",
      production_usable: false,
      decision_context: "sandbox_only",
      currently_valid: true,
      invalidation_reasons: [] as string[],
      artifact_type: "eligibility_decision_receipt",
    };
    expect(client.evaluateFetchedReceipt(base).outcome).toBe("permitted");
    expect(permitProtocolAction(client.evaluateFetchedReceipt(base))).toBe(true);
    expect(client.evaluateFetchedReceipt({ ...base, decision_result: "denied" }).outcome).toBe("denied");
    expect(client.evaluateFetchedReceipt({ ...base, expires_at: "2020-01-01T00:00:00.000Z", status: "expired" }).outcome).toBe("expired");
    expect(client.evaluateFetchedReceipt({ ...base, status: "revoked" }).outcome).toBe("revoked");
    expect(client.evaluateFetchedReceipt({ ...base, partner_id: "other" }).outcome).toBe("wrong_partner");
    expect(client.evaluateFetchedReceipt({ ...base, policy_id: "other-policy-v1" }).outcome).toBe("wrong_policy");
    expect(client.evaluateFetchedReceipt({ ...base, signature_valid: false }).outcome).toBe("invalid_signature");
    expect(kit({ environment: "production" }).evaluateFetchedReceipt(base).outcome).toBe("environment_mismatch");
  });

  it("fails closed when configured policy version is missing or mismatched", () => {
    const client = kit({ policyVersion: 1 });
    const base = {
      receipt_id: "dr_kit",
      schema_version: "1.0.0",
      partner_id: "partner-acme",
      policy_id: "partner-acme-age_21_retail-v1",
      decision_result: "approved",
      signature_valid: true,
      expires_at: "2099-01-01T00:00:00.000Z",
      status: "active",
      production_usable: false,
      currently_valid: true,
      invalidation_reasons: [] as string[],
    };
    const missing = client.evaluateFetchedReceipt(base);
    expect(missing.outcome).toBe("policy_version_missing");
    expect(missing.errors).toContain("policy_version_missing");
    expect(permitProtocolAction(missing)).toBe(false);

    const mismatched = client.evaluateFetchedReceipt({ ...base, policy_version: 9 } as typeof base & { policy_version: number });
    expect(mismatched.outcome).toBe("wrong_policy_version");
    expect(mismatched.errors.some((error) => error.startsWith("policy_version_mismatch"))).toBe(true);
    expect(permitProtocolAction(mismatched)).toBe(false);
  });

  it("discloses public receipt reuse honestly", () => {
    expect(PARTNER_INTEGRATION_REPLAY_BEHAVIOR.toLowerCase()).toContain("not a one time consume");
    expect(PARTNER_INTEGRATION_REPLAY_BEHAVIOR.toLowerCase()).toContain("do not treat public get as replay protection");
    expect(CONFORMANCE_COMMAND_EXAMPLE).toContain("npm run partner:conformance");
    expect(PARTNER_INTEGRATION_KIT_VERSION).toBe("1.1.0");
    expect(PARTNER_INTEGRATION_SOURCE_LEVEL.toLowerCase()).toContain("not a published npm package");
  });

  it("maps typed policy-version fail-closed codes", () => {
    const client = kit({ policyVersion: 1, requirePolicyVersion: true });
    const base = {
      receipt_id: "dr_kit",
      schema_version: "1.0.0",
      partner_id: "partner-acme",
      policy_id: "partner-acme-age_21_retail-v1",
      policy_version: 1,
      decision_result: "approved",
      signature_valid: true,
      expires_at: "2099-01-01T00:00:00.000Z",
      status: "active",
      production_usable: false,
      currently_valid: true,
      invalidation_reasons: [] as string[],
    };
    expect(kit({ policyVersion: undefined, requirePolicyVersion: true }).evaluateFetchedReceipt(base as typeof base).outcome).toBe("policy_version_not_adopted");
    expect(permitProtocolAction(client.evaluateFetchedReceipt({ ...base, partner_id: "other" }))).toBe(false);
  });

  it("builds a hosted verification URL without API keys", () => {
    const url = kit({ appSlug: "acme-app" }).createHostedVerificationUrl("https://partner.example/callback");
    expect(url).toContain("/partner/verify");
    expect(url).toContain("app=acme-app");
    expect(url).not.toContain("abx_");
  });
});
