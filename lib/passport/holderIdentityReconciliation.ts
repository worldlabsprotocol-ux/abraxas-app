// FILE: lib/passport/holderIdentityReconciliation.ts
// Build #579: deterministic legacy → canonical holder subject reconciliation (plan only; no Production execution).

import { isChainNeutralHolderSubjectId } from "@/lib/auth/holderSubject/subjectId";

export const LEGACY_KIND_SUI_ADDRESS = "sui_address" as const;
export const LEGACY_KIND_VERIFIED_WALLET_CAIP10 = "verified_wallet_caip10" as const;
export const LEGACY_KIND_ZKLOGIN_OAUTH_SUB = "zklogin_oauth_sub" as const;

export type LegacyAnchorKind =
  | typeof LEGACY_KIND_SUI_ADDRESS
  | typeof LEGACY_KIND_VERIFIED_WALLET_CAIP10
  | typeof LEGACY_KIND_ZKLOGIN_OAUTH_SUB;

export type LegacyIdentityAnchor = {
  kind: LegacyAnchorKind;
  /** Normalized legacy key (lowercase Sui address, exact caip10, oauth sub). */
  key: string;
  /** Human-readable evidence source for operator review (no PII beyond the anchor key). */
  evidence: string;
};

export type ReconciliationPlanAction =
  | "skip_already_linked"
  | "link_existing_canonical_subject"
  | "create_canonical_subject_and_link"
  | "block_ambiguous"
  | "block_unverified_wallet";

export type ReconciliationPlanRow = {
  anchor: LegacyIdentityAnchor;
  action: ReconciliationPlanAction;
  targetSubjectId?: string;
  reason: string;
};

export type ReconciliationPlanResult =
  | { ok: true; rows: ReconciliationPlanRow[] }
  | {
      ok: false;
      code: "ambiguous_legacy_mapping" | "conflicting_canonical_subjects" | "invalid_anchor";
      detail: string;
    };

function anchorMapKey(kind: LegacyAnchorKind, key: string): string {
  return `${kind}:${key.trim().toLowerCase()}`;
}

function normalizeAnchor(anchor: LegacyIdentityAnchor): LegacyIdentityAnchor | null {
  const key = anchor.key.trim();
  if (!key) return null;
  if (anchor.kind === LEGACY_KIND_SUI_ADDRESS && !/^0x[0-9a-f]{64}$/i.test(key)) {
    return null;
  }
  if (anchor.kind === LEGACY_KIND_VERIFIED_WALLET_CAIP10 && !key.includes(":")) {
    return null;
  }
  return { ...anchor, key: anchor.kind === LEGACY_KIND_SUI_ADDRESS ? key.toLowerCase() : key };
}

/** Groups authoritative anchors that must resolve to a single canonical subject. Fail closed on conflict. */
export function planLegacyIdentityBackfill(input: {
  anchors: LegacyIdentityAnchor[];
  /** Existing passport_holder_legacy_links (kind:key → subject_id). */
  existingLinks: ReadonlyMap<string, string>;
  /** Canonical subjects that already exist. */
  existingCanonicalSubjects: ReadonlySet<string>;
  /** When set, only link into this subject (session-bound dry run). */
  boundCanonicalSubjectId?: string | null;
}): ReconciliationPlanResult {
  const rows: ReconciliationPlanRow[] = [];
  const subjectByAnchor = new Map<string, string>();
  const canonicalTargets = new Set<string>();

  for (const raw of input.anchors) {
    const anchor = normalizeAnchor(raw);
    if (!anchor) {
      return { ok: false, code: "invalid_anchor", detail: "Legacy anchor key failed normalization." };
    }
    const mapKey = anchorMapKey(anchor.kind, anchor.key);
    const linked = input.existingLinks.get(mapKey);
    if (linked) {
      if (!isChainNeutralHolderSubjectId(linked)) {
        return { ok: false, code: "invalid_anchor", detail: "Existing legacy link points to non-canonical subject." };
      }
      subjectByAnchor.set(mapKey, linked);
      canonicalTargets.add(linked);
      rows.push({
        anchor,
        action: "skip_already_linked",
        targetSubjectId: linked,
        reason: "Legacy anchor already linked to canonical subject.",
      });
      continue;
    }

    if (anchor.kind === LEGACY_KIND_VERIFIED_WALLET_CAIP10 && !anchor.evidence.includes("verified")) {
      rows.push({
        anchor,
        action: "block_unverified_wallet",
        reason: "Wallet string alone is not authoritative; require verified wallet binding evidence.",
      });
      continue;
    }

    const bound = input.boundCanonicalSubjectId?.trim();
    if (bound && isChainNeutralHolderSubjectId(bound)) {
      rows.push({
        anchor,
        action: input.existingCanonicalSubjects.has(bound)
          ? "link_existing_canonical_subject"
          : "create_canonical_subject_and_link",
        targetSubjectId: bound,
        reason: "Bind legacy anchor to session canonical subject after operator approval.",
      });
      subjectByAnchor.set(mapKey, bound);
      canonicalTargets.add(bound);
      continue;
    }

    rows.push({
      anchor,
      action: "create_canonical_subject_and_link",
      reason: "No authoritative link yet; mint canonical subject and link under operator-controlled migration.",
    });
  }

  if (canonicalTargets.size > 1) {
    return {
      ok: false,
      code: "conflicting_canonical_subjects",
      detail: "Anchors in this batch resolve to more than one canonical subject.",
    };
  }

  const anchorEntries = Array.from(subjectByAnchor.entries());
  for (const [mapKey, subjectId] of anchorEntries) {
    for (const [otherKey, otherSubject] of anchorEntries) {
      if (mapKey !== otherKey && subjectId !== otherSubject) {
        return {
          ok: false,
          code: "ambiguous_legacy_mapping",
          detail: "Two legacy anchors map to different canonical subjects.",
        };
      }
    }
  }

  return { ok: true, rows };
}

export type HolderIdentitySurfaceState =
  | "legacy_holder_authenticated"
  | "canonical_subject_ready"
  | "reconciliation_operator_required"
  | "ambiguous_identity_blocked";

export type HolderIdentitySurfaceSnapshot = {
  state: HolderIdentitySurfaceState;
  headline: string;
  detail: string;
  operator_review_required: boolean;
};

export function resolveHolderIdentitySurface(input: {
  sessionSubjectId: string;
  sessionHolderSubjectId?: string | null;
  canonicalSchemaPresent: boolean;
  legacyLinkSubjectId: string | null;
  idvRowsForLegacyWallet: number;
  ambiguousLegacyConflict: boolean;
}): HolderIdentitySurfaceSnapshot {
  if (input.ambiguousLegacyConflict) {
    return {
      state: "ambiguous_identity_blocked",
      headline: "Identity reconciliation blocked",
      detail: "Conflicting legacy identity signals require operator review before reusable Passport issuance can continue.",
      operator_review_required: true,
    };
  }

  const canonicalFromSession =
    input.sessionHolderSubjectId && isChainNeutralHolderSubjectId(input.sessionHolderSubjectId)
      ? input.sessionHolderSubjectId
      : isChainNeutralHolderSubjectId(input.sessionSubjectId)
        ? input.sessionSubjectId
        : null;

  if (canonicalFromSession && input.canonicalSchemaPresent) {
    return {
      state: "canonical_subject_ready",
      headline: "Canonical holder subject active",
      detail: "Your Passport session uses a chain-neutral holder subject for verification and reusable credentials.",
      operator_review_required: false,
    };
  }

  if (input.legacyLinkSubjectId && isChainNeutralHolderSubjectId(input.legacyLinkSubjectId)) {
    return {
      state: "canonical_subject_ready",
      headline: "Canonical holder subject linked",
      detail: "Your legacy sign-in is linked to a canonical holder subject.",
      operator_review_required: false,
    };
  }

  if (!input.canonicalSchemaPresent) {
    return {
      state: "legacy_holder_authenticated",
      headline: "Legacy Passport account",
      detail: "Production is completing holder subject migration. Your existing verification remains on this account until canonical subjects are enabled.",
      operator_review_required: false,
    };
  }

  if (input.idvRowsForLegacyWallet > 0 && !canonicalFromSession) {
    return {
      state: "reconciliation_operator_required",
      headline: "Identity reconciliation required",
      detail: "Verified identity records exist for this account but no canonical holder subject is linked yet. Operator review will complete reconciliation before issuer-backed credentials activate.",
      operator_review_required: true,
    };
  }

  return {
    state: "legacy_holder_authenticated",
    headline: "Legacy Passport account",
    detail: "Sign in is active. Complete verification to prepare for canonical holder subject linking when Production migration finishes.",
    operator_review_required: false,
  };
}
