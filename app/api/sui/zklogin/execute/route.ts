// FILE: app/api/sui/zklogin/execute/route.ts
// Execute a signed zkLogin transaction server-side (browser cannot call Sui RPC).

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    transaction_block?: string;
    signature?: string;
  };

  if (!body.transaction_block || !body.signature) {
    return NextResponse.json(
      { error: "transaction_block and signature required" },
      { status: 400 },
    );
  }

  try {
    const { getSuiClient } = await import("@/lib/sui/serverClient");
    const client = getSuiClient();
    const result = await client.executeTransactionBlock({
      transactionBlock: body.transaction_block,
      signature: body.signature,
      options: { showEffects: true },
    });

    const status = result.effects?.status?.status ?? "unknown";
    if (status !== "success") {
      return NextResponse.json(
        { error: result.effects?.status?.error ?? "Transaction failed on Sui" },
        { status: 422 },
      );
    }

    if (!result.digest) {
      return NextResponse.json({ error: "Transaction digest missing" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, digest: result.digest, effectsStatus: status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Execute failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
