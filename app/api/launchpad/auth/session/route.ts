// FILE: app/api/launchpad/auth/session/route.ts
// Partner Launchpad console session — HttpOnly cookie, no browser storage for API keys.

import { NextRequest } from "next/server";
import { requireAccountSession } from "@/lib/auth/accountSession";
import { assertNativeAuthEnabled } from "@/lib/auth/nativeAccount/apiGate";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import {
  attachPartnerConsoleSessionCookie,
  clearPartnerConsoleSessionCookie,
  issuePartnerConsoleSessionToken,
  resolvePartnerConsoleSession,
} from "@/lib/partner/launchpad/partnerConsoleSession";
import {
  issueOperatorSessionForAccountMembership,
  resolveOperatorPartnerForAccountMembership,
} from "@/lib/partner/launchpad/operatorSessionFromAccount";
import { launchpadError, launchpadJson, enforceLaunchpadRateLimit } from "@/lib/partner/launchpad/apiHelpers";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";

export const dynamic = "force-dynamic";

function operatorPartnerErrorMessage(
  code: "partner_id_required" | "membership_required" | "application_not_found" | "application_partner_mismatch",
): string {
  switch (code) {
    case "application_not_found":
      return "Launchpad application not found";
    case "application_partner_mismatch":
      return "Application does not belong to the specified partner";
    case "membership_required":
      return "Partner membership required for this application";
    case "partner_id_required":
      return "Specify an application or partner to resume Launchpad";
    default:
      return "Partner authorization required";
  }
}

export async function GET(req: NextRequest) {
  const session = await resolvePartnerConsoleSession(req);
  if (!session) {
    return launchpadJson({ ok: false, authenticated: false });
  }
  const authKind = session.authKind ?? (session.accountId ? "account" : "api_key");
  return launchpadJson({
    ok: true,
    authenticated: true,
    partner_id: session.partnerId,
    environment: session.environment,
    auth_kind: authKind,
  });
}

export async function POST(req: NextRequest) {
  const limited = await enforceLaunchpadRateLimit(req, "/api/launchpad/auth/session", 20);
  if (limited) return limited;

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (bearer.startsWith("abx_")) {
    const auth = await authenticatePartner(req);
    if (!auth) {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.unauthorized, 401, "API key required");
    }
    if (!auth.ok) {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.unauthorized, auth.status, auth.error);
    }

    const token = await issuePartnerConsoleSessionToken({
      partnerId: auth.ctx.partnerId,
      apiKeyId: auth.ctx.apiKeyId,
      environment: auth.ctx.keyPrefix.startsWith("abx_live_") ? "production" : "sandbox",
      authKind: "api_key",
    });

    if (!token) {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 503);
    }

    const res = launchpadJson({
      ok: true,
      partner_id: auth.ctx.partnerId,
      key_prefix: auth.ctx.keyPrefix,
      environment: auth.ctx.keyPrefix.startsWith("abx_live_") ? "production" : "sandbox",
      auth_kind: "api_key",
    });
    attachPartnerConsoleSessionCookie(res, token);
    return res;
  }

  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const accountAuth = await requireAccountSession(req);
  if (!accountAuth.ok) {
    return launchpadError(
      LAUNCHPAD_PUBLIC_ERRORS.unauthorized,
      401,
      "API key or Abraxas account sign-in required",
    );
  }

  let body: { application_id?: string; partner_id?: string; environment?: string } = {};
  try {
    const raw = await req.text();
    if (raw.trim()) {
      body = JSON.parse(raw) as typeof body;
    }
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "Invalid JSON body");
  }

  const resolved = await resolveOperatorPartnerForAccountMembership({
    accountId: accountAuth.session.accountId,
    applicationId: body.application_id,
    partnerId: body.partner_id,
  });

  if (!resolved.ok) {
    const status =
      resolved.code === "application_not_found"
        ? 404
        : resolved.code === "partner_id_required"
          ? 400
          : 403;
    const code =
      resolved.code === "application_not_found"
        ? LAUNCHPAD_PUBLIC_ERRORS.application_not_found
        : resolved.code === "partner_id_required"
          ? LAUNCHPAD_PUBLIC_ERRORS.invalid_input
          : LAUNCHPAD_PUBLIC_ERRORS.forbidden;
    return launchpadError(code, status, operatorPartnerErrorMessage(resolved.code));
  }

  const environment = body.environment === "production" ? "production" : "sandbox";
  const token = await issueOperatorSessionForAccountMembership({
    accountId: accountAuth.session.accountId,
    partnerId: resolved.partnerId,
    environment,
  });

  if (!token) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 503);
  }

  const res = launchpadJson({
    ok: true,
    partner_id: resolved.partnerId,
    environment,
    auth_kind: "account",
    role: resolved.role,
  });
  attachPartnerConsoleSessionCookie(res, token);
  return res;
}

export async function DELETE() {
  const res = launchpadJson({ ok: true });
  clearPartnerConsoleSessionCookie(res);
  return res;
}
