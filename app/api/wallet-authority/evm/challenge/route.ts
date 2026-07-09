// FILE: app/api/wallet-authority/evm/challenge/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { createEvmBindingChallenge } from "@/lib/walletAuthority/service";

export async function POST(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = await req.json().catch(() => ({})) as {
    wallet_address?: string;
    chain_id?: number;
  };

  if (!body.wallet_address) {
    return NextResponse.json({ error: "wallet_address required" }, { status: 400 });
  }

  try {
    const challenge = await createEvmBindingChallenge({
      subjectId: session.session.suiAddress,
      walletAddress: body.wallet_address,
      chainId: body.chain_id ?? 1,
    });
    return NextResponse.json(challenge);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Challenge failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
