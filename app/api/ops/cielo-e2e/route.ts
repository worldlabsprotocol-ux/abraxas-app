// FILE: app/api/ops/cielo-e2e/route.ts
// Cielo revenue loop health check for ops dashboard and CLI.

import { NextResponse } from "next/server";
import { runCieloE2eChecks } from "@/lib/cieloE2eCheck";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runCieloE2eChecks();
  return NextResponse.json({
    ok: result.failCount === 0,
    ...result,
    flow: [
      "1. Guest books on /terminal#featured-asset",
      "2. Operator confirms at /admin/cielo",
      "3. Guest pays at /cielo/pay (zkLogin one-click)",
      "4. Receipt at /cielo/receipt · metrics at /metrics",
    ],
    updatedAt: new Date().toISOString(),
  });
}
