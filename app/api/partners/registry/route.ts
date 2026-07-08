// FILE: app/api/partners/registry/route.ts
// Public relying party registry — external partners only (excludes internal sandbox).

import { NextResponse } from "next/server";
import { getExternalRelyingPartners } from "@/lib/relyingPartners";

export const dynamic = "force-dynamic";

export async function GET() {
  const partners = getExternalRelyingPartners();
  return NextResponse.json({
    partners,
    count: partners.length,
    note: "Internal sandbox demos are not included in this count.",
    updated_at: new Date().toISOString(),
  });
}
