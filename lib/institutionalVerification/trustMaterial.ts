// FILE: lib/institutionalVerification/trustMaterial.ts
// Verified trust bootstrap for independent verification (no Supabase trust root).

import { createHash } from "crypto";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import {
  RECEIPT_VERIFICATION_REGISTRY_ENV,
  RECEIPT_VERIFICATION_KEY_ALGORITHM,
  RECEIPT_KEY_PARTNER_NOTICE,
  RECEIPT_KEY_ENVIRONMENTS,
  RECEIPT_KEY_STATUSES,
  RECEIPT_KEY_REASON_CLASSES,
  assertNoPrivateReceiptKeyMaterial,
  type ReceiptVerificationKeyDocument,
  type ReceiptVerificationKeyRecord,
  type ReceiptKeyEnvironment,
  type ReceiptKeyStatus,
  type ReceiptKeyReasonClass,
} from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { publicReceiptJwkFingerprint, toPublicReceiptJwk } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import {
  PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV,
  PORTABLE_REVOCATION_ISSUER_TRUST_ENV,
} from "@/lib/passport/reusableCredential/independentInstitutionConfig";

export type TrustMaterialFetchResult =
  | { ok: true; document: ReceiptVerificationKeyDocument; digest: string; registry_env_value: string }
  | {
      ok: false;
      code:
        | "fetch_failed"
        | "invalid_document"
        | "private_material_leak"
        | "pin_mismatch"
        | "fingerprint_mismatch"
        | "pin_required";
    };

export type InstitutionRegistryValidationResult =
  | { ok: true; registry_env_value: string; digest: string; keys: ReceiptVerificationKeyRecord[] }
  | {
      ok: false;
      code:
        | "invalid_document"
        | "private_material_leak"
        | "fingerprint_mismatch"
        | "registry_inconsistent"
        | "registry_unavailable";
    };

function isStatus(value: unknown): value is ReceiptKeyStatus {
  return typeof value === "string" && (RECEIPT_KEY_STATUSES as readonly string[]).includes(value);
}

function isEnvironment(value: unknown): value is ReceiptKeyEnvironment {
  return typeof value === "string" && (RECEIPT_KEY_ENVIRONMENTS as readonly string[]).includes(value);
}

function isReason(value: unknown): value is ReceiptKeyReasonClass {
  return typeof value === "string" && (RECEIPT_KEY_REASON_CLASSES as readonly string[]).includes(value);
}

function parseRegistryEntry(
  raw: unknown,
  fallbackEnvironment: ReceiptKeyEnvironment,
): ReceiptVerificationKeyRecord | "inconsistent" | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "inconsistent";
  const row = raw as Record<string, unknown>;
  if ("d" in row || "private_key" in row || "seed" in row) return "inconsistent";
  const keyId = typeof row.key_id === "string" ? row.key_id.trim() : "";
  if (!keyId) return "inconsistent";
  const jwkRaw = row.public_jwk;
  if (!jwkRaw || typeof jwkRaw !== "object" || Array.isArray(jwkRaw)) return "inconsistent";
  const jwkRecord = jwkRaw as Record<string, unknown>;
  if (typeof jwkRecord.d === "string") return "inconsistent";
  const publicJwk = toPublicReceiptJwk(jwkRecord as JsonWebKey);
  if (!publicJwk) return "inconsistent";
  const fingerprint = publicReceiptJwkFingerprint(publicJwk);
  if (typeof row.fingerprint === "string" && row.fingerprint !== fingerprint) {
    return "inconsistent";
  }
  const environment = isEnvironment(row.environment) ? row.environment : fallbackEnvironment;
  const status = isStatus(row.status) ? row.status : "active";
  const schemaVersions = Array.isArray(row.schema_versions)
    ? row.schema_versions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [DECISION_RECEIPT_SCHEMA_VERSION];
  if (schemaVersions.length === 0) return "inconsistent";
  const issuedAt = typeof row.issued_at === "string" ? row.issued_at : "2020-01-01T00:00:00.000Z";
  const notBefore = typeof row.not_before === "string" ? row.not_before : issuedAt;
  const expiresAt =
    row.expires_at === null || row.expires_at === undefined
      ? null
      : typeof row.expires_at === "string"
        ? row.expires_at
        : "inconsistent";
  if (expiresAt === "inconsistent") return "inconsistent";
  const reason = isReason(row.reason_class)
    ? row.reason_class
    : status === "active"
      ? "active"
      : status === "revoked"
        ? "compromise"
        : "rotation";
  return {
    key_id: keyId,
    algorithm: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    environment,
    status,
    public_jwk: publicJwk,
    fingerprint,
    issuer_label: typeof row.issuer_label === "string" && row.issuer_label.trim()
      ? row.issuer_label.trim()
      : "Abraxas",
    issued_at: issuedAt,
    not_before: notBefore,
    expires_at: expiresAt,
    schema_versions: schemaVersions,
    reason_class: reason,
    allow_historical_verification:
      typeof row.allow_historical_verification === "boolean"
        ? row.allow_historical_verification
        : status === "retiring" || status === "retired",
    historical_verify_until: (() => {
      if (row.historical_verify_until === null || row.historical_verify_until === undefined) return null;
      if (typeof row.historical_verify_until === "string") return row.historical_verify_until;
      return null;
    })(),
  };
}

/** Validate institution-pinned offline registry JSON (no signing-key env fallback). */
export function validateInstitutionReceiptVerificationRegistryJson(
  rawJson: string,
  environment: ReceiptKeyEnvironment = "demo",
): InstitutionRegistryValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, code: "invalid_document" };
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const keys: ReceiptVerificationKeyRecord[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const entry = parseRegistryEntry(row, environment);
    if (entry === "inconsistent") return { ok: false, code: "registry_inconsistent" };
    if (!entry) continue;
    if (seen.has(entry.key_id)) return { ok: false, code: "registry_inconsistent" };
    seen.add(entry.key_id);
    keys.push(entry);
  }
  if (keys.length === 0) return { ok: false, code: "registry_unavailable" };
  const active = keys.filter((key) => key.status === "active" && key.environment === environment);
  if (active.length > 1) return { ok: false, code: "registry_inconsistent" };
  const document: ReceiptVerificationKeyDocument = {
    document: "abraxas_receipt_verification_keys",
    algorithm: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    environment,
    schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
    notice: RECEIPT_KEY_PARTNER_NOTICE,
    keys: keys.map((key) => ({
      key_id: key.key_id,
      algorithm: key.algorithm,
      public_jwk: key.public_jwk,
      fingerprint: key.fingerprint,
      environment: key.environment,
      status: key.status,
      issued_at: key.issued_at,
      not_before: key.not_before,
      expires_at: key.expires_at,
      issuer_label: key.issuer_label,
      schema_versions: key.schema_versions,
      reason_class: key.reason_class,
    })),
  };
  if (assertNoPrivateReceiptKeyMaterial(document).length > 0) {
    return { ok: false, code: "private_material_leak" };
  }
  const digest = digestReceiptVerificationKeyDocument(document);
  return {
    ok: true,
    registry_env_value: JSON.stringify(
      keys.map(({ key_id, algorithm, environment: env, status, public_jwk, issued_at, not_before, expires_at, schema_versions, issuer_label, reason_class }) => ({
        key_id,
        algorithm,
        environment: env,
        status,
        public_jwk,
        issued_at,
        not_before,
        expires_at,
        schema_versions,
        issuer_label,
        reason_class,
      })),
    ),
    digest,
    keys,
  };
}

export function digestReceiptVerificationKeyDocument(document: ReceiptVerificationKeyDocument): string {
  const keyMaterial = [...document.keys]
    .map((key) => `${key.key_id}:${key.fingerprint}`)
    .sort()
    .join("|");
  return createHash("sha256")
    .update(`${document.document}:${document.environment}:${document.algorithm}:${keyMaterial}`)
    .digest("hex");
}

export function validateFetchedReceiptKeyDocument(raw: unknown): ReceiptVerificationKeyDocument | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const doc = raw as ReceiptVerificationKeyDocument;
  if (doc.document !== "abraxas_receipt_verification_keys") return null;
  if (!Array.isArray(doc.keys)) return null;
  if (assertNoPrivateReceiptKeyMaterial(doc).length > 0) return null;
  for (const key of doc.keys) {
    const expected = publicReceiptJwkFingerprint(key.public_jwk);
    if (key.fingerprint !== expected) return null;
  }
  const validated = validateInstitutionReceiptVerificationRegistryJson(JSON.stringify(doc.keys), doc.environment);
  if (!validated.ok) return null;
  return doc;
}

export async function fetchVerifiedReceiptKeyDocument(input: {
  originUrl: string;
  fetchFn?: typeof fetch;
  /** Required — network bootstrap is rejected without an institution-established digest pin. */
  pinnedDigest: string;
}): Promise<TrustMaterialFetchResult> {
  const pin = input.pinnedDigest?.trim();
  if (!pin) {
    return { ok: false, code: "pin_required" };
  }
  const base = input.originUrl.replace(/\/$/, "");
  const fetchFn = input.fetchFn ?? fetch;
  let res: Response;
  try {
    res = await fetchFn(`${base}/api/receipts/verification-keys`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "fetch_failed" };
  }
  if (!res.ok) return { ok: false, code: "fetch_failed" };
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, code: "fetch_failed" };
  }
  const document = validateFetchedReceiptKeyDocument(json);
  if (!document) return { ok: false, code: "invalid_document" };
  const digest = digestReceiptVerificationKeyDocument(document);
  if (pin !== digest) {
    return { ok: false, code: "pin_mismatch" };
  }
  const validated = validateInstitutionReceiptVerificationRegistryJson(JSON.stringify(document.keys), document.environment);
  if (!validated.ok) {
    return {
      ok: false,
      code: validated.code === "private_material_leak" ? "private_material_leak" : "invalid_document",
    };
  }
  return {
    ok: true,
    document,
    digest,
    registry_env_value: validated.registry_env_value,
  };
}

export type InstitutionalTrustEnvInput = {
  /** Institution-pinned registry JSON for ABRAXAS_RECEIPT_VERIFICATION_REGISTRY */
  receipt_verification_registry_json?: string;
  /** Network bootstrap — requires pinned_receipt_key_document_digest (mandatory pin). */
  trust_origin_url?: string;
  pinned_receipt_key_document_digest?: string;
  receipt_key_environment?: ReceiptKeyEnvironment;
  portable_revocation_issuer_trust_json?: string;
  portable_revocation_bootstrap_trusts_json?: string;
  extra_env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
};

export type InstitutionalTrustEnvFailureCode =
  | "trust_configuration_missing"
  | "fetch_failed"
  | "invalid_document"
  | "private_material_leak"
  | "pin_mismatch"
  | "fingerprint_mismatch"
  | "pin_required"
  | "registry_inconsistent"
  | "registry_unavailable";

export type InstitutionalTrustEnvResult =
  | { ok: true; env: Record<string, string>; receipt_key_document_digest: string | null }
  | { ok: false; code: InstitutionalTrustEnvFailureCode };

/** Merge institution-controlled trust env. No ABRAXAS_SIGNING_KEY fallback. */
export async function resolveInstitutionalTrustEnv(
  input: InstitutionalTrustEnvInput,
): Promise<InstitutionalTrustEnvResult> {
  const env: Record<string, string> = {};
  if (input.extra_env) {
    for (const [key, value] of Object.entries(input.extra_env)) {
      if (typeof value === "string" && value.trim()) env[key] = value.trim();
    }
  }

  let digest: string | null = null;
  const keyEnvironment = input.receipt_key_environment ?? "demo";

  if (input.receipt_verification_registry_json?.trim()) {
    const validated = validateInstitutionReceiptVerificationRegistryJson(
      input.receipt_verification_registry_json.trim(),
      keyEnvironment,
    );
    if (!validated.ok) {
      return {
        ok: false,
        code:
          validated.code === "private_material_leak"
            ? "private_material_leak"
            : validated.code === "registry_inconsistent"
              ? "invalid_document"
              : validated.code === "fingerprint_mismatch"
                ? "fingerprint_mismatch"
                : "invalid_document",
      };
    }
    env[RECEIPT_VERIFICATION_REGISTRY_ENV] = validated.registry_env_value;
    digest = validated.digest;
    if (
      input.pinned_receipt_key_document_digest?.trim()
      && input.pinned_receipt_key_document_digest.trim() !== digest
    ) {
      return { ok: false, code: "pin_mismatch" };
    }
  } else if (input.trust_origin_url?.trim()) {
    const pin = input.pinned_receipt_key_document_digest?.trim();
    if (!pin) {
      return { ok: false, code: "pin_required" };
    }
    const fetched = await fetchVerifiedReceiptKeyDocument({
      originUrl: input.trust_origin_url.trim(),
      fetchFn: input.fetchFn,
      pinnedDigest: pin,
    });
    if (!fetched.ok) {
      return { ok: false, code: fetched.code };
    }
    env[RECEIPT_VERIFICATION_REGISTRY_ENV] = fetched.registry_env_value;
    digest = fetched.digest;
  }

  if (!env[RECEIPT_VERIFICATION_REGISTRY_ENV]) {
    return { ok: false, code: "trust_configuration_missing" };
  }

  if (input.portable_revocation_issuer_trust_json?.trim()) {
    env[PORTABLE_REVOCATION_ISSUER_TRUST_ENV] = input.portable_revocation_issuer_trust_json.trim();
  }
  if (input.portable_revocation_bootstrap_trusts_json?.trim()) {
    env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV] = input.portable_revocation_bootstrap_trusts_json.trim();
  }

  return { ok: true, env, receipt_key_document_digest: digest };
}
