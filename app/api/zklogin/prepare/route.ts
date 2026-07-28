// FILE: app/api/zklogin/prepare/route.ts
// Server-side Sui epoch for zkLogin nonce — browser must never call Sui RPC during sign-in.

import { NextResponse } from "next/server";
import { fetchCurrentSuiEpoch } from "@/lib/sui/fetchCurrentEpoch";
import { getRpcDiagnostics } from "@/lib/sui/rpcDiagnostics";
import { ZKLOGIN_EPOCH_BUFFER, ZKLOGIN_PREPARE_API_VERSION } from "@/lib/sui/zklogin/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const diag = getRpcDiagnostics();

  try {
    const { epoch, source, detail } = await fetchCurrentSuiEpoch();

    return NextResponse.json({
      ok: true,
      api_version: ZKLOGIN_PREPARE_API_VERSION,
      epoch,
      max_epoch: epoch + ZKLOGIN_EPOCH_BUFFER,
      epoch_buffer: ZKLOGIN_EPOCH_BUFFER,
      epoch_source: source,
      epoch_detail: detail ?? null,
      ...diag,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Epoch fetch failed";
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
