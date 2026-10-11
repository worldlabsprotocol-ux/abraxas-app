// GET /api/demo/activation-readiness — read-only Demo Solana + Cielo activation truth.

import { NextRequest, NextResponse } from "next/server";
import { probeDemoActivationReadiness } from "@/lib/demo/demoActivationReadiness";
import { isPublicDemoHost } from "@/lib/product/demoRuntime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host");
  const onDemoHost = isPublicDemoHost(host);
  const report = await probeDemoActivationReadiness();

  return NextResponse.json({
    ok: true,
    host: host ?? null,
    on_demo_host: onDemoHost,
    ...report,
  });
}
