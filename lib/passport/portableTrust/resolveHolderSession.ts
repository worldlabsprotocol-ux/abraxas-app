// FILE: lib/passport/portableTrust/resolveHolderSession.ts

import type { NextRequest } from "next/server";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { resolveVerifiedWalletSubjectId } from "@/lib/auth/holderSubject/service";
import { requireBrowserSession, type BrowserSession } from "@/lib/auth/browserSession";

const SPOOF_QUERY_KEYS = ["sui", "subject", "subject_id", "holder", "holder_subject_id", "wallet", "wallet_address"] as const;

function querySpoofAttempt(req: NextRequest): boolean {
  for (const key of SPOOF_QUERY_KEYS) {
    const value = req.nextUrl.searchParams.get(key);
    if (value && value.trim().length > 0) return true;
  }
  return false;
}

/** Reject client-supplied identifiers that do not match the authenticated session. */
export function assertSessionBindingConsistent(session: BrowserSession): boolean {
  return session.authMethod === "solana_wallet"
    && Boolean(session.holderSubjectId)
    && isChainNeutralHolderSubjectId(session.holderSubjectId ?? "")
    && session.subjectId === session.holderSubjectId
    && !session.suiAddress
    && /^solana:[^:]+:[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(session.walletCaip10 ?? "");
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

  if (req.headers.has("x-abraxas-sui-address") || req.headers.has("x-abraxas-holder-subject")) {
    return { ok: false, error: "forbidden", message: "Wallet headers cannot identify a holder." };
  }

  const walletCaip10 = auth.session.walletCaip10;
  if (!walletCaip10) {
    return { ok: false, error: "forbidden", message: "Verified wallet binding required." };
  }
  try {
    const boundSubject = await resolveVerifiedWalletSubjectId(walletCaip10);
    if (boundSubject !== auth.session.subjectId) {
      return { ok: false, error: "forbidden", message: "Wallet is not bound to this Passport." };
    }
  } catch {
    return { ok: false, error: "forbidden", message: "Passport access is temporarily unavailable." };
  }

  return { ok: true, session: auth.session, subjectId: auth.session.subjectId };
}
