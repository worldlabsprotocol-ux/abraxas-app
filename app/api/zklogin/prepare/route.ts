// FILE: app/api/zklogin/prepare/route.ts
// Server-side Sui epoch for zkLogin nonce — browser must never call Sui RPC during sign-in.

import { NextResponse } from "next/server";
import { getSuiClient } from "@/lib/sui/client";
import { getRpcDiagnostics } from "@/lib/sui/rpcDiagnostics";
import { ZKLOGIN_EPOCH_BUFFER, ZKLOGIN_PREPARE_API_VERSION } from "@/lib/sui/zklogin/constants";

export const dynamic = "force-dynamic";

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
      api_version: ZKLOGIN_PREPARE_API_VERSION,
      epoch: epochNum,
      max_epoch: epochNum + ZKLOGIN_EPOCH_BUFFER,
      epoch_buffer: ZKLOGIN_EPOCH_BUFFER,
      ...diag,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "RPC request failed";
    return NextResponse.json(
      {
        ok: false,
        api_version: ZKLOGIN_PREPARE_API_VERSION,
        error: message,
        phase: "sui_epoch_fetch",
        ...diag,
      },
      { status: 503 },
    );
  }
}
