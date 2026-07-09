// FILE: app/api/wallet-authority/evm/bind/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { confirmEvmBinding } from "@/lib/walletAuthority/service";

export async function POST(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = await req.json().catch(() => ({})) as {
    challenge_id?: string;
    signature?: string;
  };

  if (!body.challenge_id || !body.signature) {
    return NextResponse.json({ error: "challenge_id and signature required" }, { status: 400 });
  }

  try {
    const binding = await confirmEvmBinding({
      subjectId: session.session.suiAddress,
      challengeId: body.challenge_id,
      signature: body.signature,
    });
    return NextResponse.json({
      ok: true,
      binding_id: binding.id,
      wallet_address: binding.wallet_address,
      chain: binding.chain,
      binding_status: binding.binding_status,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Bind failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
