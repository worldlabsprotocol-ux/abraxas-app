import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { evaluatePartnerFlow } from "@/lib/partner/relyingPartyFlow";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import { resolvePartnerFlowParams } from "@/lib/verify/resolveFlowParams";
import { PermissionResolutionError } from "@/lib/verify/resolvePermission";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/partner-flow/evaluate
 * Generic relying-party flow evaluation (permission or policy_id).
 */
export async function POST(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: {
    partner_id?: string;
    relying_party_id?: string;
    policy_id?: string;
    permission?: string;
    permission_version?: string;
    return_url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const partnerId = (body.relying_party_id ?? body.partner_id)?.trim();
  const returnUrl = body.return_url?.trim();
  if (!partnerId || !returnUrl) {
    return NextResponse.json(
      { error: "relying_party_id (or partner_id) and return_url are required" },
      { status: 400 },
    );
  }

  let policyId: string;
  try {
    ({ policyId } = resolvePartnerFlowParams({
      relyingPartyId: partnerId,
      policyId: body.policy_id,
      permission: body.permission,
      permissionVersion: body.permission_version,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid permission or policy";
    const status = e instanceof PermissionResolutionError ? 400 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  const allowed = await isAllowedPartnerReturnUrl(partnerId, returnUrl);
  if (!allowed) {
    return NextResponse.json(
      { error: "return_url is not allowed for this relying party" },
      { status: 400 },
    );
  }

  try {
    const result = await evaluatePartnerFlow({
      partnerId,
      policyId,
      returnUrl,
      suiAddress: session.session.suiAddress,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Flow evaluation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
