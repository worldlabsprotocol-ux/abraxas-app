// FILE: lib/auth/nativeAccount/partnerMembershipRecoveryOwnershipEvidence.ts
// Server-verified ownership evidence — admin reason text is not proof.

import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { findLaunchpadProvisioningEvidence } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryOwnershipEvidenceStore";

export type OwnershipEvidenceType =
  | "launchpad_application_provisioning"
  | "launchpad_provisioning_activity";

export type ValidatedOwnershipEvidence = {
  evidence_type: OwnershipEvidenceType;
  evidence_ref: string;
  application_id: string;
  partner_id: string;
  provisioned_at: string | null;
  activity_event_type: string | null;
  activity_public_code: string | null;
};

export type ValidateOwnershipEvidenceResult =
  | { ok: true; evidence: ValidatedOwnershipEvidence }
  | { ok: false; code: string };

export async function validateRecoveryOwnershipEvidence(input: {
  partnerId: string;
  applicationId: string;
  evidenceRef: string;
}): Promise<ValidateOwnershipEvidenceResult> {
  const partnerId = input.partnerId.trim();
  const applicationId = input.applicationId.trim();
  const evidenceRef = input.evidenceRef.trim();

  if (!partnerId || !applicationId) {
    return { ok: false, code: "partner_and_application_required" };
  }
  if (!evidenceRef) {
    return { ok: false, code: "ownership_evidence_ref_required" };
  }

  const app = await getLaunchpadApplicationById(applicationId);
  if (!app || String(app.partner_id) !== partnerId) {
    return { ok: false, code: "application_not_found" };
  }

  if (evidenceRef === applicationId) {
    const provisioning = await findLaunchpadProvisioningEvidence(applicationId, partnerId);
    if (!provisioning) {
      return { ok: false, code: "ownership_evidence_provisioning_not_found" };
    }
    return {
      ok: true,
      evidence: {
        evidence_type: "launchpad_application_provisioning",
        evidence_ref: applicationId,
        application_id: applicationId,
        partner_id: partnerId,
        provisioned_at: provisioning.provisioned_at,
        activity_event_type: provisioning.event_type,
        activity_public_code: provisioning.public_code,
      },
    };
  }

  const byActivityId = await findLaunchpadProvisioningEvidence(applicationId, partnerId, evidenceRef);
  if (!byActivityId || byActivityId.activity_id !== evidenceRef) {
    return { ok: false, code: "ownership_evidence_activity_not_found" };
  }

  return {
    ok: true,
    evidence: {
      evidence_type: "launchpad_provisioning_activity",
      evidence_ref: evidenceRef,
      application_id: applicationId,
      partner_id: partnerId,
      provisioned_at: byActivityId.provisioned_at,
      activity_event_type: byActivityId.event_type,
      activity_public_code: byActivityId.public_code,
    },
  };
}
