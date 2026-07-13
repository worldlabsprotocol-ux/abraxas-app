// FILE: app/api/wallet-authority/wallets/[bindingId]/revoke/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { revokeWalletBinding } from "@/lib/walletAuthority/service";

export async function POST(
  req: NextRequest,
  { params }: { params: { bindingId: string } },
) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = body.reason?.trim() || "user_revoked_binding";

  const result = await revokeWalletBinding({
    subjectId: session.session.suiAddress,
    bindingId: params.bindingId,
    reason,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Binding not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    binding_id: params.bindingId,
    revoked_claim_ids: result.revoked_claim_ids,
  });
}
