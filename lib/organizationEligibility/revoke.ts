import { revokePresentationsForOrganization } from "@/lib/eligibilityPresentation/store";
import { partnerHmac as presentationPartnerHmac } from "@/lib/eligibilityPresentation/opaque";
import { loadOrganizationEligibility, listOrganizationEligibilityMatching, saveOrganizationEligibility } from "./store";
import { organizationPartnerHmac } from "./opaque";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
  isSandboxInstitutionalProtocolAccessPolicyId,
  sandboxInstitutionalProtocolAccessProductionDenied,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import { isOperatorSandboxTestResult } from "@/lib/partner/sandboxInstitutionalOperatorResult/audit";
import { isOrganizationResultCategory } from "./contract";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export async function revokeOrganizationEligibility(input: {
  partnerId: string;
  organization_ref: string;
  withdraw?: boolean;
}): Promise<void> {
  const record = await loadOrganizationEligibility(input.organization_ref);
  if (!record) fail("not_found");
  if (record.partner_hmac !== organizationPartnerHmac(input.partnerId)) fail("cross_partner");
  const now = new Date().toISOString();
  const next = {
    ...record,
    status: input.withdraw ? "withdrawn" as const : "revoked" as const,
    currently_valid: false,
    revoked_at: input.withdraw ? record.revoked_at : now,
    withdrawn_at: input.withdraw ? now : record.withdrawn_at,
  };
  await saveOrganizationEligibility(next);
  await revokePresentationsForOrganization({
    partnerHmac: presentationPartnerHmac(input.partnerId),
    result_category: record.result_category,
    policy_id: isOperatorSandboxTestResult(record)
      ? SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID
      : record.policy_id,
    presentation_ref: record.presentation_ref,
  });
}

export async function requireLiveOrganizationEligibility(input: {
  partnerId?: string;
  partnerHmac?: string;
  result_category: string;
  policy_id: string;
  policy_version: number;
  action: string;
  environment: "sandbox" | "production";
  actor_ref?: string;
  subject_binding_hash?: string | null;
}): Promise<void> {
  if (sandboxInstitutionalProtocolAccessProductionDenied(input.environment, input.policy_id)) {
    fail("environment_mismatch");
  }
  const reviewed = isSandboxInstitutionalProtocolAccessPolicyId(input.policy_id);
  if (reviewed && input.action !== SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION) fail("action_mismatch");
  const matches = await listOrganizationEligibilityMatching({
    partner_hmac: input.partnerHmac ?? organizationPartnerHmac(input.partnerId ?? ""),
    result_category: reviewed ? SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT : input.result_category,
    policy_id: reviewed ? SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT : input.policy_id,
    policy_version: reviewed ? 1 : input.policy_version,
    action: input.action,
    environment: input.environment,
    actor_ref: input.actor_ref,
  });
  const live = matches.find((row) => row.currently_valid && row.consent_bound && row.status === "issued");
  if (!live) fail(matches.some((row) => row.status === "revoked" || row.status === "withdrawn") ? "organization_revoked" : "consent_required");
  if (reviewed && !isOperatorSandboxTestResult(live)) fail("operator_result_required");
  if (!isOrganizationResultCategory(String(live.result_category ?? ""))) fail("unknown_policy");
  if (live.environment !== input.environment) fail("environment_mismatch");
  if (reviewed && (!input.subject_binding_hash || live.subject_binding_hash !== input.subject_binding_hash)) {
    fail("consent_required");
  }
  if (input.subject_binding_hash && live.subject_binding_hash && live.subject_binding_hash !== input.subject_binding_hash) {
    fail("wallet_binding_mismatch");
  }
}

export async function requireOrganizationBindingForAttestation(input: {
  partnerId: string;
  organization_binding_hash: string;
  wallet_binding_hash?: string | null;
}): Promise<void> {
  const { findOrganizationBySubjectBinding } = await import("./store");
  const record = await findOrganizationBySubjectBinding({
    partner_hmac: organizationPartnerHmac(input.partnerId),
    subject_binding_hash: input.organization_binding_hash,
  });
  if (!record) fail("organization_revoked");
  if (!record.currently_valid || record.status !== "issued" || !record.consent_bound) fail("organization_revoked");
  if (record.subject_binding_hash && input.wallet_binding_hash && record.subject_binding_hash !== input.wallet_binding_hash) {
    fail("wallet_binding_mismatch");
  }
}
