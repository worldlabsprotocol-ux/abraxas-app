// FILE: app/api/idv/biometric/status/route.ts
// Health for Abraxas Verify biometric engine (face match, liveness, auto-decision).

import { NextResponse } from "next/server";
import { getBiometricEngineHealth } from "@/lib/idv/biometric/biometricStatus";
import { getIdvProvider } from "@/lib/idv/idvProvider";

export const dynamic = "force-dynamic";

export async function GET() {
  const engine = getBiometricEngineHealth();
  const provider = getIdvProvider();

  return NextResponse.json({
    provider,
    abraxas_independent: provider === "manual",
    ...engine,
    endpoints: {
      capture: engine.capture_endpoint,
      independent_idv: "/api/idv/independent/status",
      admin_review: "/admin/identity",
    },
  });
}
