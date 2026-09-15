// FILE: app/api/launchpad/applications/[id]/settlement/confirm/route.ts

import { NextRequest } from "next/server";
import { recordSettlementConfirmation } from "@/lib/settlement/SettlementAuthorizationService";
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
    authorization_id?: string;
    transaction_hash?: string;
  };
  try {
    body = await req.json();
  } catch {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400, "Invalid JSON");
  }

  if (!body.authorization_id || !body.transaction_hash) {
    return settlementError(SETTLEMENT_PUBLIC_ERRORS.authorization_invalid, 400);
  }

  const result = await recordSettlementConfirmation({
    applicationId: params.id,
    partnerId: auth.partnerId,
    authorizationId: body.authorization_id,
    transactionHash: body.transaction_hash,
  });

  if (!result.ok) {
    const status = result.code === SETTLEMENT_PUBLIC_ERRORS.duplicate_confirmation ? 409 : 400;
    return settlementError(result.code, status);
  }

  return settlementJson({ ok: true, status: "confirmed" });
}
