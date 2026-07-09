// FILE: app/api/wallet/binding/challenge/route.ts
// Step 1: issue a one-time wallet binding challenge.

import { NextRequest, NextResponse } from "next/server";
import { createWalletBindingChallenge } from "@/lib/walletBinding/challenge";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { sui_address?: string };

  if (!body.sui_address?.trim()) {
    return NextResponse.json({ error: "sui_address required" }, { status: 400 });
  }

  try {
    const challenge = createWalletBindingChallenge(body.sui_address.trim());
    return NextResponse.json(challenge);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Challenge failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
