import {
  mapReviewedOrganizationIssuer,
  organizationAudienceHash,
  organizationPartnerHmac,
} from "@/lib/organizationEligibility";
import {
  findOrganizationByDerivation,
  listOrganizationEligibilityMatching,
  loadOrganizationEligibility,
  saveOrganizationEligibility,
} from "@/lib/organizationEligibility/store";
import { revokeOrganizationEligibility } from "@/lib/organizationEligibility/revoke";
import {
  newOrganizationSeed,
  opaqueActorRef,
  opaqueOrganizationRef,
  organizationDerivationHash,
} from "@/lib/organizationEligibility/opaque";
import type { OrganizationEligibilityRecord } from "@/lib/organizationEligibility/types";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ISSUER,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import { assertPinnedSandboxInstitutionalApp, loadOperatorLaunchpadApplication } from "./apps";
import {
  recordOperatorSandboxInstitutionalAudit,
  isOperatorSandboxTestResult,
} from "./audit";
import {
  SANDBOX_INSTITUTIONAL_OPERATOR_ACTION_CLASS,
  SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL,
  SANDBOX_INSTITUTIONAL_OPERATOR_TTL_MS,
} from "./contract";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

function opaqueApplicationRef(applicationId: string): string {
  return organizationDerivationHash(["application", applicationId]).slice(0, 32);
}

export async function issueOperatorSandboxInstitutionalResult(input: {
  applicationId: string;
  confirm: boolean;
  now?: number;
}): Promise<OrganizationEligibilityRecord> {
  if (input.confirm !== true) fail("confirmation_required");
  const app = await loadOperatorLaunchpadApplication(input.applicationId);
  if (!app) fail("not_found");
  assertPinnedSandboxInstitutionalApp(app);

  const mapped = mapReviewedOrganizationIssuer({
    issuer_key: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ISSUER,
    result_category: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
    now: input.now,
  });
  if (!mapped.ok) fail(mapped.reason);

  const partner_hmac = organizationPartnerHmac(app.partner_id);
  const existing = await listOrganizationEligibilityMatching({
    partner_hmac,
    result_category: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
    policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
    policy_version: 1,
    action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
    environment: "sandbox",
  });
  if (existing.some((row) => row.status === "issued" && isOperatorSandboxTestResult(row) && new Date(row.expires_at).getTime() > Date.now())) {
    fail("replayed");
  }

  const now = input.now ?? Date.now();
  const organization_ref = opaqueOrganizationRef(newOrganizationSeed());
  const actor_ref = opaqueActorRef(newOrganizationSeed());
  const derivation_hash = organizationDerivationHash([
    SANDBOX_INSTITUTIONAL_OPERATOR_ACTION_CLASS,
    partner_hmac,
    app.id,
    SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    String(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION),
    SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
    "sandbox",
    organization_ref,
  ]);
  if (await findOrganizationByDerivation(derivation_hash)) fail("replayed");

  const record: OrganizationEligibilityRecord = {
    organization_ref,
    actor_ref,
    partner_hmac,
    audience_hash: organizationAudienceHash(app.partner_id),
    issuer_ref: mapped.issuer_ref,
    method_category: mapped.method_category,
    assurance_level: mapped.assurance_level,
    result_category: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
    policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
    policy_version: 1,
    purpose: SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL,
    action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
    action_scope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
    environment: "sandbox",
    status: "issued",
    consent_bound: false,
    currently_valid: true,
    issued_at: new Date(now).toISOString(),
    expires_at: new Date(now + SANDBOX_INSTITUTIONAL_OPERATOR_TTL_MS).toISOString(),
    revoked_at: null,
    withdrawn_at: null,
    derivation_hash,
    presentation_ref: null,
    subject_binding_hash: null,
  };
  await saveOrganizationEligibility(record);
  recordOperatorSandboxInstitutionalAudit({
    organization_ref: record.organization_ref,
    operator_action_class: SANDBOX_INSTITUTIONAL_OPERATOR_ACTION_CLASS,
    result_label: SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL,
    policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    policy_version: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
    environment: "sandbox",
    expires_at: record.expires_at,
    lifecycle_state: record.status,
    application_ref: opaqueApplicationRef(app.id),
    live_kyb: false,
  });
  return record;
}

export async function revokeOperatorSandboxInstitutionalResult(input: {
  organizationRef: string;
  confirm: boolean;
  applicationId: string;
}): Promise<void> {
  if (input.confirm !== true) fail("confirmation_required");
  const app = await loadOperatorLaunchpadApplication(input.applicationId);
  if (!app) fail("not_found");
  const record = await loadOrganizationEligibility(input.organizationRef);
  if (!record || !isOperatorSandboxTestResult(record)) fail("not_found");
  if (record.partner_hmac !== organizationPartnerHmac(app.partner_id)) fail("cross_partner");
  await revokeOrganizationEligibility({ partnerId: app.partner_id, organization_ref: record.organization_ref });
  recordOperatorSandboxInstitutionalAudit({
    organization_ref: record.organization_ref,
    operator_action_class: SANDBOX_INSTITUTIONAL_OPERATOR_ACTION_CLASS,
    result_label: SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL,
    policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    policy_version: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
    environment: "sandbox",
    expires_at: record.expires_at,
    lifecycle_state: "revoked",
    application_ref: opaqueApplicationRef(app.id),
    live_kyb: false,
  });
}
