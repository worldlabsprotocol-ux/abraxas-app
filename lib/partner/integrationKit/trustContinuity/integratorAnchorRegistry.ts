// FILE: lib/partner/integrationKit/trustContinuity/integratorAnchorRegistry.ts
// Partner-controlled trust anchor registry — never auto-trust anchors from downloaded bundles.

import type { TrustAnchorBundleV1 } from "@abraxas/independent-verifier";
import {
  canonicalizeJson,
  validateTrustAnchorBundle,
  verifyEd25519Detached,
} from "@abraxas/independent-verifier";
import { createHash } from "node:crypto";

export const INTEGRATOR_TRUST_REGISTRY_SCHEMA = "abraxas_integrator_trust_registry/1.0.0" as const;
export const ANCHOR_ROTATION_AUTHORIZATION_SCHEMA = "abraxas_integrator_anchor_rotation/1.0.0" as const;

export type IntegratorAnchorRetirement = {
  public_key_fingerprint: string;
  retired_at: string;
  reason?: string;
};

export type IntegratorAnchorDistrust = {
  public_key_fingerprint: string;
  distrusted_at: string;
  reason: string;
};

export type IntegratorTrustAnchorRegistryV1 = {
  schema: typeof INTEGRATOR_TRUST_REGISTRY_SCHEMA;
  environment: "demo" | "production";
  /** Primary pin for new verifications. */
  active: TrustAnchorBundleV1;
  /** Still trusted during overlap (e.g. rotation window). */
  overlap?: TrustAnchorBundleV1[];
  retired?: IntegratorAnchorRetirement[];
  distrusted?: IntegratorAnchorDistrust[];
  audit_log?: Array<{ at: string; event: string; detail?: string }>;
};

export type AnchorRotationAuthorizationV1 = {
  document: typeof ANCHOR_ROTATION_AUTHORIZATION_SCHEMA;
  environment: "demo" | "production";
  supersedes_fingerprint: string;
  new_anchor_fingerprint: string;
  authorized_at: string;
  overlap_until?: string | null;
};

export type IntegratorOperatorRotationApproval = {
  type: "integrator_operator";
  approved_at: string;
  change_ticket: string;
  supersedes_fingerprint: string;
};

function isOverlapValid(bundle: TrustAnchorBundleV1, overlapUntil: string | null | undefined, now: Date): boolean {
  if (!overlapUntil) return true;
  const t = Date.parse(overlapUntil);
  return !Number.isNaN(t) && now.getTime() <= t;
}

export function validateIntegratorTrustRegistry(
  registry: IntegratorTrustAnchorRegistryV1,
): { ok: true } | { ok: false; reason: string } {
  if (registry.schema !== INTEGRATOR_TRUST_REGISTRY_SCHEMA) {
    return { ok: false, reason: "invalid_integrator_trust_registry_schema" };
  }
  const active = validateTrustAnchorBundle(registry.active);
  if (!active.ok) return active;
  if (registry.active.environment !== registry.environment) {
    return { ok: false, reason: "active_anchor_environment_mismatch" };
  }
  for (const o of registry.overlap ?? []) {
    const v = validateTrustAnchorBundle(o);
    if (!v.ok) return v;
    if (o.environment !== registry.environment) return { ok: false, reason: "overlap_anchor_environment_mismatch" };
  }
  return { ok: true };
}

export function hashAnchorRotationAuthorization(payload: AnchorRotationAuthorizationV1): string {
  return createHash("sha256").update(canonicalizeJson(payload), "utf8").digest("hex");
}

/** Cryptographic rotation: prior anchor key signs authorization for the new fingerprint. */
export function verifyAnchorRotationAuthorization(input: {
  authorization: AnchorRotationAuthorizationV1;
  signatureBase64Url: string;
  priorAnchorPublicJwk: JsonWebKey;
}): { ok: true } | { ok: false; reason: string } {
  const hash = hashAnchorRotationAuthorization(input.authorization);
  const ok = verifyEd25519Detached({
    message: Buffer.from(hash, "hex"),
    signatureBase64Url: input.signatureBase64Url,
    publicJwk: input.priorAnchorPublicJwk,
  });
  return ok ? { ok: true } : { ok: false, reason: "anchor_rotation_signature_invalid" };
}

export function isFingerprintDistrusted(registry: IntegratorTrustAnchorRegistryV1, fingerprint: string): boolean {
  return (registry.distrusted ?? []).some((d) => d.public_key_fingerprint === fingerprint);
}

/** Resolve which registry anchor may authenticate a bundled export (never adds unknown anchors). */
export function resolveTrustedAnchorForBundledExport(input: {
  bundled: TrustAnchorBundleV1;
  registry: IntegratorTrustAnchorRegistryV1;
  now?: Date;
}):
  | { ok: true; pinnedTrustAnchor: TrustAnchorBundleV1; matched: "active" | "overlap" }
  | { ok: false; reason: string } {
  const validated = validateIntegratorTrustRegistry(input.registry);
  if (!validated.ok) return validated;

  const fp = input.bundled.public_key_fingerprint;
  if (isFingerprintDistrusted(input.registry, fp)) {
    return { ok: false, reason: "anchor_distrusted" };
  }

  const now = input.now ?? new Date();
  const candidates: TrustAnchorBundleV1[] = [
    input.registry.active,
    ...(input.registry.overlap ?? []),
  ];

  for (const candidate of candidates) {
    if (
      candidate.public_key_fingerprint === fp
      && candidate.anchor_key_id === input.bundled.anchor_key_id
      && candidate.environment === input.bundled.environment
    ) {
      const isActive = candidate.public_key_fingerprint === input.registry.active.public_key_fingerprint;
      if (!isActive) {
        const overlapAuth = input.registry.overlap?.find((o) => o.public_key_fingerprint === fp);
        if (overlapAuth && !isOverlapValid(overlapAuth, null, now)) {
          return { ok: false, reason: "overlap_anchor_expired" };
        }
      }
      return {
        ok: true,
        pinnedTrustAnchor: candidate,
        matched: isActive ? "active" : "overlap",
      };
    }
  }

  return { ok: false, reason: "untrusted_anchor_substitution" };
}

export function applyAuthorizedAnchorRotation(input: {
  registry: IntegratorTrustAnchorRegistryV1;
  newActive: TrustAnchorBundleV1;
  authorization:
    | { kind: "operator"; approval: IntegratorOperatorRotationApproval }
    | { kind: "signed"; authorization: AnchorRotationAuthorizationV1; signatureBase64Url: string };
  overlapUntil?: string | null;
  now?: Date;
}):
  | { ok: true; registry: IntegratorTrustAnchorRegistryV1 }
  | { ok: false; reason: string } {
  const now = input.now ?? new Date();
  const registry = input.registry;
  const validated = validateIntegratorTrustRegistry(registry);
  if (!validated.ok) return validated;

  const newValid = validateTrustAnchorBundle(input.newActive);
  if (!newValid.ok) return newValid;
  if (input.newActive.environment !== registry.environment) {
    return { ok: false, reason: "new_anchor_environment_mismatch" };
  }

  const priorFp = registry.active.public_key_fingerprint;
  const newFp = input.newActive.public_key_fingerprint;

  if (isFingerprintDistrusted(registry, newFp)) {
    return { ok: false, reason: "new_anchor_distrusted" };
  }

  if (input.authorization.kind === "operator") {
    const a = input.authorization.approval;
    if (a.supersedes_fingerprint !== priorFp) {
      return { ok: false, reason: "rotation_supersedes_fingerprint_mismatch" };
    }
  } else {
    const auth = input.authorization.authorization;
    if (auth.supersedes_fingerprint !== priorFp || auth.new_anchor_fingerprint !== newFp) {
      return { ok: false, reason: "rotation_authorization_mismatch" };
    }
    const sig = verifyAnchorRotationAuthorization({
      authorization: auth,
      signatureBase64Url: input.authorization.signatureBase64Url,
      priorAnchorPublicJwk: registry.active.public_jwk,
    });
    if (!sig.ok) return sig;
  }

  const overlap = [...(registry.overlap ?? [])];
  if (priorFp !== newFp) {
    overlap.push(registry.active);
  }

  const audit = [...(registry.audit_log ?? []), {
    at: now.toISOString(),
    event: "anchor_rotation_applied",
    detail: `${priorFp} -> ${newFp}`,
  }];

  return {
    ok: true,
    registry: {
      ...registry,
      active: input.newActive,
      overlap,
      audit_log: audit,
    },
  };
}

export function distrustAnchorFingerprint(input: {
  registry: IntegratorTrustAnchorRegistryV1;
  fingerprint: string;
  reason: string;
  now?: Date;
}): IntegratorTrustAnchorRegistryV1 {
  const now = input.now ?? new Date();
  const distrusted = [...(input.registry.distrusted ?? [])];
  if (!distrusted.some((d) => d.public_key_fingerprint === input.fingerprint)) {
    distrusted.push({
      public_key_fingerprint: input.fingerprint,
      distrusted_at: now.toISOString(),
      reason: input.reason,
    });
  }
  return {
    ...input.registry,
    distrusted,
    audit_log: [
      ...(input.registry.audit_log ?? []),
      { at: now.toISOString(), event: "anchor_distrusted", detail: input.fingerprint },
    ],
  };
}
