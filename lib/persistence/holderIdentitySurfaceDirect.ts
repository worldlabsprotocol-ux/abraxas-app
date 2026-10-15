// FILE: lib/persistence/holderIdentitySurfaceDirect.ts

import "server-only";

import type { BrowserSession } from "@/lib/auth/browserSession";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import {
  LEGACY_KIND_SUI_ADDRESS,
  resolveHolderIdentitySurface,
  type HolderIdentitySurfaceSnapshot,
} from "@/lib/passport/holderIdentityReconciliation";
import { isPassportDirectPostgresEnabled } from "./env";
import { queryAbraxasPg } from "./pgPool";
import { resolveLegacySubjectIdDirect } from "./holderSubjectDirect";

async function canonicalSchemaPresent(): Promise<boolean> {
  try {
    const { rows } = await queryAbraxasPg<{ exists: boolean }>(
      `select exists (
         select 1 from information_schema.tables
         where table_schema = 'public' and table_name = 'passport_holder_subjects'
       ) as exists`,
    );
    return Boolean(rows[0]?.exists);
  } catch {
    return false;
  }
}

export async function loadHolderIdentitySurfaceForSession(
  session: BrowserSession,
): Promise<HolderIdentitySurfaceSnapshot> {
  const sessionSubjectId = session.subjectId;
  const sessionHolderSubjectId = session.holderSubjectId ?? null;

  if (!isPassportDirectPostgresEnabled()) {
    return resolveHolderIdentitySurface({
      sessionSubjectId,
      sessionHolderSubjectId,
      canonicalSchemaPresent: false,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 0,
      ambiguousLegacyConflict: false,
    });
  }

  const schema = await canonicalSchemaPresent();
  let legacyLink: string | null = null;
  let idvCount = 0;
  let ambiguous = false;

  if (session.suiAddress) {
    legacyLink = await resolveLegacySubjectIdDirect(LEGACY_KIND_SUI_ADDRESS, session.suiAddress.toLowerCase());
  }

  if (!legacyLink && !isChainNeutralHolderSubjectId(sessionSubjectId)) {
    legacyLink = await resolveLegacySubjectIdDirect(LEGACY_KIND_SUI_ADDRESS, sessionSubjectId.toLowerCase());
  }

  try {
    const lookupKey = isChainNeutralHolderSubjectId(sessionSubjectId)
      ? session.suiAddress ?? sessionSubjectId
      : sessionSubjectId;
    const { rows } = await queryAbraxasPg<{ c: number }>(
      `select count(*)::int as c from public.identity_verifications
       where lower(wallet_address) = lower($1) or holder_subject_id = $1`,
      [lookupKey],
    );
    idvCount = rows[0]?.c ?? 0;

    if (session.suiAddress) {
      const alt = await resolveLegacySubjectIdDirect(LEGACY_KIND_SUI_ADDRESS, session.suiAddress.toLowerCase());
      if (alt && legacyLink && alt !== legacyLink) ambiguous = true;
    }
  } catch {
    idvCount = 0;
  }

  return resolveHolderIdentitySurface({
    sessionSubjectId,
    sessionHolderSubjectId,
    canonicalSchemaPresent: schema,
    legacyLinkSubjectId: legacyLink,
    idvRowsForLegacyWallet: idvCount,
    ambiguousLegacyConflict: ambiguous,
  });
}
