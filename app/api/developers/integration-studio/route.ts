// FILE: app/api/developers/integration-studio/route.ts
// Public catalog GET. Session-bound sandbox create POST via Launchpad provision.

import { NextRequest, NextResponse } from "next/server";
import {
  createStudioSandbox,
  isIntegrationStudioPathId,
  studioPackContract,
  studioPayloadLeaks,
  studioPublicCatalog,
  studioSnippetForPath,
} from "@/lib/partner/integrationStudio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const packId = req.nextUrl.searchParams.get("pack") ?? "age_21_retail";
  const pathParam = req.nextUrl.searchParams.get("path") ?? "hosted_partner_flow";

  if (!studioPackContract(packId)) {
    return NextResponse.json({ error: "unknown_pack" }, { status: 400 });
  }
  if (!isIntegrationStudioPathId(pathParam)) {
    return NextResponse.json({ error: "unknown_path" }, { status: 400 });
  }

  const body = {
    ...studioPublicCatalog({ packId, pathId: pathParam }),
    snippet: studioSnippetForPath(pathParam),
    access: "public",
    partner_session_required_for_provisioning: true,
  };

  const leaks = studioPayloadLeaks(body);
  if (leaks.length > 0) {
    return NextResponse.json({ error: "redacted" }, { status: 500 });
  }

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  return createStudioSandbox(req);
}
