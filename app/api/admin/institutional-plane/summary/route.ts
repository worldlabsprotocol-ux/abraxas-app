import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { evaluateSolanaMainnetPromotionGate } from "@/lib/institutional/solanaMainnetPromotionGate";
import {
  mapGovernanceReportToPromotionInputs,
  runSolanaMainnetGovernanceVerification,
} from "@/lib/institutional/solanaMainnetGovernanceVerifier";
import { INSTITUTIONAL_ELIGIBILITY_NOTICE } from "@/lib/institutional/eligibilityDecisionContract";
import { probeInstitutionalReplayReadiness } from "@/lib/institutional/replayReadinessProbe";
import { INSTITUTIONAL_REPLAY_RESERVATION_POLICY } from "@/lib/institutional/replayConsumeSemantics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const replayReadiness = await probeInstitutionalReplayReadiness();
  const governance = await runSolanaMainnetGovernanceVerification({
    signerRotationDocumented: Boolean(process.env.ABRAXAS_CHAIN_SIGNER_ROTATION_DOCUMENTED === "true"),
    signerCustodyDocumented: Boolean(process.env.ABRAXAS_CHAIN_ATTESTATION_SIGNER_ACTIVE === "true"),
    finalizedConfirmationPolicyDocumented: true,
  });
  const solanaGate = evaluateSolanaMainnetPromotionGate({
    ...mapGovernanceReportToPromotionInputs(governance),
    conformance_vectors_pass: Boolean(process.env.ABRAXAS_CONFORMANCE_VECTORS_PASS === "true"),
  });

  return NextResponse.json({
    ok: true,
    notice: INSTITUTIONAL_ELIGIBILITY_NOTICE,
    institutional_api: {
      consume: "POST /api/v1/institutional/eligibility/consume",
      receipt_status: "GET /api/v1/decision-receipts/{receiptId}/status",
      public_receipt: "GET /api/receipts/{receiptId}/public",
    },
    replay_protection: {
      reservation_policy: INSTITUTIONAL_REPLAY_RESERVATION_POLICY,
      migration_refs: [
        "supabase/migrations/139_institutional_eligibility_consume_nonces.sql",
        "supabase/migrations/140_institutional_replay_rpc_hardening.sql",
      ],
      nonce_required: true,
      fail_closed_on_store_outage: true,
      readiness: replayReadiness,
      production_consume_available: replayReadiness.consume_available,
    },
    solana_live_observation: governance.live_dual_rpc_observation
      ? {
          observed_at: governance.live_dual_rpc_observation.observed_at,
          cluster: governance.live_dual_rpc_observation.cluster,
          genesis_agreement: governance.live_dual_rpc_observation.genesis_agreement,
          likely_same_operator: governance.live_dual_rpc_observation.likely_same_operator,
          program_id: governance.live_dual_rpc_observation.program?.program_id ?? null,
          program_elf_sha256: governance.live_dual_rpc_observation.program?.elf_sha256 ?? null,
          upgrade_authority: governance.live_dual_rpc_observation.program?.upgrade_authority ?? null,
          errors: governance.live_dual_rpc_observation.errors,
        }
      : null,
    solana_governance: governance,
    solana_mainnet_promotion: solanaGate,
    integration_health: {
      partner_flow_rate_limit: "enabled",
      webhook_delivery: "see /admin/partner-flow",
    },
  });
}
