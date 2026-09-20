// FILE: app/api/admin/production-review/[id]/credential/route.ts
// Operator Production credential status and explicit issuance. Never GET a raw key.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import {
  loadProductionCredentialStatus,
  operateProductionCredential,
  productionCredentialClientOverride,
  productionCredentialCsrfRejected,
  PRODUCTION_CREDENTIAL_NOTICE,
} from "@/lib/partner/launchpad/productionCredentials";
import { PRODUCTION_CREDENTIAL_ACTIONS } from "@/lib/partner/launchpad/productionCredentials/contract";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  const result = await loadProductionCredentialStatus(params.id);
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 503;
    return NextResponse.json({ error: result.code, ...omitRaw(result) }, { status });
  }
  return NextResponse.json({
    ...omitRaw(result),
    notice: PRODUCTION_CREDENTIAL_NOTICE,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  const csrf = productionCredentialCsrfRejected(req);
  if (csrf) return NextResponse.json({ error: "production_credential_csrf_required" }, { status: 403 });
  const limited = checkLaunchpadRateLimit(req, "admin:production-credential", 6, 60);
  if (!limited.allowed) {
    return NextResponse.json({ error: "production_credential_rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  }
  const body = await req.json().catch(() => null);
  if (productionCredentialClientOverride(body)) {
    return NextResponse.json({ error: "production_credential_client_override_rejected" }, { status: 400 });
  }
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const action = record.action;
  if (!(PRODUCTION_CREDENTIAL_ACTIONS as readonly string[]).includes(String(action))) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const result = await operateProductionCredential({
    requestId: params.id,
    action: action as (typeof PRODUCTION_CREDENTIAL_ACTIONS)[number],
    confirm: record.confirm === true,
  });
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : result.code === "production_credential_store_unavailable" ? 503 : 400;
    return NextResponse.json(omitRaw(result), { status });
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

function omitRaw(result: { api_key?: string; [key: string]: unknown }) {
  const { api_key: _raw, ...rest } = result;
  return rest;
}
