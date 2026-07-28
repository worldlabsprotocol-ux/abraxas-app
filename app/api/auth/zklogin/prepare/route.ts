// FILE: app/api/auth/zklogin/prepare/route.ts
// Server-side Sui epoch for zkLogin nonce — never call RPC from the browser during sign-in.

import { NextResponse } from "next/server";
import { getSuiClient } from "@/lib/sui/client";
import { getRpcDiagnostics } from "@/lib/sui/rpcDiagnostics";

export const dynamic = "force-dynamic";

const EPOCH_BUFFER = 10;

export async function GET() {
  const diag = getRpcDiagnostics();

  try {
    const client = getSuiClient();
    const { epoch } = await client.getLatestSuiSystemState();
    const epochNum = Number(epoch);
    if (!Number.isFinite(epochNum)) {
      throw new Error(`Invalid epoch from RPC: ${String(epoch)}`);
    }

    return NextResponse.json({
      ok: true,
      epoch: epochNum,
      max_epoch: epochNum + EPOCH_BUFFER,
      epoch_buffer: EPOCH_BUFFER,
      ...diag,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "RPC request failed";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        phase: "sui_epoch_fetch",
        ...diag,
      },
      { status: 503 },
    );
  }
}
