import {
  TRUST_ANCHOR_BUNDLE_DOCUMENT,
  TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION,
  type TrustAnchorBundleV1,
} from "./types";
import { publicEd25519JwkFingerprint } from "./fingerprint";

export function validateTrustAnchorBundle(
  bundle: TrustAnchorBundleV1,
): { ok: true } | { ok: false; reason: string } {
  if (bundle.document !== TRUST_ANCHOR_BUNDLE_DOCUMENT) {
    return { ok: false, reason: "invalid_trust_bundle_document" };
  }
  if (bundle.schema_version !== TRUST_ANCHOR_BUNDLE_SCHEMA_VERSION) {
    return { ok: false, reason: "unsupported_trust_bundle_schema" };
  }
  if (!bundle.anchor_key_id?.trim()) {
    return { ok: false, reason: "anchor_key_id_missing" };
  }
  const fp = publicEd25519JwkFingerprint(bundle.public_jwk);
  if (!fp) return { ok: false, reason: "invalid_anchor_public_jwk" };
  if (fp !== bundle.public_key_fingerprint) {
    return { ok: false, reason: "anchor_fingerprint_mismatch" };
  }
  if (!Number.isFinite(bundle.statement_cache_max_age_seconds) || bundle.statement_cache_max_age_seconds <= 0) {
    return { ok: false, reason: "invalid_statement_cache_policy" };
  }
  const statusMaxAge =
    bundle.status_statement_max_age_seconds ?? bundle.statement_cache_max_age_seconds;
  if (!Number.isFinite(statusMaxAge) || statusMaxAge <= 0) {
    return { ok: false, reason: "invalid_status_statement_cache_policy" };
  }
  return { ok: true };
}

/** Reject statements that try to substitute a different anchor than the integrator pinned. */
export function assertStatementMatchesPinnedAnchor(input: {
  bundle: TrustAnchorBundleV1;
  statementAnchorKeyId: string;
}): { ok: true } | { ok: false; reason: string } {
  if (input.statementAnchorKeyId !== input.bundle.anchor_key_id) {
    return { ok: false, reason: "anchor_substitution_rejected" };
  }
  return { ok: true };
}
