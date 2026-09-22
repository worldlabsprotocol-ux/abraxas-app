import {
  consumeOrganizationConsent,
  createOrganizationConsent,
  organizationPartnerHmac,
} from "@/lib/organizationEligibility";
import { listOrganizationEligibilityMatching, saveOrganizationEligibility } from "@/lib/organizationEligibility/store";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
  isSandboxInstitutionalProtocolAccessPolicyId,
  sandboxInstitutionalProtocolAccessProductionDenied,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import { isOperatorSandboxTestResult } from "./audit";

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
}): Promise<void> {
  if (!isSandboxInstitutionalProtocolAccessPolicyId(input.policyId)) return;
  if (sandboxInstitutionalProtocolAccessProductionDenied(input.environment, input.policyId)) {
    fail("environment_mismatch");
  }
  if (input.action !== SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION) fail("action_mismatch");
  if (input.actionScope !== SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE) fail("action_mismatch");
  if (input.policyVersion !== 1) fail("policy_mismatch");

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
  if (live.consent_bound) return;

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
  await saveOrganizationEligibility({ ...live, consent_bound: true, currently_valid: true });
}
