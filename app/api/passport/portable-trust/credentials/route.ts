// FILE: app/api/passport/portable-trust/credentials/route.ts

import { NextRequest, NextResponse } from "next/server";
import { listHolderPortableCredentials } from "@/lib/passport/portableTrust";
import { resolveHolderSessionSubject } from "@/lib/passport/portableTrust/resolveHolderSession";

export async function GET(req: NextRequest) {
  const session = await resolveHolderSessionSubject(req);
  if ("error" in session) {
    return NextResponse.json(
      { error: session.error === "forbidden" ? "Session mismatch" : "Sign in required" },
      { status: session.error === "forbidden" ? 403 : 401 },
    );
  }
  try {
    const credentials = await listHolderPortableCredentials({ subjectId: session.subjectId });
    return NextResponse.json({ credentials, build: 565 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Credentials unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
