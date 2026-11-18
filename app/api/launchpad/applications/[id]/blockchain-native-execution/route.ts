// Blockchain-native Integration Studio path — on-chain continuity + portable verification (not sovereign PG issuance).

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import {
  buildBlockchainNativeStudioTransaction,
  confirmBlockchainNativeStudioExecution,
  prepareBlockchainNativeStudioHarness,
} from "@/lib/partner/launchpad/blockchainNative/studioExecution";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/blockchain-native-execution",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const body = (await req.json().catch(() => ({}))) as {
    phase?: "prepare" | "build_transaction" | "confirm";
    scenario_id?: string;
    holder_wallet_address?: string;
    prepare_token?: string;
    transaction_signature?: string;
  };

  const holderWallet = body.holder_wallet_address?.trim();
  if (!holderWallet && body.phase !== "prepare") {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "holder_wallet_required");
  }

  if (body.phase === "prepare") {
    if (!holderWallet) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "holder_wallet_required");
    const prepared = await prepareBlockchainNativeStudioHarness({
      applicationId: app.id,
      partnerId: auth.session.partnerId,
      policyId: app.policy_id,
      policyVersion: app.policy_version,
      policyTemplateId: app.policy_template_id,
      scenarioId: body.scenario_id ?? "approved",
      holderWallet,
    });
    if (!prepared.ok) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, prepared.code);
    return launchpadJson({
      ok: true,
      phase: "prepared",
      prepare_token: prepared.prepare_token,
      receipt_id: prepared.receipt_id,
      execution_nonce: prepared.execution_nonce,
      registry_pda: prepared.registry_pda,
      commitment_pda: prepared.commitment_pda,
      payload_hash_hex: prepared.payload_hash_hex,
      rpc_url: prepared.rpc_url,
      finality_slots: prepared.finality_slots,
      holder_wallet: prepared.holder_wallet,
    });
  }

  if (body.phase === "build_transaction") {
    const token = body.prepare_token?.trim();
    if (!token) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "prepare_token_required");
  if (!holderWallet) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "holder_wallet_required");
    const built = await buildBlockchainNativeStudioTransaction({
      applicationId: app.id,
      partnerId: auth.session.partnerId,
      holderWallet,
      prepareToken: token,
    });
    if (!built.ok) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 422, built.code);
    return launchpadJson({
      ok: true,
      phase: "transaction_ready",
      kind: built.kind,
      transaction_base64: built.transaction_base64,
      recent_blockhash: built.recent_blockhash,
      last_valid_block_height: built.last_valid_block_height,
    });
  }

  if (body.phase === "confirm") {
    const token = body.prepare_token?.trim();
    const signature = body.transaction_signature?.trim();
    if (!token) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "prepare_token_required");
    if (!signature) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "chain_transaction_signature_required");
    if (!holderWallet) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "holder_wallet_required");
    const confirmed = await confirmBlockchainNativeStudioExecution({
      applicationId: app.id,
      partnerId: auth.session.partnerId,
      policyId: app.policy_id,
      policyTemplateId: app.policy_template_id,
      holderWallet,
      prepareToken: token,
      transactionSignature: signature,
    });
    if (!confirmed.ok) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 422, confirmed.code);
    return launchpadJson({
      ok: true,
      phase: "confirmed",
      receipt_id: confirmed.receipt_id,
      payload_hash_hex: confirmed.payload_hash_hex,
      observation_slot: confirmed.observation_slot,
      transaction_signature: confirmed.transaction_signature,
      independent_verification: confirmed.portable,
      chain_status_version: confirmed.chain_status_version.toString(),
    });
  }

  return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "invalid_phase");
}