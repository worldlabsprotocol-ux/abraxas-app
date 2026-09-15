// FILE: lib/settlement/SettlementReceiptService.ts
// Validates eligibility receipts for settlement without exposing private data.

import { getPartnerReceipt, getReceiptById } from "@/lib/decisionReceipts/service";
import { computeReceiptCommitmentFromPayloadHash } from "@/lib/settlement/receiptCommitment";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import type { ArcSettlementConfigRow } from "@/lib/settlement/types";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEvmAddress } from "@/lib/settlement/validation";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { normalizeSuiAddress } from "@mysten/sui/utils";

export interface ValidatedSettlementReceipt {
  receiptId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  payloadHash: string;
  receiptCommitment: `0x${string}`;
  environment: "sandbox" | "production";
  walletBindingRef: string | null;
  expiresAt: string | null;
}

export async function validateReceiptForSettlement(input: {
  receiptId: string;
  partnerId: string;
  config: ArcSettlementConfigRow;
  eligibleWallet: string;
  environment: "sandbox" | "production";
  subjectId?: string;
}): Promise<{ ok: true; receipt: ValidatedSettlementReceipt } | { ok: false; code: string }> {
  const result = await getPartnerReceipt(input.receiptId, input.partnerId);
  if (!result) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.receipt_not_found };
  }

  if ("error" in result && result.error === "forbidden") {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.receipt_audience_mismatch };
  }

  if (!result.valid) {
    const expired = result.invalidation_reasons?.includes("expired");
    return {
      ok: false,
      code: expired
        ? SETTLEMENT_PUBLIC_ERRORS.receipt_expired
        : SETTLEMENT_PUBLIC_ERRORS.receipt_invalid,
    };
  }

  const view = result.view;
  if (view.decision_result !== "approved") {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.receipt_invalid };
  }

  if (view.partner_id !== input.partnerId) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.receipt_audience_mismatch };
  }

  if (view.policy_id !== input.config.policy_id) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.receipt_policy_mismatch };
  }

  if (view.policy_version !== input.config.policy_version) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.receipt_policy_mismatch };
  }

  const receiptEnv = view.decision_context === "sandbox_only" ? "sandbox" : "production";
  if (receiptEnv !== input.environment) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.environment_mismatch };
  }

  if (input.config.arc_environment !== "arc_testnet" && input.environment === "production") {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.production_unavailable };
  }

  const walletOk = await verifyWalletBindingForSettlement({
    walletBindingRef: view.wallet_binding_ref,
    eligibleWallet: input.eligibleWallet,
  });
  if (!walletOk) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.wallet_mismatch };
  }

  const record = await getReceiptById(input.receiptId);
  if (!record) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.receipt_not_found };
  }

  if (input.subjectId) {
    const expectedPseudonym = subjectPseudonymId(normalizeSuiAddress(input.subjectId));
    if (record.subject_pseudonym_id !== expectedPseudonym) {
      return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.receipt_audience_mismatch };
    }
  }

  const receiptCommitment = computeReceiptCommitmentFromPayloadHash(record.payload_hash);

  return {
    ok: true,
    receipt: {
      receiptId: view.receipt_id,
      partnerId: view.partner_id,
      policyId: view.policy_id,
      policyVersion: view.policy_version,
      payloadHash: record.payload_hash,
      receiptCommitment,
      environment: receiptEnv,
      walletBindingRef: view.wallet_binding_ref,
      expiresAt: view.expires_at,
    },
  };
}

async function verifyWalletBindingForSettlement(input: {
  walletBindingRef: string | null;
  eligibleWallet: string;
}): Promise<boolean> {
  const normalizedWallet = normalizeEvmAddress(input.eligibleWallet);
  if (!normalizedWallet) return false;

  if (!input.walletBindingRef) {
    return false;
  }

  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("wallet_bindings")
    .select("wallet_address, chain, revoked_at")
    .eq("id", input.walletBindingRef)
    .maybeSingle();

  if (!data || data.revoked_at) return false;

  const chain = String(data.chain ?? "").toLowerCase();
  if (chain !== "evm") {
    return false;
  }

  const bound = normalizeEvmAddress(String(data.wallet_address));
  return bound !== null && bound.toLowerCase() === normalizedWallet.toLowerCase();
}
