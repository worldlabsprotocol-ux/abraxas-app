// FILE: app/api/launchpad/public/settlement/authorize/route.ts
// Browser session settlement authorization for hosted Arc demo.

import { NextRequest } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { getLaunchpadApplicationBySlug } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { prepareSettlementAuthorization } from "@/lib/settlement/SettlementAuthorizationService";
import { settlementError, settlementJson } from "@/lib/settlement/settlementApiHelpers";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import { normalizeEvmAddress } from "@/lib/settlement/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.unauthorized, session.status);
  }

  let body: {
    app?: string;
    receipt_id?: string;
    eligible_wallet?: string;
    amount_micro_usdc?: string | number;
  };
  try {
    body = await req.json();
  } catch {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400, "Invalid JSON");
  }

  if (!body.app || !body.receipt_id || !body.eligible_wallet || body.amount_micro_usdc === undefined) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400);
  }

  const wallet = normalizeEvmAddress(body.eligible_wallet);
  if (!wallet) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.invalid_wallet, 400);
  }

  const app = await getLaunchpadApplicationBySlug(body.app);
  if (!app || app.status !== "active") {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.application_not_found, 404);
  }

  const result = await prepareSettlementAuthorization({
    applicationId: app.id,
    partnerId: app.partner_id,
    receiptId: body.receipt_id,
    eligibleWallet: wallet,
    amountMicroUsdc: BigInt(String(body.amount_micro_usdc)),
    environment: app.environment === "production" ? "production" : "sandbox",
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
      expires_at: authorization.expiresAtIso,
      settlement_reference: authorization.settlementReference,
      signature: authorization.signature,
      typed_data: authorization.typedData,
      fee_quote: {
        base_amount_micro_usdc: feeQuote.baseAmountMicroUsdc.toString(),
        fee_micro_usdc: feeQuote.feeMicroUsdc.toString(),
        fee_active: feeQuote.feeActive,
        fee_label: feeQuote.feeLabel,
      },
    },
  });
}
