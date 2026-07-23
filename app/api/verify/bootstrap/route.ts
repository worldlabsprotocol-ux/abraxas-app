// FILE: app/api/verify/bootstrap/route.ts
// Production bootstrap — diagnostics (GET) + seed lot inventory (POST with CRON_SECRET).

import { NextRequest, NextResponse } from "next/server";
import {
  getVerificationBootstrapReport,
  seedLotInventory,
} from "@/lib/verification/bootstrapVerificationLayer";
import { runE2eVerificationCheck } from "@/lib/authenticationProof/runE2eVerificationCheck";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getVerificationBootstrapReport();
  return NextResponse.json(report);
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized — pass Authorization: Bearer CRON_SECRET" }, { status: 401 });
  }

  const seed = await seedLotInventory();
  const report = await getVerificationBootstrapReport();
  const e2e = await runE2eVerificationCheck();

  return NextResponse.json({
    seeded: seed,
    report,
    e2e: {
      ok: e2e.ok,
      summary: e2e.summary,
      steps: e2e.steps,
    },
    ready: report.ready,
  });
}
