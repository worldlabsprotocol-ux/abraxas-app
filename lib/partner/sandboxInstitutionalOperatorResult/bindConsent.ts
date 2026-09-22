import {
  consumeOrganizationConsent,
  createOrganizationConsent,
  organizationPartnerHmac,
} from "@/lib/organizationEligibility";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { receiptEnvironment, receiptHasFreshConsent } from "@/lib/eligibilityPresentation/sourceReceipt";
import { listOrganizationEligibilityMatching, saveOrganizationEligibility } from "@/lib/organizationEligibility/store";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
  isSandboxInstitutionalProtocolAccessPolicyId,
  sandboxInstitutionalProtocolAccessProductionDenied,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import { isOperatorSandboxTestResult } from "./audit";
import { operatorSandboxHolderBinding } from "./holderBinding";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export async function bindFreshConsentToOperatorSandboxResult(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  action: string;
  actionScope: string;
  environment: "sandbox" | "production";
  receipt: DecisionReceiptRecord;
}): Promise<void> {
  if (!isSandboxInstitutionalProtocolAccessPolicyId(input.policyId)) return;
  if (sandboxInstitutionalProtocolAccessProductionDenied(input.environment, input.policyId)) {
    fail("environment_mismatch");
  }
  if (input.action !== SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION) fail("action_mismatch");
  if (input.actionScope !== SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE) fail("action_mismatch");
  if (input.policyVersion !== 1) fail("policy_mismatch");
  if (input.receipt.partner_id !== input.partnerId) fail("cross_partner");
  if (input.receipt.policy_id !== input.policyId || input.receipt.policy_version !== input.policyVersion) fail("policy_mismatch");
  if (receiptEnvironment(input.receipt) !== input.environment) fail("environment_mismatch");
  if (!receiptHasFreshConsent(input.receipt)) fail("consent_required");
  if (input.receipt.status !== "active" || input.receipt.decision_result !== "approved" || input.receipt.revoked_at) {
    fail("receipt_invalid");
  }
  const holderBinding = operatorSandboxHolderBinding(input.partnerId, input.receipt.subject_pseudonym_id);

  const matches = await listOrganizationEligibilityMatching({
    partner_hmac: organizationPartnerHmac(input.partnerId),
    result_category: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
    policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
    policy_version: 1,
    action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
    environment: "sandbox",
  });
  const live = matches.find((row) =>
    row.status === "issued"
    && isOperatorSandboxTestResult(row)
    && new Date(row.expires_at).getTime() > Date.now(),
  );
  if (!live) {
    if (matches.some((row) => isOperatorSandboxTestResult(row) && (row.status === "expired" || new Date(row.expires_at).getTime() <= Date.now()))) {
      fail("expired");
    }
    fail("consent_required");
  }
  if (live.consent_bound) {
    if (live.subject_binding_hash !== holderBinding) fail("consent_required");
    return;
  }

  const consent = createOrganizationConsent({
    partnerHmac: live.partner_hmac,
    result_category: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
    purpose: live.purpose,
    action: live.action,
    action_scope: live.action_scope,
    environment: "sandbox",
  });
  const consumed = consumeOrganizationConsent({
    consent_ref: consent.consent_ref,
    partnerHmac: live.partner_hmac,
  });
  if (!consumed) fail("consent_required");
  await saveOrganizationEligibility({
    ...live,
    consent_bound: true,
    currently_valid: true,
    subject_binding_hash: holderBinding,
  });
}
