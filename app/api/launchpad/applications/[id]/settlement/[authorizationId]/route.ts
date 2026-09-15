// FILE: app/api/launchpad/applications/[id]/settlement/[authorizationId]/route.ts

import { NextRequest } from "next/server";
import { getSettlementAuthorizationStatus } from "@/lib/settlement/SettlementAuthorizationService";
import {
  requireSettlementPartnerAuth,
  settlementError,
  settlementJson,
} from "@/lib/settlement/settlementApiHelpers";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string; authorizationId: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireSettlementPartnerAuth(req, params.id);
  if (!auth.ok) return auth.response;

  const authorization = await getSettlementAuthorizationStatus(
    params.id,
    auth.partnerId,
    params.authorizationId,
  );
  if (!authorization) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_not_found, 404);
  }

  return settlementJson({
    ok: true,
    authorization: {
      id: authorization.id,
      status: authorization.status,
      amount_micro_usdc: authorization.amount_micro_usdc,
      eligible_wallet: authorization.eligible_wallet,
      recipient: authorization.recipient,
      token_address: authorization.token_address,
      transaction_hash: authorization.transaction_hash,
      receipt_commitment: authorization.receipt_commitment,
      settlement_reference: authorization.settlement_reference,
      issued_at: authorization.issued_at,
      expires_at: authorization.expires_at,
      confirmed_at: authorization.confirmed_at,
      chain_id: authorization.chain_id,
      testnet: true,
    },
  });
}
