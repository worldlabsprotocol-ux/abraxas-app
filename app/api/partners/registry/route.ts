// FILE: app/api/partners/registry/route.ts
// Public relying party registry — external partners running Abraxas verification.

import { NextResponse } from "next/server";
import { getExternalRelyingPartners } from "@/lib/relyingPartners";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    partners: getExternalRelyingPartners(),
    count: getExternalRelyingPartners().length,
    updated_at: new Date().toISOString(),
  });
}
