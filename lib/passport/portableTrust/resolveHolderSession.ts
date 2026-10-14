// FILE: lib/passport/portableTrust/resolveHolderSession.ts

import type { NextRequest } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { resolveBrowserSession } from "@/lib/auth/browserSession";

export async function resolveHolderSessionSubject(
  req: NextRequest,
): Promise<{ subjectId: string } | { error: "unauthorized" | "forbidden" }> {
  const session = await resolveBrowserSession(req);
  const querySui = req.nextUrl.searchParams.get("sui");
  if (session) {
    if (querySui && normalizeSuiAddress(querySui) !== session.subjectId) {
      return { error: "forbidden" };
    }
    return { subjectId: session.subjectId };
  }
  if (querySui) {
    return { subjectId: normalizeSuiAddress(querySui) };
  }
  return { error: "unauthorized" };
}
