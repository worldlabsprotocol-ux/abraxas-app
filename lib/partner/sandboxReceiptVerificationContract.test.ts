import { describe, expect, it } from "vitest";
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import {
  CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON,
  LEGACY_SANDBOX_ONLY_INVALIDATION_REASON,
} from "@/lib/partner/sandboxReceiptTrustContract";
import {
  EXPECTED_RECEIPT_ARTIFACT_TYPE,
  SUPPORTED_RECEIPT_SCHEMA_VERSION,
  validatePartnerFlowPublicReceipt,
  type PartnerFlowPublicReceipt,
} from "@/lib/partner/verifyPartnerFlowReceipt";

const LIVE_SHAPED_PARTNER = "ref-wc-postrev-5ffe";
const LIVE_SHAPED_POLICY = "ref-wc-postrev-5ffe-wallet_control-v1";
const LIVE_SHAPED_BINDING = "primary:8d30e3b1-3409-4bef-8d04-66335f38e96e";
const NOW = new Date("2026-01-01T00:00:00.000Z");

/** Sanitized fixture modeled on live receipt dr_J-Z4MWhkczb3sSnR public semantics. */
export function liveSandboxWalletControlReceiptFixture(
  overrides: Partial<PartnerFlowPublicReceipt> = {},
): PartnerFlowPublicReceipt {
  return {
    receipt_id: "dr_live_sandbox_fixture",
    schema_version: SUPPORTED_RECEIPT_SCHEMA_VERSION,
    partner_id: LIVE_SHAPED_PARTNER,
    policy_id: LIVE_SHAPED_POLICY,
    policy_version: 1,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    artifact_type: EXPECTED_RECEIPT_ARTIFACT_TYPE,
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: false,
    validity: "sandbox_only",
    lifecycle_status: "invalidated",
    partner_safe_reason: "environment_mismatch",
    invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
    evaluated_claim_refs: [{
      claim_id: "claim-wallet-control",
      claim_type: "wallet_binding_confirmed",
      issuer_id: "issuer:abraxas",
      status: "active",
      issued_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
    }],
    ...overrides,
  };
}

function kit(
  environment: "sandbox" | "production",
  fetchFn?: typeof fetch,
) {
  return new AbraxasPartnerKit({
    partnerId: LIVE_SHAPED_PARTNER,
    policyId: LIVE_SHAPED_POLICY,
    policyVersion: 1,
    environment,
    bindingId: LIVE_SHAPED_BINDING,
    policyPackId: "wallet_control",
    resultFamily: "wallet_control_confirmed",
    fetchFn,
  });
}

describe("sandbox receipt verification contract", () => {
  it("accepts canonical sandbox reason in sandbox context", () => {
    const result = validatePartnerFlowPublicReceipt(liveSandboxWalletControlReceiptFixture(), {
      partnerId: LIVE_SHAPED_PARTNER,
      policyId: LIVE_SHAPED_POLICY,
      mode: "sandbox",
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts legacy sandbox reason in sandbox context", () => {
    const result = validatePartnerFlowPublicReceipt(
      liveSandboxWalletControlReceiptFixture({
        invalidation_reasons: [LEGACY_SANDBOX_ONLY_INVALIDATION_REASON],
        currently_valid: false,
        partner_safe_reason: "environment_mismatch",
      }),
      {
        partnerId: LIVE_SHAPED_PARTNER,
        policyId: LIVE_SHAPED_POLICY,
        mode: "sandbox",
        now: NOW,
      },
    );
    expect(result.ok).toBe(true);
  });

  it("rejects canonical sandbox reason for production authorization", () => {
    const result = validatePartnerFlowPublicReceipt(liveSandboxWalletControlReceiptFixture(), {
      partnerId: LIVE_SHAPED_PARTNER,
      policyId: LIVE_SHAPED_POLICY,
      mode: "production",
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("production_usable_not_true");
  });

  it("expects production_usable false for sandbox receipts", () => {
    const missing = validatePartnerFlowPublicReceipt(
      liveSandboxWalletControlReceiptFixture({ production_usable: undefined }),
      { partnerId: LIVE_SHAPED_PARTNER, policyId: LIVE_SHAPED_POLICY, mode: "sandbox", now: NOW },
    );
    expect(missing.errors).toContain("sandbox_production_usable_missing");

    const trueUsable = validatePartnerFlowPublicReceipt(
      liveSandboxWalletControlReceiptFixture({ production_usable: true }),
      { partnerId: LIVE_SHAPED_PARTNER, policyId: LIVE_SHAPED_POLICY, mode: "sandbox", now: NOW },
    );
    expect(trueUsable.errors).toContain("sandbox_production_usable_not_false");
  });

  it("denies malformed sandbox environment metadata", () => {
    const result = validatePartnerFlowPublicReceipt(
      liveSandboxWalletControlReceiptFixture({
        decision_context: "production",
        invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
      }),
      { partnerId: LIVE_SHAPED_PARTNER, policyId: LIVE_SHAPED_POLICY, mode: "sandbox", now: NOW },
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.startsWith("sandbox_decision_context_mismatch"))).toBe(true);
  });

  it("denies unexpected invalidation reasons", () => {
    const result = validatePartnerFlowPublicReceipt(
      liveSandboxWalletControlReceiptFixture({
        invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON, "claim_revoked"],
      }),
      { partnerId: LIVE_SHAPED_PARTNER, policyId: LIVE_SHAPED_POLICY, mode: "sandbox", now: NOW },
    );
    expect(result.errors).toContain("sandbox_invalidation_reason_mismatch");
  });

  it("live-shaped fixture passes sandbox verifyForAction", async () => {
    const receipt = liveSandboxWalletControlReceiptFixture();
    const client = kit("sandbox", async () => new Response(JSON.stringify(receipt), { status: 200 }));
    const result = await client.verifyForAction({
      receiptId: receipt.receipt_id!,
      expectedBindingId: LIVE_SHAPED_BINDING,
      expectedPackId: "wallet_control",
      expectedResultFamily: "wallet_control_confirmed",
    });
    expect(result.outcome).toBe("permitted");
    expect(permitProtocolAction(result)).toBe(true);
    expect(result.errors).not.toContain("environment_mismatch");
    expect(result.errors).not.toContain("sandbox_invalidation_reason_mismatch");
  });

  it("live-shaped fixture fails production verifyForAction", async () => {
    const receipt = liveSandboxWalletControlReceiptFixture();
    const client = kit("production", async () => new Response(JSON.stringify(receipt), { status: 200 }));
    const result = await client.verifyForAction({ receiptId: receipt.receipt_id! });
    expect(result.outcome).toBe("environment_mismatch");
    expect(permitProtocolAction(result)).toBe(false);
  });

  it("denies wrong partner", async () => {
    const receipt = liveSandboxWalletControlReceiptFixture({ partner_id: "other-partner" });
    const client = kit("sandbox", async () => new Response(JSON.stringify(receipt), { status: 200 }));
    const result = await client.verifyForAction({ receiptId: receipt.receipt_id! });
    expect(result.outcome).toBe("wrong_partner");
  });

  it("denies wrong policy", async () => {
    const receipt = liveSandboxWalletControlReceiptFixture({ policy_id: "other-policy-v1" });
    const client = kit("sandbox", async () => new Response(JSON.stringify(receipt), { status: 200 }));
    const result = await client.verifyForAction({ receiptId: receipt.receipt_id! });
    expect(result.outcome).toBe("wrong_policy");
  });

  it("denies wrong application binding pack/result family", async () => {
    const receipt = liveSandboxWalletControlReceiptFixture();
    const client = kit("sandbox", async () => new Response(JSON.stringify(receipt), { status: 200 }));
    const result = await client.verifyForAction({
      receiptId: receipt.receipt_id!,
      expectedPackId: "age_21_retail",
      expectedResultFamily: "age_eligible_21",
    });
    expect(result.errors).toContain("RECEIPT_PACK_MISMATCH");
    expect(result.errors).toContain("RECEIPT_RESULT_FAMILY_MISMATCH");
    expect(permitProtocolAction(result)).toBe(false);
  });

  it("denies invalid signature", async () => {
    const receipt = liveSandboxWalletControlReceiptFixture({ signature_valid: false });
    const client = kit("sandbox", async () => new Response(JSON.stringify(receipt), { status: 200 }));
    const result = await client.verifyForAction({ receiptId: receipt.receipt_id! });
    expect(result.outcome).toBe("invalid_signature");
  });

  it("denies expired receipt", async () => {
    const receipt = liveSandboxWalletControlReceiptFixture({
      expires_at: "2020-01-01T00:00:00.000Z",
      status: "expired",
    });
    const client = kit("sandbox", async () => new Response(JSON.stringify(receipt), { status: 200 }));
    const result = await client.verifyForAction({ receiptId: receipt.receipt_id! });
    expect(result.outcome).toBe("expired");
  });

  it("denies revoked/current-invalid evidence", async () => {
    const receipt = liveSandboxWalletControlReceiptFixture({
      evaluated_claim_refs: [{
        claim_id: "claim-wallet-control",
        claim_type: "wallet_binding_confirmed",
        issuer_id: "issuer:abraxas",
        status: "revoked",
        issued_at: "2026-01-01T00:00:00.000Z",
        expires_at: null,
      }],
    });
    const client = kit("sandbox", async () => new Response(JSON.stringify(receipt), { status: 200 }));
    const result = await client.verifyForAction({ receiptId: receipt.receipt_id! });
    expect(result.errors.some((e) => e.startsWith("claim_not_active"))).toBe(true);
    expect(permitProtocolAction(result)).toBe(false);
  });

  it("narrow result and verifyForAction agree on sandbox environment semantics", async () => {
    const receipt = liveSandboxWalletControlReceiptFixture();
    const narrow = {
      schema_version: "1.0.0",
      receipt_id: receipt.receipt_id,
      partner_id: LIVE_SHAPED_PARTNER,
      policy_id: LIVE_SHAPED_POLICY,
      decision: "approved",
      result_family: "wallet_control_confirmed",
      currently_valid: true,
      production_usable: false,
      trust_environment: "sandbox" as const,
      invalidation_reasons: [CANONICAL_SANDBOX_ONLY_INVALIDATION_REASON],
    };
    const client = kit("sandbox", async (url) => {
      if (String(url).includes("/narrow-result")) {
        return new Response(JSON.stringify(narrow), { status: 200 });
      }
      return new Response(JSON.stringify(receipt), { status: 200 });
    });
    const [verify, narrowResult] = await Promise.all([
      client.verifyForAction({ receiptId: receipt.receipt_id! }),
      client.fetchNarrowPartnerResult(receipt.receipt_id!),
    ]);
    expect(verify.outcome).toBe("permitted");
    expect(narrowResult.ok).toBe(true);
    if (narrowResult.ok) {
      expect(narrowResult.result.trust_environment).toBe("sandbox");
      expect(narrowResult.result.production_usable).toBe(false);
    }
  });

  it("does not weaken production verification", () => {
    const productionReceipt: PartnerFlowPublicReceipt = {
      ...liveSandboxWalletControlReceiptFixture(),
      production_usable: true,
      decision_context: "production",
      currently_valid: true,
      lifecycle_status: "active",
      partner_safe_reason: null,
      invalidation_reasons: [],
      validity: "active",
    };
    const ok = validatePartnerFlowPublicReceipt(productionReceipt, {
      partnerId: LIVE_SHAPED_PARTNER,
      policyId: LIVE_SHAPED_POLICY,
      mode: "production",
      now: NOW,
    });
    expect(ok.ok).toBe(true);

    const sandboxInProduction = validatePartnerFlowPublicReceipt(liveSandboxWalletControlReceiptFixture(), {
      partnerId: LIVE_SHAPED_PARTNER,
      policyId: LIVE_SHAPED_POLICY,
      mode: "production",
      now: NOW,
    });
    expect(sandboxInProduction.ok).toBe(false);
  });
});
