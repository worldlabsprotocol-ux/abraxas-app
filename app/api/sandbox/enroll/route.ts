// FILE: app/api/sandbox/enroll/route.ts
// Level-1 account + tenant-scoped sandbox provisioning (no Google / wallet / IDV).

import { NextRequest, NextResponse } from "next/server";
import { requireAccountSession } from "@/lib/auth/accountSession";
import { assertNativeAuthEnabled, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";
import { enrollSandboxForAccount } from "@/lib/auth/nativeAccount/sandboxEnroll";
import { attachPartnerConsoleSessionCookie } from "@/lib/partner/launchpad/partnerConsoleSession";
import { enforceLaunchpadRateLimit } from "@/lib/partner/launchpad/apiHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const limited = await enforceLaunchpadRateLimit(req, "/api/sandbox/enroll", 5);
  if (limited) return limited;

  const auth = await requireAccountSession(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: "account_session_required" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const result = await enrollSandboxForAccount({
      accountId: auth.session.accountId,
      applicationName: body.application_name ? String(body.application_name) : undefined,
      policyTemplateId: body.policy_template_id ? String(body.policy_template_id) : undefined,
      idempotencyKey: body.idempotency_key ? String(body.idempotency_key) : undefined,
    });

    if (!result.ok) {
      const status = result.code === "native_account_store_unavailable" ? 503 : 400;
      return NextResponse.json({ ok: false, code: result.code }, { status });
    }

    const res = NextResponse.json({
      ok: true,
      partner_id: result.partnerId,
      application: result.application,
      api_key_shown_once: result.apiKeyShownOnce ?? null,
      trust_level: 2,
    });

    if (result.operatorSessionToken) {
      attachPartnerConsoleSessionCookie(res, result.operatorSessionToken);
    }
    return res;
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
