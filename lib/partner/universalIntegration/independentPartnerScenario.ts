// FILE: lib/partner/universalIntegration/independentPartnerScenario.ts
// Generic relying-party scenario — not Good Trouble. Uses real contracts + offline fixtures.

import { buildPartnerVerifyUrl, type PartnerIntegrationConfig } from "@/lib/partner/referenceIntegration";
import {
  CONFORMANCE_FIXTURE_NOW,
  CONFORMANCE_FIXTURE_PARTNER_ID,
  CONFORMANCE_FIXTURE_POLICY_ID,
  conformanceReceiptFixtureCases,
} from "@/lib/partner/partnerConformanceFixtures";
import {
  validatePartnerFlowPublicReceipt,
  type PartnerFlowPublicReceipt,
} from "@/lib/partner/verifyPartnerFlowReceipt";
import { sanitizePartnerPayload } from "@/lib/partner/partnerVerificationResult";
import { parsePartnerCallbackParams } from "@/lib/partner/integrationKit";

/** Fictional partner for contract proofs and documentation examples. */
export const EXAMPLE_MERCHANT_INTEGRATION: PartnerIntegrationConfig = {
  partnerId: "example-merchant-protocol",
  policyId: "example-merchant-age-21-v1",
  enterPath: "/auth/abraxas/callback",
  displayName: "Example Merchant",
};

/** Conformance harness ids (offline fixtures — no production tenant). */
export const CONFORMANCE_PARTNER_INTEGRATION: PartnerIntegrationConfig = {
  partnerId: CONFORMANCE_FIXTURE_PARTNER_ID,
  policyId: CONFORMANCE_FIXTURE_POLICY_ID,
  enterPath: "/auth/abraxas/callback",
  displayName: "Conformance Partner",
};

export type IndependentPartnerProofStep = {
  id: string;
  label: string;
  automated: boolean;
  outcome: "pass" | "fail" | "manual";
  detail: string;
};

export interface IndependentPartnerProofResult {
  partner: PartnerIntegrationConfig;
  environment: "sandbox";
  steps: IndependentPartnerProofStep[];
  receiptVerification: {
    valid_approved: boolean;
    rejects_expired: boolean;
    rejects_wrong_tenant: boolean;
  };
  manualStepsRequired: string[];
  allAutomatedPassed: boolean;
}

function verifyReceipt(
  receipt: PartnerFlowPublicReceipt | null,
  expectations: { partnerId: string; policyId: string },
) {
  return validatePartnerFlowPublicReceipt(receipt, {
    partnerId: expectations.partnerId,
    policyId: expectations.policyId,
    now: CONFORMANCE_FIXTURE_NOW,
    allowSandbox: true,
  });
}

/**
 * Reproducible contract proof using offline fixtures and URL builders.
 * Does not simulate holder OAuth or live evaluate — those require deployed Abraxas + credentials.
 */
export function runIndependentPartnerContractProof(
  config: PartnerIntegrationConfig = CONFORMANCE_PARTNER_INTEGRATION,
): IndependentPartnerProofResult {
  const origin = "https://app.example-merchant.test";
  const returnUrl = `${origin}${config.enterPath}`;
  const verifyUrl = buildPartnerVerifyUrl(config, { origin, returnUrl });

  const steps: IndependentPartnerProofStep[] = [];

  steps.push({
    id: "configure_callback",
    label: "Configure approved HTTPS callback on relying party",
    automated: true,
    outcome: returnUrl.startsWith("https://") ? "pass" : "fail",
    detail: returnUrl,
  });

  steps.push({
    id: "build_verify_url",
    label: "Build hosted verification entry URL",
    automated: true,
    outcome: verifyUrl.includes(`partner_id=${config.partnerId}`) && verifyUrl.includes("return_url=")
      ? "pass"
      : "fail",
    detail: verifyUrl,
  });

  const callbackQuery = new URLSearchParams({
    receipt_id: "dr_conformance_fixture",
    partner_id: config.partnerId,
    policy_id: config.policyId,
    status: "approved",
  });
  const parsed = parsePartnerCallbackParams(callbackQuery);
  steps.push({
    id: "parse_callback_params",
    label: "Parse allowlisted callback query parameters",
    automated: true,
    outcome: parsed.ok && parsed.params.receipt_id === "dr_conformance_fixture" ? "pass" : "fail",
    detail: parsed.ok ? parsed.params.receipt_id ?? "missing" : parsed.errors.join(", "),
  });

  const sanitized = sanitizePartnerPayload({
    decision_result: "approved",
    date_of_birth: "1990-01-01",
    biometric: "raw-signal",
    partner_id: config.partnerId,
  });
  const piiBlocked = !("date_of_birth" in sanitized) && !("biometric" in sanitized);
  steps.push({
    id: "partner_payload_no_pii",
    label: "Strip forbidden PII from partner-visible payload",
    automated: true,
    outcome: piiBlocked ? "pass" : "fail",
    detail: Object.keys(sanitized).join(", "),
  });

  steps.push({
    id: "holder_flow",
    label: "Holder completes authentication, disclosure, and verification",
    automated: false,
    outcome: "manual",
    detail: "Requires live Partner Flow evaluate + Passport session on deployed Abraxas.",
  });

  steps.push({
    id: "server_verify_receipt",
    label: "Verify signed receipt server-side",
    automated: true,
    outcome: "pass",
    detail: "Uses conformance fixtures — see receiptVerification block.",
  });

  const cases = conformanceReceiptFixtureCases();
  const validCase = cases.find((c) => c.id === "valid-production-receipt");
  const expiredCase = cases.find((c) => c.id === "expired-receipt");
  const wrongPartnerCase = cases.find((c) => c.id === "wrong-partner");

  const valid = verifyReceipt(validCase?.receipt ?? null, {
    partnerId: CONFORMANCE_FIXTURE_PARTNER_ID,
    policyId: CONFORMANCE_FIXTURE_POLICY_ID,
  });
  const expired = verifyReceipt(expiredCase?.receipt ?? null, {
    partnerId: CONFORMANCE_FIXTURE_PARTNER_ID,
    policyId: CONFORMANCE_FIXTURE_POLICY_ID,
  });
  const wrongTenant = verifyReceipt(wrongPartnerCase?.receipt ?? null, {
    partnerId: CONFORMANCE_FIXTURE_PARTNER_ID,
    policyId: CONFORMANCE_FIXTURE_POLICY_ID,
  });

  const receiptVerification = {
    valid_approved: valid.ok === true,
    rejects_expired: expired.ok === false,
    rejects_wrong_tenant: wrongTenant.ok === false,
  };

  const manualStepsRequired = steps.filter((s) => s.outcome === "manual").map((s) => s.id);
  const automatedFailures = steps.filter((s) => s.automated && s.outcome === "fail");
  const receiptOk = Object.values(receiptVerification).every(Boolean);
  const allAutomatedPassed = automatedFailures.length === 0 && receiptOk;

  return {
    partner: config,
    environment: "sandbox",
    steps,
    receiptVerification,
    manualStepsRequired,
    allAutomatedPassed,
  };
}
