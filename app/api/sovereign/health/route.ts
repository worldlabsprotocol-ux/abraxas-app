// FILE: app/api/sovereign/health/route.ts
// Persistent sovereign staging health — Postgres, schema, evidence custody (no secrets).

import { NextResponse } from "next/server";
import { buildSovereignHealthReport } from "@/lib/sovereignRuntime/sovereignHealth";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" };

export async function GET() {
  const report = await buildSovereignHealthReport(process.env);
  const status = report.tier === "STAGING_READY" ? 200 : report.tier === "DEGRADED" ? 503 : 503;
  return NextResponse.json(report, { status, headers: NO_STORE });
}
