// FILE: app/api/demo/relying-party/config/route.ts

import { NextResponse } from "next/server";
import { resolveRelyingPartyPilotConfig } from "@/lib/demo/relyingPartyPilot";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(resolveRelyingPartyPilotConfig());
}
