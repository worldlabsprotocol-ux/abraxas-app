import {
  ORGANIZATION_ELIGIBILITY_VERSION,
  ORGANIZATION_PUBLIC_RESULT_FIELDS,
  type OrganizationPublicResult,
} from "./contract";
import { organizationPolicyContract } from "./policies";
import { organizationLeaks } from "./safety";
import type { OrganizationEligibilityRecord, OrganizationPublicView } from "./types";

export function publicOrganizationResult(record: OrganizationEligibilityRecord): OrganizationPublicResult {
  if (record.status === "revoked" || record.status === "withdrawn") return "revoked";
  if (record.status === "expired" || new Date(record.expires_at).getTime() <= Date.now()) return "expired";
  if (record.currently_valid && record.consent_bound) return "approved";
  return "denied";
}

export function projectOrganizationPublicView(record: OrganizationEligibilityRecord): OrganizationPublicView {
  const policy = organizationPolicyContract(record.result_category);
  const view: OrganizationPublicView = {
    schema_version: ORGANIZATION_ELIGIBILITY_VERSION,
    organization_ref: record.organization_ref,
    actor_ref: record.actor_ref,
    result_category: record.result_category,
    result: publicOrganizationResult(record),
    currently_valid: record.currently_valid && record.consent_bound && record.status === "issued",
    policy_id: record.policy_id,
    policy_version: record.policy_version,
    action: record.action,
    action_scope: record.action_scope,
    environment: record.environment,
    audience_hash: record.audience_hash,
    issued_at: record.issued_at,
    expires_at: record.expires_at,
    subject_binding_hash: record.subject_binding_hash,
    selective_disclosure_summary: policy?.selective_disclosure ?? "result_only",
    live: false,
    utila_integration: false,
  };
  for (const key of Object.keys(view)) {
    if (!(ORGANIZATION_PUBLIC_RESULT_FIELDS as readonly string[]).includes(key) && key !== "live" && key !== "utila_integration") {
      delete (view as Record<string, unknown>)[key];
    }
  }
  if (organizationLeaks(view).length) {
    throw Object.assign(new Error("redacted"), { code: "redacted" });
  }
  return view;
}
