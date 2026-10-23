// FILE: app/api/admin/native-accounts/partner-membership-invite/route.ts
// Platform operator: link a verified native account to an existing partner tenant (invitation grant).

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { logAdminPartnerConfigAudit } from "@/lib/admin/partnerOnboardingAudit";
import { grantPartnerMembershipByInvitation } from "@/lib/auth/nativeAccount/partnerMembershipInvitationGrant";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const accountId = String(body.account_id ?? "").trim();
  const partnerId = String(body.partner_id ?? "").trim();
  const applicationId = String(body.application_id ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  const accountOwnershipVerified = body.account_ownership_verified === true;

  const approverActorId = await resolveDesignPartnerAdminActorCategory(req);

  const result = await grantPartnerMembershipByInvitation({
    accountId,
    partnerId,
    applicationId,
    reason,
    approverActorId,
    accountOwnershipVerified,
  });

  if (!result.ok) {
    const status =
      result.code === "application_not_found" || result.code === "application_partner_mismatch"
        ? 404
        : 400;
    return NextResponse.json({ error: result.code }, { status });
  }

  if (!result.alreadyMember) {
    await logAdminPartnerConfigAudit(req, {
      action: "admin.native_account.partner_membership_invite",
      object_type: "partner",
      object_id: partnerId,
      metadata: {
        account_id: accountId,
        application_id: applicationId,
        role: result.role,
        grant_method: "invitation",
        approver_actor_id: approverActorId,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    partner_id: result.partnerId,
    application_id: result.applicationId,
    account_id: result.accountId,
    role: result.role,
    already_member: result.alreadyMember,
    grant_method: "invitation",
  });
}
