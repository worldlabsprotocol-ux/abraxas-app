// FILE: app/api/admin/native-accounts/partner-membership-recovery-ownership-approval/route.ts
// Platform operator documents independent ownership review before invitation grant.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { verifyPartnerMembershipRecoveryAttestationToken } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAttestation";
import { issueAdminRecoveryOwnershipApproval } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAdminApproval";
import { assertPartnerMembershipInvitationEnvironment } from "@/lib/auth/nativeAccount/partnerMembershipInvitationEnvironment";
import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const recoveryAttestation = String(body.recovery_attestation ?? body.recovery_attestation_token ?? "").trim();
  const reason = String(body.ownership_review_reason ?? body.reason ?? "").trim();
  if (!recoveryAttestation) {
    return NextResponse.json({ error: "recovery_attestation_required" }, { status: 400 });
  }

  const verified = await verifyPartnerMembershipRecoveryAttestationToken(recoveryAttestation);
  if (!verified) {
    return NextResponse.json({ error: "recovery_attestation_invalid" }, { status: 400 });
  }

  const app = await getLaunchpadApplicationById(verified.applicationId);
  if (!app || String(app.partner_id) !== verified.partnerId) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }
  const envGate = assertPartnerMembershipInvitationEnvironment(app);
  if (!envGate.ok) {
    return NextResponse.json({ error: envGate.code }, { status: 403 });
  }

  const approverActorId = await resolveDesignPartnerAdminActorCategory(req);
  const issued = await issueAdminRecoveryOwnershipApproval({
    verifiedAttestation: verified,
    approverActorId,
    reason,
  });

  if (!issued.ok) {
    const status =
      issued.code === "application_entitlement_conflict"
        ? 409
        : issued.code === "application_not_found"
          ? 404
          : 400;
    return NextResponse.json(
      {
        error: issued.code,
        enrolled_account_id: issued.enrolled_account_id ?? undefined,
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    account_id: verified.accountId,
    partner_id: verified.partnerId,
    application_id: verified.applicationId,
    attestation_id: verified.attestationId,
    admin_ownership_approval: issued.adminOwnershipApprovalToken,
    approval_id: issued.approvalId,
    expires_at: issued.expiresAt,
    entitlement: issued.entitlement,
  });
}
