// FILE: app/api/auth/native/partner-membership-recovery-preview/route.ts
// Read-only entitlement preview for signed-in native accounts (no attestation minted).

import { NextRequest, NextResponse } from "next/server";
import { requireAccountSession } from "@/lib/auth/accountSession";
import { assertNativeAuthEnabled, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { assertPartnerMembershipInvitationEnvironment } from "@/lib/auth/nativeAccount/partnerMembershipInvitationEnvironment";
import { resolveRecoveryOwnershipEntitlement } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryOwnership";
import { assertPartnerMembership } from "@/lib/auth/nativeAccount/store";
import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const accountAuth = await requireAccountSession(req);
  if (!accountAuth.ok) {
    return NextResponse.json({ error: "native_account_session_required" }, { status: 401 });
  }

  const applicationId = req.nextUrl.searchParams.get("application_id")?.trim() ?? "";
  const partnerId = req.nextUrl.searchParams.get("partner_id")?.trim() ?? "";
  if (!applicationId || !partnerId) {
    return NextResponse.json({ error: "application_id_and_partner_id_required" }, { status: 400 });
  }

  try {
    const app = await getLaunchpadApplicationById(applicationId);
    if (!app || String(app.partner_id) !== partnerId) {
      return NextResponse.json({ error: "application_not_found" }, { status: 404 });
    }

    const envGate = assertPartnerMembershipInvitationEnvironment(app);
    if (!envGate.ok) {
      return NextResponse.json({ error: envGate.code }, { status: 403 });
    }

    const existing = await assertPartnerMembership(accountAuth.session.accountId, partnerId);
    if (existing.ok) {
      return NextResponse.json({
        ok: true,
        account_id: accountAuth.session.accountId,
        partner_id: partnerId,
        application_id: applicationId,
        membership_status: "already_linked",
        entitlement: { kind: "existing_membership" },
      });
    }

    const entitlement = await resolveRecoveryOwnershipEntitlement({
      accountId: accountAuth.session.accountId,
      partnerId,
      applicationId,
    });

    if (entitlement.kind === "application_not_found") {
      return NextResponse.json({ error: "application_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      account_id: accountAuth.session.accountId,
      partner_id: partnerId,
      application_id: applicationId,
      membership_status: "not_linked",
      entitlement,
    });
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
