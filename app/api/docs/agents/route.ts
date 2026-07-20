// FILE: app/api/docs/agents/route.ts
// Machine-readable AI agent integration guide.

import { NextResponse } from "next/server";
import { getAgentVerificationGuide } from "@/lib/agentVerification";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAgentVerificationGuide());
}
