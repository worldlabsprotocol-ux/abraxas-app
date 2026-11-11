// The signed registry-change document matches PR #948's abraxas_issuer_authority_change/1.0.0.
// This module builds that document from the proposed statement and the retained snapshot.
// It does not accept a caller-supplied digest as the signed value.

import {
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  issuerAuthorityStateDigest,
  publicEd25519JwkFingerprint,
  type IssuerAuthorityStatementPayload,
} from "@abraxas/independent-verifier";
import {
  hashIssuerAuthorityChangeAuthorization,
  INITIAL_ISSUER_REGISTRY_VERSION,
  ISSUER_AUTHORITY_CHANGE_DOCUMENT,
  type IssuerAuthorityChangeAuthorization,
} from "@/lib/persistence/boundary/issuerAuthority/issuerAuthorityChangeDocument";
import type { InstitutionalSigningFailureReason } from "./contract";
import { publicKeyMaterialCarriesPrivateSeed } from "./contract";

export {
  hashIssuerAuthorityChangeAuthorization as hashAuthorityChangeAuthorization,
  INITIAL_ISSUER_REGISTRY_VERSION,
  ISSUER_AUTHORITY_CHANGE_DOCUMENT,
  type IssuerAuthorityChangeAuthorization,
};
export const authorityStateDigest = issuerAuthorityStateDigest;

export type RetainedAuthoritySnapshot = {
  registryVersion: number;
  authorityStateDigest: string;
};

function digestHex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function wholeVersion(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 1;
}

export function buildAuthorityChangeAuthorization(input: {
  environment: "demo" | "production";
  anchorKeyId: string;
  anchorPublicJwk: JsonWebKey;
  retained: RetainedAuthoritySnapshot | null;
  proposed: IssuerAuthorityStatementPayload;
  assertedAuthorityStateDigest: string;
}):
  | { ok: true; authorization: IssuerAuthorityChangeAuthorization }
  | { ok: false; reason: InstitutionalSigningFailureReason } {
  const proposed = input.proposed;
  if (proposed.document !== ISSUER_AUTHORITY_STATEMENT_DOCUMENT) {
    return { ok: false, reason: "unauthorized_institutional_action" };
  }
  if (proposed.schema_version !== ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION) {
    return { ok: false, reason: "authority_document_invalid" };
  }
  if (publicKeyMaterialCarriesPrivateSeed(proposed)) {
    return { ok: false, reason: "public_key_must_not_carry_private_material" };
  }
  if (proposed.environment !== input.environment) return { ok: false, reason: "environment_mismatch" };
  if (proposed.anchor_key_id !== input.anchorKeyId) return { ok: false, reason: "anchor_key_mismatch" };
  const fingerprint = publicEd25519JwkFingerprint(input.anchorPublicJwk);
  if (!fingerprint) return { ok: false, reason: "invalid_public_key" };

  const computed = authorityStateDigest(proposed);
  if (!digestHex(input.assertedAuthorityStateDigest) || input.assertedAuthorityStateDigest !== computed) {
    return { ok: false, reason: "authority_state_digest_mismatch" };
  }

  let change: "bootstrap" | "authority_change";
  let supersedes: number | null;
  if (input.retained == null) {
    if (
      proposed.registry_version !== INITIAL_ISSUER_REGISTRY_VERSION
      || proposed.supersedes_registry_version != null
    ) {
      return { ok: false, reason: "authority_approval_not_bound" };
    }
    change = "bootstrap";
    supersedes = null;
  } else {
    if (!wholeVersion(input.retained.registryVersion) || !digestHex(input.retained.authorityStateDigest)) {
      return { ok: false, reason: "stale_authority_approval" };
    }
    if (computed === input.retained.authorityStateDigest) {
      return { ok: false, reason: "authority_state_unchanged" };
    }
    if (proposed.supersedes_registry_version !== input.retained.registryVersion) {
      return { ok: false, reason: "stale_authority_approval" };
    }
    if (proposed.registry_version !== input.retained.registryVersion + 1) {
      return { ok: false, reason: "authority_approval_not_bound" };
    }
    change = "authority_change";
    supersedes = input.retained.registryVersion;
  }

  return {
    ok: true,
    authorization: {
      document: ISSUER_AUTHORITY_CHANGE_DOCUMENT,
      environment: input.environment,
      change,
      registry_version: proposed.registry_version,
      supersedes_registry_version: supersedes,
      authority_state_digest: computed,
      anchor_key_id: input.anchorKeyId,
      anchor_fingerprint: fingerprint,
    },
  };
}
