// FILE: app/api/launchpad/applications/[id]/settlement/activity/route.ts

import { NextRequest } from "next/server";
import { listSettlementActivity } from "@/lib/settlement/SettlementAuthorizationService";
import {
  requireSettlementPartnerAuth,
  settlementJson,
} from "@/lib/settlement/settlementApiHelpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireSettlementPartnerAuth(req, params.id);
  if (!auth.ok) return auth.response;

  const settlements = await listSettlementActivity(params.id, auth.partnerId);
  const sanitized = settlements.map((row) => ({
    id: row.id,
    status: row.status,
    amount_micro_usdc: row.amount_micro_usdc,
    eligible_wallet: row.eligible_wallet,
    recipient: row.recipient,
    transaction_hash: row.transaction_hash,
    receipt_commitment: row.receipt_commitment,
    settlement_reference: row.settlement_reference,
    issued_at: row.issued_at,
    expires_at: row.expires_at,
    confirmed_at: row.confirmed_at,
    chain_id: row.chain_id,
    testnet: true,
  }));

  return settlementJson({ ok: true, settlements: sanitized });
}
