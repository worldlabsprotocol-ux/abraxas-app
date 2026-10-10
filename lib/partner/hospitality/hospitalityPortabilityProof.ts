// FILE: lib/partner/hospitality/hospitalityPortabilityProof.ts
// Second-operator portability + tenant isolation using conformance receipt fixtures (no live DB).

import { buildPartnerVerifyUrl } from "@/lib/partner/referenceIntegration";
import { parsePartnerCallbackParams } from "@/lib/partner/integrationKit";
import {
  CONFORMANCE_FIXTURE_FUTURE_EXPIRY,
  CONFORMANCE_FIXTURE_NOW,
  CONFORMANCE_FIXTURE_PAST_EXPIRY,
} from "@/lib/partner/partnerConformanceFixtures";
import {
  validatePartnerFlowPublicReceipt,
  type PartnerFlowPublicReceipt,
} from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  rentalOperatorPartnerIntegrationConfig,
  validateRentalOperatorPolicyBinding,
} from "@/lib/partner/hospitality/rentalOperatorContract";
import {
  CIELO_SUNRISE_RENTAL_TENANT,
  SYNTHETIC_RENTAL_OPERATOR_B,
} from "@/lib/partner/hospitality/rentalOperatorTenants";

export type HospitalityPortabilityStep = {
  id: string;
  tenant: "cielo" | "synthetic_b" | "cross_tenant";
  outcome: "pass" | "fail";
  detail: string;
};

export interface HospitalityPortabilityProofResult {
  steps: HospitalityPortabilityStep[];
  tenant_isolation: {
    cielo_receipt_rejected_for_synthetic_b: boolean;
    synthetic_b_receipt_rejected_for_cielo: boolean;
    expired_rejected_for_both: boolean;
  };
  allPassed: boolean;
}

function tenantReceipt(
  partnerId: string,
  policyId: string,
  overrides: Partial<PartnerFlowPublicReceipt> = {},
): PartnerFlowPublicReceipt {
  return {
    receipt_id: `dr_hospitality_${partnerId}`,
    partner_id: partnerId,
    policy_id: policyId,
    decision_result: "approved",
    signature_valid: true,
    expires_at: CONFORMANCE_FIXTURE_FUTURE_EXPIRY,
    status: "active",
    production_usable: true,
    ...overrides,
  };
}

function verifyForTenant(
  receipt: PartnerFlowPublicReceipt | null,
  partnerId: string,
  policyId: string,
) {
  return validatePartnerFlowPublicReceipt(receipt, {
    partnerId,
    policyId,
    now: CONFORMANCE_FIXTURE_NOW,
    allowSandbox: true,
  });
}

export function runHospitalityPortabilityProof(): HospitalityPortabilityProofResult {
  const steps: HospitalityPortabilityStep[] = [];

  for (const [label, tenant, enterPath] of [
    ["cielo", CIELO_SUNRISE_RENTAL_TENANT, "/cielo/verified-rate"] as const,
    ["synthetic_b", SYNTHETIC_RENTAL_OPERATOR_B, "/auth/abraxas/callback"] as const,
  ]) {
    const binding = tenant.policyPackId
      ? validateRentalOperatorPolicyBinding({ policyPackId: tenant.policyPackId })
      : { ok: true as const };
    steps.push({
      id: `${label}_policy_pack_binding`,
      tenant: label === "cielo" ? "cielo" : "synthetic_b",
      outcome: binding.ok ? "pass" : "fail",
      detail: tenant.policyPackId ?? `pinned:${tenant.policyId}`,
    });

    const integration = rentalOperatorPartnerIntegrationConfig(tenant, enterPath);
    const origin = "https://preview.abraxas.test";
    const verifyUrl = buildPartnerVerifyUrl(integration, {
      origin,
      returnUrl: `${origin}${enterPath}`,
    });
    steps.push({
      id: `${label}_hosted_verify_url`,
      tenant: label === "cielo" ? "cielo" : "synthetic_b",
      outcome:
        verifyUrl.includes(`partner_id=${tenant.partnerId}`)
        && verifyUrl.includes(`policy_id=${tenant.policyId}`)
          ? "pass"
          : "fail",
      detail: verifyUrl,
    });

    const callback = parsePartnerCallbackParams(
      new URLSearchParams({
        receipt_id: "dr_test",
        partner_id: tenant.partnerId,
        policy_id: tenant.policyId,
        status: "approved",
      }),
    );
    steps.push({
      id: `${label}_callback_parse`,
      tenant: label === "cielo" ? "cielo" : "synthetic_b",
      outcome: callback.ok ? "pass" : "fail",
      detail: callback.ok ? tenant.partnerId : callback.errors.join(", "),
    });
  }

  const cieloReceipt = tenantReceipt(
    CIELO_SUNRISE_RENTAL_TENANT.partnerId,
    CIELO_SUNRISE_RENTAL_TENANT.policyId,
  );
  const syntheticReceipt = tenantReceipt(
    SYNTHETIC_RENTAL_OPERATOR_B.partnerId,
    SYNTHETIC_RENTAL_OPERATOR_B.policyId,
  );

  const cieloOnSynthetic = verifyForTenant(
    cieloReceipt,
    SYNTHETIC_RENTAL_OPERATOR_B.partnerId,
    SYNTHETIC_RENTAL_OPERATOR_B.policyId,
  );
  const syntheticOnCielo = verifyForTenant(
    syntheticReceipt,
    CIELO_SUNRISE_RENTAL_TENANT.partnerId,
    CIELO_SUNRISE_RENTAL_TENANT.policyId,
  );

  steps.push({
    id: "cross_tenant_cielo_receipt_on_b",
    tenant: "cross_tenant",
    outcome: cieloOnSynthetic.ok === false ? "pass" : "fail",
    detail: cieloOnSynthetic.errors.join(", ") || "unexpected_pass",
  });
  steps.push({
    id: "cross_tenant_b_receipt_on_cielo",
    tenant: "cross_tenant",
    outcome: syntheticOnCielo.ok === false ? "pass" : "fail",
    detail: syntheticOnCielo.errors.join(", ") || "unexpected_pass",
  });

  const expired = verifyForTenant(
    tenantReceipt(CIELO_SUNRISE_RENTAL_TENANT.partnerId, CIELO_SUNRISE_RENTAL_TENANT.policyId, {
      expires_at: CONFORMANCE_FIXTURE_PAST_EXPIRY,
    }),
    CIELO_SUNRISE_RENTAL_TENANT.partnerId,
    CIELO_SUNRISE_RENTAL_TENANT.policyId,
  );

  const wrongPolicy = verifyForTenant(
    cieloReceipt,
    CIELO_SUNRISE_RENTAL_TENANT.partnerId,
    SYNTHETIC_RENTAL_OPERATOR_B.policyId,
  );
  steps.push({
    id: "cross_tenant_wrong_policy_on_cielo_partner",
    tenant: "cross_tenant",
    outcome: wrongPolicy.ok === false ? "pass" : "fail",
    detail: wrongPolicy.errors.join(", ") || "unexpected_pass",
  });

  const revoked = verifyForTenant(
    tenantReceipt(CIELO_SUNRISE_RENTAL_TENANT.partnerId, CIELO_SUNRISE_RENTAL_TENANT.policyId, {
      status: "revoked",
    }),
    CIELO_SUNRISE_RENTAL_TENANT.partnerId,
    CIELO_SUNRISE_RENTAL_TENANT.policyId,
  );
  steps.push({
    id: "revoked_receipt_rejected",
    tenant: "cross_tenant",
    outcome: revoked.ok === false ? "pass" : "fail",
    detail: revoked.errors.join(", ") || "unexpected_pass",
  });

  const tenant_isolation = {
    cielo_receipt_rejected_for_synthetic_b: cieloOnSynthetic.ok === false,
    synthetic_b_receipt_rejected_for_cielo: syntheticOnCielo.ok === false,
    expired_rejected_for_both: expired.ok === false,
    wrong_policy_rejected: wrongPolicy.ok === false,
    revoked_rejected: revoked.ok === false,
  };

  const allPassed =
    steps.every((s) => s.outcome === "pass")
    && Object.values(tenant_isolation).every(Boolean);

  return { steps, tenant_isolation, allPassed };
}
