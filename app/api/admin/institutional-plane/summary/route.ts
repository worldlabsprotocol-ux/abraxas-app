import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { evaluateSolanaMainnetPromotionGate } from "@/lib/institutional/solanaMainnetPromotionGate";
import { INSTITUTIONAL_ELIGIBILITY_NOTICE } from "@/lib/institutional/eligibilityDecisionContract";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const solanaGate = evaluateSolanaMainnetPromotionGate({
    rpc_url_configured: Boolean(process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim()),
    rpc_is_devnet: (process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL ?? "").includes("devnet"),
  });

  return NextResponse.json({
    ok: true,
    notice: INSTITUTIONAL_ELIGIBILITY_NOTICE,
    institutional_api: {
      consume: "POST /api/v1/institutional/eligibility/consume",
      receipt_status: "GET /api/v1/decision-receipts/{receiptId}/status",
      public_receipt: "GET /api/receipts/{receiptId}/public",
    },
    solana_mainnet_promotion: solanaGate,
    integration_health: {
      partner_flow_rate_limit: "enabled",
      webhook_delivery: "see /admin/partner-flow",
    },
  });
}
