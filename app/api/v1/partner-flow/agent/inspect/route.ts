import { NextRequest, NextResponse } from "next/server";
import { requirePartnerFlowHolder } from "@/lib/partner/partnerFlowHolderContext";
import { resolveEffectivePartnerPolicyId } from "@/lib/partner/solanaNativePartnerPolicyRouting";
import {
  inspectPartnerPolicyForAgent,
  validatePartnerProofAgentRequest,
} from "@/lib/partner/partnerProofAgent";
import { resolvePartnerDisplayName } from "@/lib/partner/partnerVerifyDisplay";
import { partnerJourneyPartnerIntro } from "@/lib/partner/partnerJourneyStateMachine";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/partner-flow/agent/inspect
 * Narrow agent tool — inspect policy requirements and evidence status.
 * Does not issue receipts or override policy.
 */
export async function POST(request: NextRequest) {
  const holderAuth = await requirePartnerFlowHolder(request);
  if (!holderAuth.ok) {
    return NextResponse.json(
      { error: holderAuth.error, code: holderAuth.code },
      { status: holderAuth.status },
    );
  }

  let body: { partner_id?: string; policy_id?: string; return_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const partnerId = body.partner_id?.trim() ?? "";
  const policyId = body.policy_id?.trim() ?? "";

  const validation = await validatePartnerProofAgentRequest({
    partner_id: partnerId,
    policy_id: policyId,
    return_url: body.return_url,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const effectivePolicyId = resolveEffectivePartnerPolicyId({
      requestedPolicyId: policyId,
      holderMode: holderAuth.holder.mode,
    }).policyId;

    const result = await inspectPartnerPolicyForAgent({
      partner_id: partnerId,
      policy_id: effectivePolicyId,
      sui_address: holderAuth.holder.subjectId,
    });
    const partnerName = resolvePartnerDisplayName(partnerId);
    return NextResponse.json({
      ...result,
      partner_intro: partnerJourneyPartnerIntro(partnerName),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Agent inspect failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
