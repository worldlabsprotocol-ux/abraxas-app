// FILE: app/api/launchpad/applications/[id]/settlement/authorize/route.ts

import { NextRequest } from "next/server";
import { prepareSettlementAuthorization } from "@/lib/settlement/SettlementAuthorizationService";
import {
  requireSettlementPartnerAuth,
  settlementError,
  settlementJson,
} from "@/lib/settlement/settlementApiHelpers";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireSettlementPartnerAuth(req, params.id);
  if (!auth.ok) return auth.response;

  let body: {
    receipt_id?: string;
    eligible_wallet?: string;
    amount_micro_usdc?: string | number;
    environment?: "sandbox" | "production";
    settlement_reference?: string;
  };
  try {
    body = await req.json();
  } catch {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400, "Invalid JSON");
  }

  if (!body.receipt_id || !body.eligible_wallet || body.amount_micro_usdc === undefined) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400);
  }

  const environment = body.environment === "production" ? "production" : "sandbox";
  if (environment === "production") {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.production_unavailable, 403);
  }

  const result = await prepareSettlementAuthorization({
    applicationId: params.id,
    partnerId: auth.partnerId,
    receiptId: body.receipt_id,
    eligibleWallet: body.eligible_wallet,
    amountMicroUsdc: BigInt(String(body.amount_micro_usdc)),
    environment,
    settlementReference: body.settlement_reference,
  });

  if (!result.ok) {
    return settlementError(result.code, 400);
  }

  const { authorization, feeQuote } = result;
  return settlementJson({
    ok: true,
    authorization: {
      authorization_id: authorization.authorizationId,
      chain_id: Number(authorization.payload.chainId),
      contract_address: authorization.typedData.domain?.verifyingContract ?? null,
      token_address: authorization.payload.token,
      recipient: authorization.payload.recipient,
      eligible_wallet: authorization.payload.eligibleWallet,
      amount_micro_usdc: authorization.payload.amountMicroUsdc.toString(),
      amount_kind: authorization.payload.amountKind,
      expires_at: authorization.expiresAtIso,
      settlement_reference: authorization.settlementReference,
      signature: authorization.signature,
      signer_address: authorization.signerAddress,
      typed_data: authorization.typedData,
      fee_quote: {
        base_amount_micro_usdc: feeQuote.baseAmountMicroUsdc.toString(),
        fee_micro_usdc: feeQuote.feeMicroUsdc.toString(),
        total_amount_micro_usdc: feeQuote.totalAmountMicroUsdc.toString(),
        fee_active: feeQuote.feeActive,
        fee_label: feeQuote.feeLabel,
      },
    },
  });
}
