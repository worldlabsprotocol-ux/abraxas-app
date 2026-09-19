// FILE: app/api/judge-demo/environment/route.ts
// Retired judge-demo identity. Always 404. DEMO is the public product.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "not_found" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
