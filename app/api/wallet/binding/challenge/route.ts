// FILE: app/api/wallet/binding/challenge/route.ts
// Step 1: issue a one-time wallet binding challenge (Supabase-backed).

import { NextRequest, NextResponse } from "next/server";
import { createSuiWalletBindingChallenge } from "@/lib/walletBinding/suiChallenge";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { sui_address?: string };

  if (!body.sui_address?.trim()) {
    return NextResponse.json({ error: "sui_address required" }, { status: 400 });
  }

  try {
    const challenge = await createSuiWalletBindingChallenge(body.sui_address.trim());
    return NextResponse.json(challenge);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Challenge failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
