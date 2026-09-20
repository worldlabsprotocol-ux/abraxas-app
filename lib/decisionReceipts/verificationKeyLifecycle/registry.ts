// FILE: lib/decisionReceipts/verificationKeyLifecycle/registry.ts
// Env-backed public verification-key registry. Private signing material stays in env only.

import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";
import { getReceiptSigningKeyId, loadReceiptVerificationKey } from "@/lib/decisionReceipts/signing";
import {
  RECEIPT_KEY_ENVIRONMENTS,
  RECEIPT_KEY_ISSUER_LABEL,
  RECEIPT_KEY_REASON_CLASSES,
  RECEIPT_KEY_STATUSES,
  RECEIPT_VERIFICATION_KEY_ALGORITHM,
  RECEIPT_VERIFICATION_REGISTRY_ENV,
  type ReceiptKeyEnvironment,
  type ReceiptKeyReasonClass,
  type ReceiptKeyStatus,
  type ReceiptVerificationKeyRecord,
  type ReceiptVerificationPublicJwk,
} from "./contract";
import { resolveReceiptKeyRuntimeEnvironment } from "./environment";
import { publicReceiptJwkFingerprint, toPublicReceiptJwk } from "./fingerprint";

export type RegistryLoadResult =
  | { ok: true; keys: ReceiptVerificationKeyRecord[]; environment: ReceiptKeyEnvironment }
  | { ok: false; reason: "unavailable" | "inconsistent" };

const IMPLICIT_NOT_BEFORE = "2020-01-01T00:00:00.000Z";
const IMPLICIT_EXPIRES = "2099-01-01T00:00:00.000Z";

function isStatus(value: unknown): value is ReceiptKeyStatus {
  return typeof value === "string" && (RECEIPT_KEY_STATUSES as readonly string[]).includes(value);
}

function isEnvironment(value: unknown): value is ReceiptKeyEnvironment {
  return typeof value === "string" && (RECEIPT_KEY_ENVIRONMENTS as readonly string[]).includes(value);
}

function isReason(value: unknown): value is ReceiptKeyReasonClass {
  return typeof value === "string" && (RECEIPT_KEY_REASON_CLASSES as readonly string[]).includes(value);
}

function parsePublicJwk(value: unknown): ReceiptVerificationPublicJwk | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.d === "string") return null;
  return toPublicReceiptJwk({
    kty: typeof record.kty === "string" ? record.kty : undefined,
    crv: typeof record.crv === "string" ? record.crv : undefined,
    x: typeof record.x === "string" ? record.x : undefined,
  });
}

function parseEntry(
  raw: unknown,
  fallbackEnvironment: ReceiptKeyEnvironment,
): ReceiptVerificationKeyRecord | "inconsistent" | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "inconsistent";
  const row = raw as Record<string, unknown>;
  if ("d" in row || "private_key" in row || "seed" in row) return "inconsistent";
  const keyId = typeof row.key_id === "string" ? row.key_id.trim() : "";
  if (!keyId) return "inconsistent";
  const publicJwk = parsePublicJwk(row.public_jwk);
  if (!publicJwk) return "inconsistent";
  const environment = isEnvironment(row.environment) ? row.environment : fallbackEnvironment;
  const status = isStatus(row.status) ? row.status : "active";
  const schemaVersions = Array.isArray(row.schema_versions)
    ? row.schema_versions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [DECISION_RECEIPT_SCHEMA_VERSION];
  if (schemaVersions.length === 0) return "inconsistent";
  const issuedAt = typeof row.issued_at === "string" ? row.issued_at : IMPLICIT_NOT_BEFORE;
  const notBefore = typeof row.not_before === "string" ? row.not_before : issuedAt;
  const expiresAt = row.expires_at === null || row.expires_at === undefined
    ? null
    : typeof row.expires_at === "string" ? row.expires_at : "inconsistent";
  if (expiresAt === "inconsistent") return "inconsistent";
  const historicalUntil = row.historical_verify_until === null || row.historical_verify_until === undefined
    ? null
    : typeof row.historical_verify_until === "string" ? row.historical_verify_until : "inconsistent";
  if (historicalUntil === "inconsistent") return "inconsistent";
  const allowHistorical = typeof row.allow_historical_verification === "boolean"
    ? row.allow_historical_verification
    : status === "retiring" || status === "retired";
  const reason = isReason(row.reason_class)
    ? row.reason_class
    : status === "active" ? "active" : status === "revoked" ? "compromise" : "rotation";
  return {
    key_id: keyId,
    algorithm: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    environment,
    status,
    public_jwk: publicJwk,
    fingerprint: publicReceiptJwkFingerprint(publicJwk),
    issuer_label: typeof row.issuer_label === "string" && row.issuer_label.trim()
      ? row.issuer_label.trim()
      : RECEIPT_KEY_ISSUER_LABEL,
    issued_at: issuedAt,
    not_before: notBefore,
    expires_at: expiresAt,
    schema_versions: schemaVersions,
    reason_class: reason,
    allow_historical_verification: allowHistorical,
    historical_verify_until: historicalUntil,
  };
}

function implicitActiveKey(
  env: Record<string, string | undefined>,
  environment: ReceiptKeyEnvironment,
): ReceiptVerificationKeyRecord | null {
  const publicJwk = toPublicReceiptJwk(loadReceiptVerificationKey() ?? undefined);
  if (!publicJwk) return null;
  const keyId = (env.ABRAXAS_SIGNING_KEY_ID ?? getReceiptSigningKeyId()).trim() || "abraxas-primary";
  return {
    key_id: keyId,
    algorithm: RECEIPT_VERIFICATION_KEY_ALGORITHM,
    environment,
    status: "active",
    public_jwk: publicJwk,
    fingerprint: publicReceiptJwkFingerprint(publicJwk),
    issuer_label: RECEIPT_KEY_ISSUER_LABEL,
    issued_at: IMPLICIT_NOT_BEFORE,
    not_before: IMPLICIT_NOT_BEFORE,
    expires_at: IMPLICIT_EXPIRES,
    schema_versions: [DECISION_RECEIPT_SCHEMA_VERSION],
    reason_class: "active",
    allow_historical_verification: false,
    historical_verify_until: null,
  };
}

export function loadReceiptVerificationRegistry(
  env: Record<string, string | undefined> = process.env,
): RegistryLoadResult {
  const environment = resolveReceiptKeyRuntimeEnvironment(env);
  const implicit = implicitActiveKey(env, environment);
  const raw = env[RECEIPT_VERIFICATION_REGISTRY_ENV]?.trim();
  if (!raw) {
    if (!implicit) return { ok: false, reason: "unavailable" };
    return { ok: true, keys: [implicit], environment };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "inconsistent" };
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const keys: ReceiptVerificationKeyRecord[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const entry = parseEntry(row, environment);
    if (entry === "inconsistent") return { ok: false, reason: "inconsistent" };
    if (!entry) continue;
    if (seen.has(entry.key_id)) return { ok: false, reason: "inconsistent" };
    seen.add(entry.key_id);
    keys.push(entry);
  }
  if (implicit && !seen.has(implicit.key_id)) {
    keys.push(implicit);
  } else if (implicit) {
    const listed = keys.find((key) => key.key_id === implicit.key_id);
    if (listed && listed.fingerprint !== implicit.fingerprint && listed.status === "active") {
      return { ok: false, reason: "inconsistent" };
    }
  }
  if (keys.length === 0) return { ok: false, reason: "unavailable" };
  const active = keys.filter((key) => key.status === "active" && key.environment === environment);
  if (active.length > 1) return { ok: false, reason: "inconsistent" };
  return { ok: true, keys, environment };
}

export function getReceiptVerificationKeyById(
  keyId: string,
  env: Record<string, string | undefined> = process.env,
): ReceiptVerificationKeyRecord | null {
  const loaded = loadReceiptVerificationRegistry(env);
  if (!loaded.ok) return null;
  return loaded.keys.find((key) => key.key_id === keyId) ?? null;
}
