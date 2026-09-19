// FILE: app/api/wallet-standard/challenge/route.ts
// Issue a domain-bound wallet binding challenge. No address. No transaction.

import { NextRequest, NextResponse } from "next/server";
import { issueWalletStandardChallenge } from "@/lib/partner/walletStandard/challenge";
import { assertNoSensitiveWalletClientKeys } from "@/lib/partner/walletStandard/safety";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    partner_id?: string;
    action_contract_nonce?: string;
    origin?: string;
  };
  const origin = (body.origin ?? req.headers.get("origin") ?? "").trim();
  const issued = issueWalletStandardChallenge({
    origin,
    partnerId: String(body.partner_id ?? ""),
    actionContractNonce: String(body.action_contract_nonce ?? ""),
  });
  if ("ok" in issued) {
    return NextResponse.json({ ok: false, status: issued.status, binding_ref: null, expires_at: null }, { status: 400 });
  }
  if (assertNoSensitiveWalletClientKeys(issued).length > 0) {
    return NextResponse.json({ ok: false, status: "invalid", binding_ref: null, expires_at: null }, { status: 500 });
  }
  return NextResponse.json(issued);
}
