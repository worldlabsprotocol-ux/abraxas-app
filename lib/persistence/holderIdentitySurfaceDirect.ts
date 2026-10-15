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
import { countIdentityVerificationsForSessionKeys } from "./holderIdentityIdvLookup";

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
      idvApprovedRowsForLegacyWallet: 0,
      ambiguousLegacyConflict: false,
    });
  }

  const schema = await canonicalSchemaPresent();
  let legacyLink: string | null = null;
  let idvCount = 0;
  let idvApprovedCount = 0;
  let ambiguous = false;
  let identityLookupUnavailable = false;

  try {
    let suiLegacyLink: string | null = null;
    let subjectLegacyLink: string | null = null;

    if (session.suiAddress) {
      suiLegacyLink = await resolveLegacySubjectIdDirect(
        LEGACY_KIND_SUI_ADDRESS,
        session.suiAddress.toLowerCase(),
      );
    }

    if (!isChainNeutralHolderSubjectId(sessionSubjectId)) {
      subjectLegacyLink = await resolveLegacySubjectIdDirect(
        LEGACY_KIND_SUI_ADDRESS,
        sessionSubjectId.toLowerCase(),
      );
    }

    legacyLink = suiLegacyLink ?? subjectLegacyLink;

    if (suiLegacyLink && subjectLegacyLink && suiLegacyLink !== subjectLegacyLink) {
      ambiguous = true;
    }
  } catch {
    identityLookupUnavailable = true;
  }

  if (!identityLookupUnavailable) {
    const idvLookup = await countIdentityVerificationsForSessionKeys({
      sessionSubjectId,
      sessionHolderSubjectId,
      suiAddress: session.suiAddress,
      legacyLinkSubjectId: legacyLink,
    });
    if (!idvLookup.ok) {
      identityLookupUnavailable = true;
    } else {
      idvCount = idvLookup.count;
      idvApprovedCount = idvLookup.approvedCount;
    }
  }

  return resolveHolderIdentitySurface({
    sessionSubjectId,
    sessionHolderSubjectId,
    canonicalSchemaPresent: schema,
    legacyLinkSubjectId: legacyLink,
    idvRowsForLegacyWallet: identityLookupUnavailable ? 0 : idvCount,
    idvApprovedRowsForLegacyWallet: identityLookupUnavailable ? 0 : idvApprovedCount,
    ambiguousLegacyConflict: ambiguous,
    identityLookupUnavailable,
  });
}
