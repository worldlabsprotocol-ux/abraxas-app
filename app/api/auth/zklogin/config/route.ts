// FILE: app/api/auth/zklogin/config/route.ts
// Public zkLogin readiness (no secrets). Replaces misleading NextAuth stub on ad-hoc paths.

import { NextResponse } from "next/server";
import {
  buildZkLoginPublicConfigStatus,
  zkLoginProductionReady,
} from "@/lib/sui/zklogin/publicConfigStatus";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function GET() {
  const status = buildZkLoginPublicConfigStatus(process.env);
  return NextResponse.json(
    {
      ok: zkLoginProductionReady(status),
      ...status,
    },
    { headers: NO_STORE },
  );
}
