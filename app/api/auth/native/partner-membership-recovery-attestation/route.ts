// FILE: app/api/auth/native/partner-membership-recovery-attestation/route.ts
// Founder-authenticated: mint a single-use server attestation for admin membership recovery.

import { NextRequest, NextResponse } from "next/server";
import { requireAccountSession } from "@/lib/auth/accountSession";
import { assertNativeAuthEnabled, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { getNativeAccountStatus } from "@/lib/auth/nativeAccount/store";
import { assertPartnerMembershipInvitationEnvironment } from "@/lib/auth/nativeAccount/partnerMembershipInvitationEnvironment";
import { issuePartnerMembershipRecoveryAttestation } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAttestation";
import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const accountAuth = await requireAccountSession(req);
  if (!accountAuth.ok) {
    return NextResponse.json({ error: "native_account_session_required" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const applicationId = String(body.application_id ?? "").trim();
  const partnerId = String(body.partner_id ?? "").trim();
  if (!applicationId || !partnerId) {
    return NextResponse.json({ error: "application_id_and_partner_id_required" }, { status: 400 });
  }

  try {
    const status = await getNativeAccountStatus(accountAuth.session.accountId);
    if (status !== "active") {
      return NextResponse.json({ error: "account_not_active" }, { status: 403 });
    }

    const app = await getLaunchpadApplicationById(applicationId);
    if (!app || String(app.partner_id) !== partnerId) {
      return NextResponse.json({ error: "application_not_found" }, { status: 404 });
    }

    const envGate = assertPartnerMembershipInvitationEnvironment(app);
    if (!envGate.ok) {
      return NextResponse.json({ error: envGate.code }, { status: 403 });
    }

    const issued = await issuePartnerMembershipRecoveryAttestation({
      accountId: accountAuth.session.accountId,
      partnerId,
      applicationId,
    });

    if (!issued.ok) {
      return NextResponse.json({ error: issued.code }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      account_id: accountAuth.session.accountId,
      partner_id: partnerId,
      application_id: applicationId,
      recovery_attestation: issued.attestationToken,
      attestation_id: issued.attestationId,
      expires_at: issued.expiresAt,
      next_step: "Provide recovery_attestation to a platform administrator for POST /api/admin/native-accounts/partner-membership-invite.",
    });
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
