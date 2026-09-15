// FILE: lib/settlement/SettlementAuthorizationService.ts
// Prepares, tracks, and confirms proof gated settlement authorizations.

import { randomBytes } from "crypto";
import { keccak256, stringToHex } from "viem";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import type { LaunchpadActivityEventType } from "@/lib/partner/launchpad/types";
import { quoteSettlementFees } from "@/lib/settlement/accountingHooks";
import {
  applicationIdToBytes32,
  hashPartnerIdForSettlement,
  hashPolicyIdForSettlement,
  hashSettlementReference,
} from "@/lib/settlement/receiptCommitment";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import { validateReceiptForSettlement } from "@/lib/settlement/SettlementReceiptService";
import {
  buildSettlementTypedDataDomain,
  buildSettlementTypedDataMessage,
  generateSettlementNonce,
  getSettlementSignerAddress,
  SETTLEMENT_TYPED_DATA_TYPES,
  signSettlementAuthorization,
} from "@/lib/settlement/signing";
import type {
  ArcAuthorizationRow,
  ArcSettlementConfigRow,
  PrepareSettlementAuthorizationInput,
  RecordSettlementConfirmationInput,
  SettlementAuthorizationPayload,
  SettlementTypedDataBundle,
  SignedSettlementAuthorization,
} from "@/lib/settlement/types";
import { normalizeEvmAddress, validateSettlementAmount } from "@/lib/settlement/validation";
import { assertCanonicalEvmWalletOwnership } from "@/lib/settlement/walletOwnership.server";
import { confirmSettlementFromChain } from "@/lib/settlement/confirmSettlement.server";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";

function mapConfigRow(row: Record<string, unknown>): ArcSettlementConfigRow {
  return row as unknown as ArcSettlementConfigRow;
}

function mapAuthRow(row: Record<string, unknown>): ArcAuthorizationRow {
  return row as unknown as ArcAuthorizationRow;
}

export async function getArcSettlementConfig(
  applicationId: string,
): Promise<ArcSettlementConfigRow | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_launchpad_arc_settlement_config")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();
  return data ? mapConfigRow(data as Record<string, unknown>) : null;
}

export async function upsertArcSettlementConfig(
  applicationId: string,
  partnerId: string,
  input: Partial<ArcSettlementConfigRow> & { policy_id: string },
): Promise<ArcSettlementConfigRow> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("partner_launchpad_arc_settlement_config")
    .upsert(
      {
        application_id: applicationId,
        partner_id: partnerId,
        enabled: input.enabled ?? false,
        arc_environment: "arc_testnet",
        chain_id: 5042002,
        settlement_contract_address: input.settlement_contract_address ?? null,
        usdc_token_address: input.usdc_token_address ?? "0x3600000000000000000000000000000000000000",
        approved_recipient: input.approved_recipient,
        minimum_amount_micro_usdc: input.minimum_amount_micro_usdc ?? 10000,
        maximum_amount_micro_usdc: input.maximum_amount_micro_usdc ?? 100000000,
        policy_id: input.policy_id,
        policy_version: input.policy_version ?? 1,
        authorization_lifetime_seconds: input.authorization_lifetime_seconds ?? 900,
        reusable_authorization: input.reusable_authorization ?? false,
        paused: input.paused ?? false,
        updated_at: now,
      },
      { onConflict: "application_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("settlement_config_upsert_failed");
  }
  return mapConfigRow(data as Record<string, unknown>);
}

async function recordArcActivity(
  applicationId: string,
  partnerId: string,
  eventType: LaunchpadActivityEventType,
  metadata: Record<string, string | number | boolean | null>,
): Promise<void> {
  const sb = requireSupabaseAdmin();
  await recordLaunchpadActivity(sb, {
    applicationId,
    partnerId,
    eventType,
    metadata,
  });
}

export async function prepareSettlementAuthorization(
  input: PrepareSettlementAuthorizationInput,
): Promise<{ ok: true; authorization: SignedSettlementAuthorization; feeQuote: ReturnType<typeof quoteSettlementFees> } | { ok: false; code: string }> {
  const config = await getArcSettlementConfig(input.applicationId);
  if (!config) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.config_not_found };
  }
  if (config.partner_id !== input.partnerId) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.unauthorized };
  }

  const application = await getLaunchpadApplicationForPartner(input.applicationId, input.partnerId);
  if (!application || application.status !== "active") {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.application_not_found };
  }

  if (input.environment === "production") {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.production_unavailable };
  }

  if (input.idempotencyKey) {
    const sb = requireSupabaseAdmin();
    const { data: existingIdem } = await sb
      .from("partner_launchpad_arc_authorizations")
      .select("id, status")
      .eq("application_id", input.applicationId)
      .eq("metadata->>idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existingIdem) {
      return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_reused };
    }
  }

  if (!config.enabled) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.config_disabled };
  }
  if (config.paused) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.config_paused };
  }
  if (!config.settlement_contract_address) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.contract_not_configured };
  }

  let wallet: `0x${string}` | null = null;
  if (input.subjectId) {
    const ownership = await assertCanonicalEvmWalletOwnership({
      subjectId: input.subjectId,
      claimedWallet: input.eligibleWallet ?? "",
    });
    if (!ownership.ok) {
      return { ok: false, code: ownership.code };
    }
    wallet = ownership.wallet;
  } else {
    wallet = normalizeEvmAddress(input.eligibleWallet ?? "");
    if (!wallet) {
      return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.invalid_wallet };
    }
  }

  const amountCheck = validateSettlementAmount(config, input.amountMicroUsdc);
  if (!amountCheck.ok) {
    return { ok: false, code: amountCheck.code };
  }

  const receiptResult = await validateReceiptForSettlement({
    receiptId: input.receiptId,
    partnerId: input.partnerId,
    config,
    eligibleWallet: wallet,
    environment: input.environment,
    subjectId: input.subjectId,
  });
  if (!receiptResult.ok) {
    return { ok: false, code: receiptResult.code };
  }

  const recipient = normalizeEvmAddress(config.approved_recipient);
  const token = normalizeEvmAddress(config.usdc_token_address);
  const contract = normalizeEvmAddress(config.settlement_contract_address);
  if (!recipient || !token || !contract) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.contract_not_configured };
  }

  if (!config.reusable_authorization) {
    const sb = requireSupabaseAdmin();
    const { data: existing } = await sb
      .from("partner_launchpad_arc_authorizations")
      .select("id")
      .eq("receipt_id", input.receiptId)
      .in("status", ["issued", "submitted", "confirmed"])
      .maybeSingle();
    if (existing) {
      return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_reused };
    }
  }

  const signerAddress = getSettlementSignerAddress();
  if (!signerAddress) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.signer_unavailable };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAtSec = nowSec + config.authorization_lifetime_seconds;
  const nonce = generateSettlementNonce();
  const settlementReferenceRaw =
    input.settlementReference ?? `arc-${input.applicationId.slice(0, 8)}-${randomBytes(4).toString("hex")}`;

  const payload: SettlementAuthorizationPayload = {
    chainId: BigInt(config.chain_id),
    environment: input.environment,
    partnerApplicationId: applicationIdToBytes32(input.applicationId),
    partnerIdHash: hashPartnerIdForSettlement(input.partnerId),
    policyIdHash: hashPolicyIdForSettlement(config.policy_id),
    policyVersion: BigInt(config.policy_version),
    eligibleWallet: wallet,
    recipient,
    token,
    amountMicroUsdc: input.amountMicroUsdc,
    amountKind: "exact",
    actionType: keccak256(stringToHex("usdc_transfer")),
    nonce,
    issuedAt: BigInt(nowSec),
    expiresAt: BigInt(expiresAtSec),
    receiptCommitment: receiptResult.receipt.receiptCommitment,
    settlementReference: hashSettlementReference(settlementReferenceRaw),
  };

  const { signature, signerAddress: signedBy } = await signSettlementAuthorization(payload, contract);
  const feeQuote = quoteSettlementFees(input.amountMicroUsdc);

  const sb = requireSupabaseAdmin();
  const { data: row, error } = await sb
    .from("partner_launchpad_arc_authorizations")
    .insert({
      application_id: input.applicationId,
      partner_id: input.partnerId,
      environment: input.environment,
      chain_id: config.chain_id,
      eligible_wallet: wallet,
      recipient,
      token_address: token,
      amount_micro_usdc: Number(input.amountMicroUsdc),
      amount_kind: "exact",
      action_type: "usdc_transfer",
      nonce,
      receipt_id: input.receiptId,
      receipt_commitment: receiptResult.receipt.receiptCommitment,
      settlement_reference: settlementReferenceRaw,
      policy_id: config.policy_id,
      policy_version: config.policy_version,
      status: "issued",
      issued_at: new Date(nowSec * 1000).toISOString(),
      expires_at: new Date(expiresAtSec * 1000).toISOString(),
      metadata: {
        signer_address: signedBy,
        fee_micro_usdc: feeQuote.feeMicroUsdc.toString(),
        idempotency_key: input.idempotencyKey ?? null,
      },
    })
    .select("*")
    .single();

  if (error || !row) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_invalid };
  }

  const authRow = mapAuthRow(row as Record<string, unknown>);
  await recordArcActivity(input.applicationId, input.partnerId, "arc_authorization_issued", {
    authorization_id: authRow.id,
    amount_micro_usdc: Number(input.amountMicroUsdc),
    chain_id: config.chain_id,
    testnet: true,
  });

  const domain = buildSettlementTypedDataDomain(config.chain_id, contract);
  const message = buildSettlementTypedDataMessage(payload);
  const typedData: SettlementTypedDataBundle = {
    domain: {
      name: domain.name ?? "AbraxasSettlement",
      version: domain.version ?? "1",
      chainId: domain.chainId ?? BigInt(config.chain_id),
      verifyingContract: contract,
    },
    types: SETTLEMENT_TYPED_DATA_TYPES as unknown as SettlementTypedDataBundle["types"],
    primaryType: "SettlementAuthorization",
    message: message as Record<string, unknown>,
  };

  return {
    ok: true,
    authorization: {
      authorizationId: authRow.id,
      payload,
      signature,
      signerAddress: signedBy,
      typedData,
      expiresAtIso: authRow.expires_at,
      settlementReference: settlementReferenceRaw,
    },
    feeQuote,
  };
}

export async function getSettlementAuthorizationStatus(
  applicationId: string,
  partnerId: string,
  authorizationId: string,
): Promise<ArcAuthorizationRow | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_launchpad_arc_authorizations")
    .select("*")
    .eq("id", authorizationId)
    .eq("application_id", applicationId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  return data ? mapAuthRow(data as Record<string, unknown>) : null;
}

export async function listSettlementActivity(
  applicationId: string,
  partnerId: string,
  limit = 50,
): Promise<ArcAuthorizationRow[]> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_launchpad_arc_authorizations")
    .select("*")
    .eq("application_id", applicationId)
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => mapAuthRow(row as Record<string, unknown>));
}

export async function recordSettlementConfirmation(
  input: RecordSettlementConfirmationInput,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const auth = await getSettlementAuthorizationStatus(
    input.applicationId,
    input.partnerId,
    input.authorizationId,
  );
  if (!auth) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.authorization_not_found };
  }

  const config = await getArcSettlementConfig(input.applicationId);
  if (!config?.settlement_contract_address) {
    return { ok: false, code: SETTLEMENT_PUBLIC_ERRORS.contract_not_configured };
  }

  return confirmSettlementFromChain({
    applicationId: input.applicationId,
    partnerId: input.partnerId,
    authorizationId: input.authorizationId,
    transactionHash: input.transactionHash,
    config,
    authorization: auth,
  });
}

export async function markAuthorizationSubmitted(
  applicationId: string,
  partnerId: string,
  authorizationId: string,
  transactionHash: string,
): Promise<void> {
  const sb = requireSupabaseAdmin();
  await sb
    .from("partner_launchpad_arc_authorizations")
    .update({
      status: "submitted",
      transaction_hash: transactionHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authorizationId)
    .eq("application_id", applicationId)
    .eq("partner_id", partnerId);

  await recordArcActivity(applicationId, partnerId, "arc_transaction_submitted", {
    authorization_id: authorizationId,
    transaction_hash: transactionHash,
    testnet: true,
  });
}
