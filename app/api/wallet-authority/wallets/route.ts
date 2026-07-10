// FILE: app/api/wallet-authority/wallets/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { listSubjectWallets } from "@/lib/walletAuthority/service";

export async function GET(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const wallets = await listSubjectWallets(session.session.suiAddress);
  return NextResponse.json({
    wallets: wallets.map(w => ({
      id: w.id,
      chain: w.chain,
      chain_id: w.chain_id,
      wallet_address: w.wallet_address,
      binding_status: w.binding_status,
      binding_method: w.binding_method,
      verified_at: w.verified_at,
      revoked_at: w.revoked_at,
    })),
  });
}
