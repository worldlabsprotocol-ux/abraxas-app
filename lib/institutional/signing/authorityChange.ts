// The signed registry-change document matches PR #948's abraxas_issuer_authority_change/1.0.0.
// This module builds that document from the proposed statement and the retained snapshot.
// It does not accept a caller-supplied digest as the signed value.

import { createHash } from "node:crypto";
import {
  canonicalizeJson,
  ISSUER_AUTHORITY_STATEMENT_DOCUMENT,
  ISSUER_AUTHORITY_STATEMENT_SCHEMA_VERSION,
  publicEd25519JwkFingerprint,
  type IssuerAuthorityStatementPayload,
} from "@abraxas/independent-verifier";
import type { InstitutionalSigningFailureReason } from "./contract";
import { publicKeyMaterialCarriesPrivateSeed } from "./contract";

export const INITIAL_ISSUER_REGISTRY_VERSION = 854;
export const ISSUER_AUTHORITY_CHANGE_DOCUMENT = "abraxas_issuer_authority_change/1.0.0" as const;

export type IssuerAuthorityChangeAuthorization = {
  document: typeof ISSUER_AUTHORITY_CHANGE_DOCUMENT;
  environment: "demo" | "production";
  change: "bootstrap" | "authority_change";
  registry_version: number;
  supersedes_registry_version: number | null;
  authority_state_digest: string;
  anchor_key_id: string;
  anchor_fingerprint: string;
};

export type RetainedAuthoritySnapshot = {
  registryVersion: number;
  authorityStateDigest: string;
};

/** Same preimage as PR #948 issuerAuthorityStateDigest. Version and timestamps are excluded. */
export function authorityStateDigest(
  payload: Pick<IssuerAuthorityStatementPayload, "environment" | "anchor_key_id" | "keys" | "status_signers">,
): string {
  const state = {
    environment: payload.environment,
    anchor_key_id: payload.anchor_key_id,
    keys: [...payload.keys].sort((left, right) => left.key_id.localeCompare(right.key_id)),
    ...(payload.status_signers && payload.status_signers.length > 0
      ? {
          status_signers: [...payload.status_signers].sort((left, right) =>
            left.key_id.localeCompare(right.key_id),
          ),
        }
      : {}),
  };
  return createHash("sha256").update(canonicalizeJson(state), "utf8").digest("hex");
}

export function hashAuthorityChangeAuthorization(authorization: IssuerAuthorityChangeAuthorization): string {
  return createHash("sha256").update(canonicalizeJson(authorization), "utf8").digest("hex");
}

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
