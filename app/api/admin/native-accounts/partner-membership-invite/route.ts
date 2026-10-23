// FILE: app/api/admin/native-accounts/partner-membership-invite/route.ts
// Platform operator: link a native account to an existing sandbox partner (invitation grant).

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { grantPartnerMembershipByInvitation } from "@/lib/auth/nativeAccount/partnerMembershipInvitationGrant";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if ("account_ownership_verified" in body) {
    return NextResponse.json({ error: "account_ownership_verified_not_accepted" }, { status: 400 });
  }

  const accountId = String(body.account_id ?? "").trim();
  const partnerId = String(body.partner_id ?? "").trim();
  const applicationId = String(body.application_id ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  const recoveryAttestationToken = String(body.recovery_attestation ?? body.recovery_attestation_token ?? "").trim();
  const adminOwnershipApprovalToken = String(
    body.admin_ownership_approval ?? body.admin_ownership_approval_token ?? "",
  ).trim();

  const approverActorId = await resolveDesignPartnerAdminActorCategory(req);

  const result = await grantPartnerMembershipByInvitation({
    accountId,
    partnerId,
    applicationId,
    reason,
    approverActorId,
    recoveryAttestationToken,
    adminOwnershipApprovalToken: adminOwnershipApprovalToken || undefined,
  });

  if (!result.ok) {
    const status =
      result.code === "application_not_found"
      || result.code === "application_partner_mismatch"
      || result.code === "account_not_found"
        ? 404
        : result.code === "production_origin_forbidden" || result.code === "application_not_sandbox"
          ? 403
          : result.code === "recovery_attestation_already_consumed_or_expired"
            || result.code === "application_entitlement_conflict"
            || result.code === "admin_ownership_approval_already_consumed_or_expired"
            ? 409
            : result.code === "admin_ownership_approval_required"
              ? 403
              : 400;
    return NextResponse.json({ error: result.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    partner_id: result.partnerId,
    application_id: result.applicationId,
    account_id: result.accountId,
    role: result.role,
    already_member: result.alreadyMember,
    grant_method: "invitation",
    audit_event_id: result.auditEventId,
  });
}
