// FILE: app/api/wallet-authority/wallets/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { listHolderWalletViews } from "@/lib/walletAuthority/service";

export async function GET(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const wallets = await listHolderWalletViews(session.session.suiAddress);
  return NextResponse.json({
    wallets: wallets.map(w => ({
      id: w.id,
      chain: w.chain,
      chain_label: w.chainLabel,
      network: w.network,
      wallet_address: w.address,
      address_short: w.addressShort,
      binding_status: w.bindingStatus,
      binding_method: w.controlMethod,
      verified_at: w.verifiedAt,
      expires_at: w.expiresAt,
      control_status: w.controlStatus,
      control_status_label: w.controlStatusLabel,
      freshness_label: w.freshnessLabel,
    })),
  });
}
