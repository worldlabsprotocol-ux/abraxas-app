// FILE: app/api/launchpad/public/settlement/authorize/route.ts
// Browser session settlement authorization for hosted Arc demo.

import { NextRequest } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { getLaunchpadApplicationBySlug } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { prepareSettlementAuthorization } from "@/lib/settlement/SettlementAuthorizationService";
import { settlementError, settlementJson } from "@/lib/settlement/settlementApiHelpers";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import { checkSettlementRateLimit } from "@/lib/settlement/settlementRateLimit";
import { parseUsdcAmountMicro } from "@/lib/settlement/usdcAmount";
import {
  assertReceiptSubjectMatchesSession,
  getCanonicalEvmWalletForSubject,
} from "@/lib/settlement/walletOwnership.server";

export const dynamic = "force-dynamic";

const ROUTE = "/api/launchpad/public/settlement/authorize";

export async function POST(req: NextRequest) {
  const rateLimited = checkSettlementRateLimit(req, ROUTE, 20);
  if (!rateLimited.allowed) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.rate_limited, 429);
  }

  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.unauthorized, session.status);
  }

  let body: {
    app?: string;
    receipt_id?: string;
    amount_micro_usdc?: string | number;
    idempotency_key?: string;
    return_url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400, "Invalid JSON");
  }

  if (!body.app || !body.receipt_id || body.amount_micro_usdc === undefined) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400);
  }

  const amountParsed = parseUsdcAmountMicro(body.amount_micro_usdc);
  if (!amountParsed.ok) {
    return settlementError(amountParsed.code, 400);
  }

  const app = await getLaunchpadApplicationBySlug(body.app);
  if (!app || app.status !== "active") {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.application_not_found, 404);
  }

  if (app.environment !== "sandbox") {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.environment_mismatch, 403);
  }

  const subjectMatch = await assertReceiptSubjectMatchesSession({
    receiptId: body.receipt_id,
    subjectId: session.session.suiAddress,
  });
  if (!subjectMatch.ok) {
    return settlementError(subjectMatch.code, 403);
  }

  const canonicalWallet = await getCanonicalEvmWalletForSubject(session.session.suiAddress);
  if (!canonicalWallet) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.wallet_mismatch, 403);
  }

  const result = await prepareSettlementAuthorization({
    applicationId: app.id,
    partnerId: app.partner_id,
    receiptId: body.receipt_id,
    eligibleWallet: canonicalWallet,
    amountMicroUsdc: amountParsed.amountMicroUsdc,
    environment: "sandbox",
    subjectId: session.session.suiAddress,
    idempotencyKey: body.idempotency_key,
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
      contract_address: authorization.typedData.domain.verifyingContract,
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
