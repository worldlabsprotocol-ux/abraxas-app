// FILE: lib/idv/holderSubjectIdv.ts
// Canonical holder subject resolution for Abraxas Verify capture, review, and issuance.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { BrowserSession } from "@/lib/auth/browserSession";
import { resolveSessionHolderSubjectId } from "@/lib/auth/sessionSubject";
import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";
import { normalizeHolderSubjectKey } from "@/lib/idv/holderIdentityRef";
import { chainNeutralIdvDocumentSchemaReady } from "@/lib/persistence/chainNeutralSchemaReady";

export class HolderSubjectResolutionError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "HolderSubjectResolutionError";
  }
}

/** Authoritative holder key from an authenticated browser session (never a raw wallet address). */
export function resolveHolderSubjectFromBrowserSession(session: BrowserSession): string {
  const resolved = resolveSessionHolderSubjectId(session);
  if (!resolved) {
    throw new HolderSubjectResolutionError("Sign in required", "session_subject_missing");
  }
  return normalizeHolderSubjectKey(resolved);
}

/** Reject attempted subject substitution in capture/upload bodies. */
export function assertSessionOwnsRequestedSubject(
  session: BrowserSession,
  requested: string | null | undefined,
): void {
  if (!requested?.trim()) return;
  const sessionSubject = resolveSessionHolderSubjectId(session);
  if (!sessionSubject) {
    throw new HolderSubjectResolutionError("Sign in required", "session_subject_missing");
  }
  const normalizedRequested = normalizeHolderSubjectKey(requested.trim());
  const normalizedSession = normalizeHolderSubjectKey(sessionSubject);
  if (normalizedRequested !== normalizedSession) {
    throw new HolderSubjectResolutionError("Forbidden", "subject_substitution");
  }
}

export type IdvDocumentSubjectColumns = {
  sui_address: string | null;
  holder_subject_id: string | null;
};

/** Maps canonical subject to legacy columns without encoding abx_hs as a Sui address. */
export function idvDocumentSubjectColumns(subjectKey: string): IdvDocumentSubjectColumns {
  const key = normalizeHolderSubjectKey(subjectKey);
  if (isChainNeutralHolderSubjectId(key)) {
    return { sui_address: null, holder_subject_id: key };
  }
  return { sui_address: normalizeSuiAddress(key), holder_subject_id: null };
}

/** PostgREST .or() filter for passport_documents / pending review lookups. */
export async function passportDocumentsSubjectOrFilter(subjectKey: string): Promise<string> {
  const key = normalizeHolderSubjectKey(subjectKey);
  if (isChainNeutralHolderSubjectId(key)) {
    if (!await chainNeutralIdvDocumentSchemaReady()) {
      throw new HolderSubjectResolutionError(
        "Chain-neutral identity document storage is not available",
        "chain_neutral_schema_unavailable",
      );
    }
    return `holder_subject_id.eq.${key}`;
  }
  return `sui_address.eq.${normalizeSuiAddress(key)}`;
}

/** Row anchor for identity_review_sessions / biometric assessments (NOT NULL legacy column safe). */
export function idvReviewSessionAnchor(subjectKey: string): {
  sui_address: string | null;
  holder_subject_id: string | null;
} {
  return idvDocumentSubjectColumns(subjectKey);
}

export function holderSubjectAuditLabel(subjectKey: string): string {
  const key = normalizeHolderSubjectKey(subjectKey);
  if (isChainNeutralHolderSubjectId(key)) {
    return `${key.slice(0, 12)}…${key.slice(-4)}`;
  }
  try {
    const sui = normalizeSuiAddress(key);
    return `${sui.slice(0, 8)}…${sui.slice(-4)}`;
  } catch {
    return "subject_unknown";
  }
}

/** Contact email for document queue: legacy zkLogin email or explicit wallet-holder contact. */
export function resolveCaptureContactEmail(input: {
  session: BrowserSession;
  zkLoginEmail?: string | null;
  contactEmailField?: string | null;
}): string | null {
  const fromZk = input.zkLoginEmail?.trim();
  if (fromZk?.includes("@")) return fromZk;

  const fromField = input.contactEmailField?.trim();
  if (fromField?.includes("@")) return fromField;

  const subject = resolveSessionHolderSubjectId(input.session);
  if (subject && isChainNeutralHolderSubjectId(subject)) {
    return null;
  }
  return null;
}

export const IDENTITY_PROCESSING_CONSENT_FIELD = "identity_processing_consent";

export function requireIdentityProcessingConsent(formData: FormData): boolean {
  const raw = formData.get(IDENTITY_PROCESSING_CONSENT_FIELD);
  return raw === "true" || raw === "1" || raw === "on";
}
