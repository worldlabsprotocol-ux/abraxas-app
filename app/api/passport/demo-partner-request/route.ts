// FILE: app/api/passport/demo-partner-request/route.ts
// Pilot: create a test verification request for the signed-in holder (no partner key in browser).

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";

export async function POST(req: NextRequest) {
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.error === "forbidden" ? 403 : 401 });
  }

  // The legacy consent evaluator still requires a Sui subject. Do not create
  // a Solana-bound request until that evaluator can complete it securely.
  return NextResponse.json({ error: "This demo is unavailable for Solana Passport right now." }, { status: 503 });
}
