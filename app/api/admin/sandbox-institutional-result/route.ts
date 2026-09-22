import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import { organizationLeaks, organizationPartnerHmac } from "@/lib/organizationEligibility";
import { listOrganizationEligibilityMatching } from "@/lib/organizationEligibility/store";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import { loadOperatorLaunchpadApplication } from "@/lib/partner/sandboxInstitutionalOperatorResult/apps";
import { isOperatorSandboxTestResult } from "@/lib/partner/sandboxInstitutionalOperatorResult/audit";
import {
  SANDBOX_INSTITUTIONAL_OPERATOR_ACTION_CLASS,
  SANDBOX_INSTITUTIONAL_OPERATOR_CREATE_KEYS,
  SANDBOX_INSTITUTIONAL_OPERATOR_NOTICE,
  SANDBOX_INSTITUTIONAL_OPERATOR_REVOKE_KEYS,
  SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL,
  issueOperatorSandboxInstitutionalResult,
  revokeOperatorSandboxInstitutionalResult,
  sandboxInstitutionalOperatorCopy,
  sandboxInstitutionalOperatorCsrfRejected,
  sandboxInstitutionalOperatorOverride,
} from "@/lib/partner/sandboxInstitutionalOperatorResult";

export const dynamic = "force-dynamic";

function fail(code: string, status: number) {
  return NextResponse.json({
    error: code,
    live_kyb: false,
    production_approval: false,
    public_creation: false,
  }, { status });
}

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  const applicationId = req.nextUrl.searchParams.get("application_id") ?? "";
  let items: Array<Record<string, unknown>> = [];
  if (applicationId) {
    try {
      const app = await loadOperatorLaunchpadApplication(applicationId);
      if (app) {
        const matches = await listOrganizationEligibilityMatching({
          partner_hmac: organizationPartnerHmac(app.partner_id),
          result_category: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
          policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
          policy_version: 1,
          action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
          environment: "sandbox",
        });
        items = matches.filter(isOperatorSandboxTestResult).map((row) => ({
          organization_ref: row.organization_ref,
          operator_action_class: SANDBOX_INSTITUTIONAL_OPERATOR_ACTION_CLASS,
          result_label: SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL,
          policy_id: sandboxInstitutionalOperatorCopy().policy_id,
          policy_version: sandboxInstitutionalOperatorCopy().policy_version,
          environment: "sandbox",
          expires_at: row.expires_at,
          lifecycle_state: row.status,
        }));
      }
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
      return fail(code, code === "schema_unavailable" ? 503 : 400);
    }
  }
  const payload = {
    ok: true,
    ...sandboxInstitutionalOperatorCopy(),
    items,
  };
  if (organizationLeaks(payload).length) return fail("redacted", 503);
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  if (sandboxInstitutionalOperatorCsrfRejected(req)) {
    return fail("csrf_required", 403);
  }
  const limited = checkLaunchpadRateLimit(req, "admin:sandbox-institutional-result", 6, 60);
  if (!limited.allowed) return fail("rate_limited", 429);
  const body = await req.json().catch(() => null);
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const revoke = typeof record.organization_ref === "string";
  const allowed = revoke ? SANDBOX_INSTITUTIONAL_OPERATOR_REVOKE_KEYS : SANDBOX_INSTITUTIONAL_OPERATOR_CREATE_KEYS;
  if (sandboxInstitutionalOperatorOverride(body, allowed)) return fail("client_override_rejected", 400);
  try {
    if (revoke) {
      await revokeOperatorSandboxInstitutionalResult({
        organizationRef: String(record.organization_ref),
        applicationId: String(record.application_id ?? ""),
        confirm: record.confirm === true,
      });
      const payload = { ok: true, revoked: true, notice: SANDBOX_INSTITUTIONAL_OPERATOR_NOTICE, live_kyb: false };
      if (organizationLeaks(payload).length) return fail("redacted", 503);
      return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
    }
    const issued = await issueOperatorSandboxInstitutionalResult({
      applicationId: String(record.application_id ?? ""),
      confirm: record.confirm === true,
    });
    const payload = {
      ok: true,
      ...sandboxInstitutionalOperatorCopy(),
      organization_ref: issued.organization_ref,
      expires_at: issued.expires_at,
      lifecycle_state: issued.status,
    };
    if (organizationLeaks(payload).length) return fail("redacted", 503);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "unavailable";
    const status = code === "schema_unavailable" ? 503 : code === "not_found" ? 404 : 400;
    return fail(code, status);
  }
}
