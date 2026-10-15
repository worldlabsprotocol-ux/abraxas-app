// FILE: lib/passport/portableTrust/resolveHolderSession.ts

import type { NextRequest } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { requireBrowserSession, type BrowserSession } from "@/lib/auth/browserSession";

const SPOOF_QUERY_KEYS = ["sui", "subject", "subject_id", "holder", "wallet"] as const;

function querySpoofAttempt(req: NextRequest): boolean {
  for (const key of SPOOF_QUERY_KEYS) {
    const value = req.nextUrl.searchParams.get(key);
    if (value && value.trim().length > 0) return true;
  }
  return false;
}

function normalizeOptionalSui(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    return normalizeSuiAddress(value.trim());
  } catch {
    return null;
  }
}

/** Reject client-supplied identifiers that do not match the authenticated session. */
export function assertSessionBindingConsistent(session: BrowserSession): boolean {
  if (session.holderSubjectId && isChainNeutralHolderSubjectId(session.holderSubjectId)) {
    return session.subjectId === session.holderSubjectId;
  }
  if (session.suiAddress) {
    try {
      return session.subjectId === normalizeSuiAddress(session.suiAddress);
    } catch {
      return false;
    }
  }
  return Boolean(session.subjectId);
}

export async function resolveAuthenticatedHolderSession(
  req: NextRequest,
): Promise<
  | { ok: true; session: BrowserSession; subjectId: string }
  | { ok: false; error: "unauthorized" | "forbidden"; message: string }
> {
  if (querySpoofAttempt(req)) {
    return {
      ok: false,
      error: "forbidden",
      message: "Query parameters cannot identify a holder; use an authenticated session.",
    };
  }

  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return { ok: false, error: "unauthorized", message: auth.error };
  }

  if (!assertSessionBindingConsistent(auth.session)) {
    return { ok: false, error: "forbidden", message: "Session subject binding invalid." };
  }

  const spoofSui = normalizeOptionalSui(req.headers.get("x-abraxas-sui-address") ?? undefined);
  if (spoofSui && spoofSui !== auth.session.subjectId) {
    return { ok: false, error: "forbidden", message: "Wallet header does not match session." };
  }

  return { ok: true, session: auth.session, subjectId: auth.session.subjectId };
}
