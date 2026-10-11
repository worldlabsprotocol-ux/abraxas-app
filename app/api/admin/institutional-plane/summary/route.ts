import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { evaluateSolanaMainnetPromotionGate } from "@/lib/institutional/solanaMainnetPromotionGate";
import {
  mapGovernanceReportToPromotionInputs,
  runSolanaMainnetGovernanceVerification,
} from "@/lib/institutional/solanaMainnetGovernanceVerifier";
import { INSTITUTIONAL_ELIGIBILITY_NOTICE } from "@/lib/institutional/eligibilityDecisionContract";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const governance = await runSolanaMainnetGovernanceVerification({
    signerRotationDocumented: Boolean(process.env.ABRAXAS_CHAIN_SIGNER_ROTATION_DOCUMENTED === "true"),
    signerCustodyDocumented: Boolean(process.env.ABRAXAS_CHAIN_ATTESTATION_SIGNER_ACTIVE === "true"),
    finalizedConfirmationPolicyDocumented: true,
  });
  const solanaGate = evaluateSolanaMainnetPromotionGate({
    ...mapGovernanceReportToPromotionInputs(governance),
    conformance_vectors_pass: Boolean(process.env.ABRAXAS_CONFORMANCE_VECTORS_PASS === "true"),
  });

  const replayBackend =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "supabase_rpc"
      : "unconfigured";

  return NextResponse.json({
    ok: true,
    notice: INSTITUTIONAL_ELIGIBILITY_NOTICE,
    institutional_api: {
      consume: "POST /api/v1/institutional/eligibility/consume",
      receipt_status: "GET /api/v1/decision-receipts/{receiptId}/status",
      public_receipt: "GET /api/receipts/{receiptId}/public",
    },
    replay_protection: {
      backend: replayBackend,
      migration_ref: "supabase/migrations/139_institutional_eligibility_consume_nonces.sql",
      nonce_required: true,
      fail_closed_on_store_outage: true,
    },
    solana_governance: governance,
    solana_mainnet_promotion: solanaGate,
    integration_health: {
      partner_flow_rate_limit: "enabled",
      webhook_delivery: "see /admin/partner-flow",
    },
  });
}
