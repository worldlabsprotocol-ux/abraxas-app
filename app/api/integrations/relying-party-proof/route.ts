// FILE: app/api/integrations/relying-party-proof/route.ts
// Public read-only status for external relying-party production gate.

import { NextResponse } from "next/server";
import { getExternalRpGateStatus } from "@/lib/relyingPartyProduction";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getExternalRpGateStatus(5);
  return NextResponse.json({
    gate_id: "unaffiliated-rp",
    ...status,
  });
}
