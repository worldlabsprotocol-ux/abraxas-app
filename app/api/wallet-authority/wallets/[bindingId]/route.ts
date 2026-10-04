// FILE: app/api/wallet-authority/wallets/[bindingId]/route.ts
// Holder-scoped wallet unlink — revokes binding and wallet-control claim.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { revokeWalletBinding } from "@/lib/walletAuthority/service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bindingId: string }> },
) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { bindingId } = await params;
  if (!bindingId) {
    return NextResponse.json({ error: "binding_id required" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as { reason?: string };
  const ok = await revokeWalletBinding({
    subjectId: session.session.suiAddress,
    bindingId,
    reason: body.reason ?? "holder_unlinked",
  });

  if (!ok) {
    return NextResponse.json({ error: "Wallet not found or already unlinked" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, binding_id: bindingId, status: "revoked" });
}
