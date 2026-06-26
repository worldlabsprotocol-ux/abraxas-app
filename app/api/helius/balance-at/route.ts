// FILE: app/api/helius/balance-at/route.ts
// Wraps Helius's balance-at endpoint, verified against the real docs
// at helius.dev/docs/wallet-api/balance-at, not guessed. This is
// HISTORICAL balance at a specific past point in time (needs a mint
// and exactly one of time/datetime/slot), not "what's my balance
// right now." If you want a simple current-balance widget on the
// Dashboard, that's a different, simpler Helius endpoint
// (getBalance / the DAS balances endpoint), tell me and I'll build
// that one too, it's a smaller lift than this one.
import { NextRequest, NextResponse } from "next/server";

const SOL_PSEUDO_MINT = "So11111111111111111111111111111111111111111";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const mint = req.nextUrl.searchParams.get("mint") ?? SOL_PSEUDO_MINT;
  const time = req.nextUrl.searchParams.get("time");
  const datetime = req.nextUrl.searchParams.get("datetime");
  const slot = req.nextUrl.searchParams.get("slot");

  if (!wallet) {
    return NextResponse.json({ error: "wallet address required" }, { status: 400 });
  }
  const pointInTimeParams = [time, datetime, slot].filter(Boolean);
  if (pointInTimeParams.length !== 1) {
    return NextResponse.json(
      { error: "Provide exactly one of time, datetime, or slot" },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({ mint, "api-key": process.env.HELIUS_API_KEY! });
  if (time) params.set("time", time);
  if (datetime) params.set("datetime", datetime);
  if (slot) params.set("slot", slot);

  try {
    const res = await fetch(
      `https://api.helius.xyz/v1/wallet/${wallet}/balance-at?${params.toString()}`
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? "Helius request failed" }, { status: res.status });
    }
    // asOf: null means the wallet had no activity for this token by
    // that point in time, that's a real zero balance, not an error.
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Could not reach Helius" }, { status: 502 });
  }
}
