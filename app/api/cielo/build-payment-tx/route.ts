// FILE: app/api/cielo/build-payment-tx/route.ts
// Build Cielo payment transaction server-side (coin selection needs RPC).

import { NextRequest, NextResponse } from "next/server";
import { getSuiClient } from "@/lib/sui/serverClient";
import { buildCieloPaymentTransaction } from "@/lib/cielo/buildPaymentTransaction";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    sender_address?: string;
    treasury_address?: string;
    amount_usdc?: number;
    usdc_coin_type?: string | null;
  };

  if (!body.sender_address || !body.treasury_address || !body.amount_usdc) {
    return NextResponse.json({ error: "sender_address, treasury_address, amount_usdc required" }, { status: 400 });
  }

  try {
    const client = getSuiClient();
    const tx = await buildCieloPaymentTransaction(client, {
      sender: body.sender_address,
      treasury: body.treasury_address,
      amountUsdc: body.amount_usdc,
      usdcCoinType: body.usdc_coin_type ?? null,
    });
    tx.setSender(body.sender_address);
    const bytes = await tx.build({ client });
    return NextResponse.json({
      ok: true,
      transaction_block: Buffer.from(bytes).toString("base64"),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Build failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
