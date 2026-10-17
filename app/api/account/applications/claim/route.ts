// FILE: app/api/account/applications/claim/route.ts
// Auditable legacy application claim — API key proof only.

import { NextRequest, NextResponse } from "next/server";
import { requireAccountSession } from "@/lib/auth/accountSession";
import { assertNativeAuthEnabled, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { claimLegacyApplicationWithApiKey } from "@/lib/auth/nativeAccount/legacyApplicationClaim";
import { issueOperatorSessionForAccountMembership } from "@/lib/partner/launchpad/operatorSessionFromAccount";
import { attachPartnerConsoleSessionCookie } from "@/lib/partner/launchpad/partnerConsoleSession";
import { enforceLaunchpadRateLimit } from "@/lib/partner/launchpad/apiHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const limited = await enforceLaunchpadRateLimit(req, "/api/account/applications/claim", 10);
  if (limited) return limited;

  const auth = await requireAccountSession(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: "account_session_required" }, { status: 401 });
  }

  let body: { api_key?: string; attach_operator_session?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_json" }, { status: 400 });
  }

  const apiKey = String(body.api_key ?? "").trim();
  if (!apiKey.startsWith("abx_")) {
    return NextResponse.json({ ok: false, code: "api_key_required" }, { status: 400 });
  }

  try {
    const result = await claimLegacyApplicationWithApiKey({
      accountId: auth.session.accountId,
      apiKey,
    });
    if (!result.ok) {
      const status = result.code === "api_key_invalid" ? 401 : 503;
      return NextResponse.json({ ok: false, code: result.code }, { status });
    }

    const res = NextResponse.json({
      ok: true,
      partner_id: result.partnerId,
      role: result.role,
      already_member: result.alreadyMember,
    });

    if (body.attach_operator_session !== false) {
      const token = await issueOperatorSessionForAccountMembership({
        accountId: auth.session.accountId,
        partnerId: result.partnerId,
      });
      if (token) attachPartnerConsoleSessionCookie(res, token);
    }

    return res;
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
