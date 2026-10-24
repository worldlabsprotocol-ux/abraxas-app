// FILE: lib/auth/nativeAccount/partnerMembershipRecoveryOwnership.ts
// Server-side entitlement for recovery — attestation alone is never sufficient.

import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import {
  findSandboxEnrollmentForApplication,
  findSandboxEnrollmentForAccountPartner,
} from "@/lib/auth/nativeAccount/partnerMembershipRecoveryOwnershipStore";

export type RecoveryOwnershipEntitlement =
  | {
      kind: "server_verified_enrollment";
      basis: "sandbox_enrollment_match";
    }
  | {
      kind: "admin_review_required";
      basis: "provisioning_review";
      provisioning: {
        application_name: string | null;
        application_status: string | null;
        provisioned_at: string | null;
      };
    }
  | {
      kind: "entitlement_conflict";
      basis: "application_bound_to_different_account";
      enrolled_account_id: string;
    };

export type RecoveryOwnershipResolution =
  | RecoveryOwnershipEntitlement
  | { kind: "application_not_found" };

export async function resolveRecoveryOwnershipEntitlement(input: {
  accountId: string;
  partnerId: string;
  applicationId: string;
}): Promise<RecoveryOwnershipResolution> {
  const app = await getLaunchpadApplicationById(input.applicationId);
  if (!app || String(app.partner_id) !== input.partnerId) {
    return { kind: "application_not_found" };
  }

  const enrollmentForApp = await findSandboxEnrollmentForApplication(input.applicationId);
  if (enrollmentForApp && enrollmentForApp.account_id !== input.accountId) {
    return {
      kind: "entitlement_conflict",
      basis: "application_bound_to_different_account",
      enrolled_account_id: enrollmentForApp.account_id,
    };
  }

  const enrollmentForAccount = await findSandboxEnrollmentForAccountPartner(
    input.accountId,
    input.partnerId,
  );
  if (
    enrollmentForAccount
    && enrollmentForAccount.application_id
    && enrollmentForAccount.application_id === input.applicationId
  ) {
    return { kind: "server_verified_enrollment", basis: "sandbox_enrollment_match" };
  }

  return {
    kind: "admin_review_required",
    basis: "provisioning_review",
    provisioning: {
      application_name: app.application_name ?? app.display_name ?? null,
      application_status: app.status ?? null,
      provisioned_at: app.created_at ?? null,
    },
  };
}
