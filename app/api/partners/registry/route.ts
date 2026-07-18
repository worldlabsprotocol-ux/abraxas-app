// FILE: app/api/partners/registry/route.ts
// Public relying party registry — DB external partners + static sandbox excluded.

import { NextResponse } from "next/server";
import { getSandboxPartners } from "@/lib/relyingPartners";
import { getExternalRelyingPartnersFromDb } from "@/lib/relyingPartnersDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const partners = await getExternalRelyingPartnersFromDb();
  return NextResponse.json({
    partners,
    count: partners.length,
    sandbox_count: getSandboxPartners().length,
    note: "External relying parties with public_listing_ok. Internal sandbox demos excluded.",
    updated_at: new Date().toISOString(),
  });
}
