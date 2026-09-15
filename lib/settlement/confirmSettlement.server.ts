// FILE: lib/settlement/confirmSettlement.server.ts
// Idempotent settlement confirmation persistence after onchain verification.

import "server-only";

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import { verifySettlementOnchain } from "@/lib/settlement/SettlementConfirmationVerifier.server";
import type { ArcAuthorizationRow, ArcSettlementConfigRow } from "@/lib/settlement/types";
import { createArcSettlementAdapter } from "@/lib/settlement/ArcSettlementAdapter";

export async function confirmSettlementFromChain(input: {
  applicationId: string;
  partnerId: string;
  authorizationId: string;
  transactionHash: string;
  config: ArcSettlementConfigRow;
  authorization: ArcAuthorizationRow;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  if (input.authorization.status === "confirmed") {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.duplicate_confirmation };
  }

  if (new Date(input.authorization.expires_at).getTime() < Date.now()
    && input.authorization.status !== "submitted") {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_expired };
  }

  const verified = await verifySettlementOnchain({
    transactionHash: input.transactionHash,
    config: input.config,
    authorization: input.authorization,
  });
  if (!verified.ok) {
    return verified;
  }

  const execution = verified.execution;
  const adapter = createArcSettlementAdapter(
    "arc_testnet",
    input.config.settlement_contract_address as `0x${string}`,
  );

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("partner_launchpad_arc_confirm_settlement_atomic", {
    p_authorization_id: input.authorizationId,
    p_application_id: input.applicationId,
    p_partner_id: input.partnerId,
    p_transaction_hash: execution.transactionHash,
    p_block_number: execution.blockNumber,
    p_payer_wallet: execution.payerWallet,
    p_recipient: execution.recipient,
    p_token_address: execution.token,
    p_amount_micro_usdc: Number(execution.amountMicroUsdc),
    p_receipt_commitment: input.authorization.receipt_commitment,
    p_settlement_reference: input.authorization.settlement_reference,
    p_explorer_url: adapter.buildExplorerTxUrl(execution.transactionHash),
  });

  if (error) {
    if (String(error.message ?? "").includes("duplicate")) {
      return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.duplicate_confirmation };
    }
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.transaction_not_confirmed };
  }

  const result = data as { ok?: boolean; code?: string } | null;
  if (!result?.ok) {
    const code = result?.code === "duplicate_confirmation"
      ? SETTLEMENT_PUBLIC_ERRORS.duplicate_confirmation
      : SETTLEMENT_PUBLIC_ERRORS.transaction_not_confirmed;
    return { ok: false, code };
  }

  await recordLaunchpadActivity(sb, {
    applicationId: input.applicationId,
    partnerId: input.partnerId,
    eventType: "arc_transaction_confirmed",
    metadata: {
      authorization_id: input.authorizationId,
      transaction_hash: execution.transactionHash,
      amount_micro_usdc: Number(execution.amountMicroUsdc),
      testnet: true,
    },
  });

  return { ok: true };
}
