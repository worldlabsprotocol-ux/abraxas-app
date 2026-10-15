// FILE: app/api/auth/zklogin/config/route.ts
// Public zkLogin readiness (no secrets). Replaces misleading NextAuth stub on ad-hoc paths.

import { NextResponse } from "next/server";
import { buildZkLoginPublicConfigStatus } from "@/lib/sui/zklogin/publicConfigStatus";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function GET() {
  const status = buildZkLoginPublicConfigStatus(process.env);
  return NextResponse.json(
    {
      /** Configuration env readiness only; see readiness.authentication_operational. */
      ok: status.readiness.configuration_ready,
      ...status,
    },
    { headers: NO_STORE },
  );
}
