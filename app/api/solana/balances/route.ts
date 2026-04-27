import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

/**
 * GET /api/solana/balances?wallet=<base58>
 *
 * Fetches SOL balance and $ABRA token balance server-side.
 * Uses SOLANA_RPC_URL (server-only env) — avoids client-side rate limits.
 * Falls back to public RPC only if env is missing.
 */

const RPC =
  (process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "")
    .trim() || "https://api.mainnet-beta.solana.com";

const ABRA_MINT =
  (process.env.NEXT_PUBLIC_ABRA_MINT || process.env.NEXT_PUBLIC_ABRA_CA || "")
    .trim();

const TOKEN_PROGRAMS = [
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",   // SPL Token
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",   // Token-2022
];

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ ok: false, error: "wallet param required" }, { status: 400 });
  }

  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(wallet);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid wallet address" }, { status: 400 });
  }

  const connection = new Connection(RPC, "confirmed");

  try {
    // SOL balance
    const lamports = await connection.getBalance(pubkey);
    const sol = lamports / LAMPORTS_PER_SOL;

    // ABRA balance — try both token programs
    let abra = 0;
    if (ABRA_MINT) {
      for (const programId of TOKEN_PROGRAMS) {
        try {
          const resp = await connection.getParsedTokenAccountsByOwner(pubkey, {
            programId: new PublicKey(programId),
          });
          const match = resp.value.find(
            (a) => a.account.data.parsed?.info?.mint === ABRA_MINT
          );
          if (match) {
            const ui = match.account.data.parsed.info.tokenAmount?.uiAmount;
            abra = typeof ui === "number" ? ui : 0;
            break;
          }
        } catch {
          // continue to next program
        }
      }
    }

    return NextResponse.json({ ok: true, sol, abra, rpc: RPC.split("?")[0] });
  } catch (err: any) {
    console.error("[balances] fetch error:", err?.message ?? err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch balances", detail: err?.message },
      { status: 500 }
    );
  }
}
