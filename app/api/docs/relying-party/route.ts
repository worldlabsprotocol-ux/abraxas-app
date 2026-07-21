// FILE: app/api/docs/relying-party/route.ts
// Machine-readable external relying party integration guide.

import { NextResponse } from "next/server";
import { getExternalRelyingPartyIntegrationGuide } from "@/lib/externalRelyingPartyIntegration";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getExternalRelyingPartyIntegrationGuide());
}
