// FILE: app/api/wallet-standard/bind/route.ts
// Verify a Wallet Standard message signature. Return an opaque binding ref only.

import { NextRequest, NextResponse } from "next/server";
import { bindWalletStandard } from "@/lib/partner/walletStandard/bind";
import { assertNoSensitiveWalletClientKeys } from "@/lib/partner/walletStandard/safety";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    challenge_id?: string;
    partner_id?: string;
    action_contract_nonce?: string;
    signature?: string;
    public_key?: string;
    origin?: string;
  };
  const origin = (body.origin ?? req.headers.get("origin") ?? "").trim();
  const bound = bindWalletStandard({
    challengeId: String(body.challenge_id ?? ""),
    origin,
    partnerId: String(body.partner_id ?? ""),
    actionContractNonce: String(body.action_contract_nonce ?? ""),
    signature: String(body.signature ?? ""),
    publicKey: String(body.public_key ?? ""),
  });
  const visible = {
    ok: bound.ok,
    status: bound.status,
    binding_ref: bound.binding_ref,
    expires_at: bound.expires_at,
  };
  if (assertNoSensitiveWalletClientKeys(visible).length > 0) {
    return NextResponse.json({ ok: false, status: "invalid", binding_ref: null, expires_at: null }, { status: 500 });
  }
  return NextResponse.json(visible, { status: bound.ok ? 200 : 400 });
}
