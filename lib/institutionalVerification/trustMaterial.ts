// FILE: lib/institutionalVerification/trustMaterial.ts
// Verified trust bootstrap for independent verification (no Supabase trust root).

import { createHash } from "crypto";
import {
  RECEIPT_VERIFICATION_REGISTRY_ENV,
  assertNoPrivateReceiptKeyMaterial,
  type ReceiptVerificationKeyDocument,
} from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";
import {
  PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV,
  PORTABLE_REVOCATION_ISSUER_TRUST_ENV,
} from "@/lib/passport/reusableCredential/independentInstitutionConfig";

export type TrustMaterialFetchResult =
  | { ok: true; document: ReceiptVerificationKeyDocument; digest: string; registry_env_value: string }
  | { ok: false; code: "fetch_failed" | "invalid_document" | "private_material_leak" | "pin_mismatch" | "fingerprint_mismatch" };

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
  return doc;
}

export async function fetchVerifiedReceiptKeyDocument(input: {
  originUrl: string;
  fetchFn?: typeof fetch;
  pinnedDigest?: string;
}): Promise<TrustMaterialFetchResult> {
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
  if (input.pinnedDigest && input.pinnedDigest !== digest) {
    return { ok: false, code: "pin_mismatch" };
  }
  const registryRows = document.keys.map((key) => ({
    key_id: key.key_id,
    algorithm: key.algorithm,
    environment: key.environment,
    status: key.status,
    public_jwk: key.public_jwk,
    issued_at: key.issued_at,
    not_before: key.not_before,
    expires_at: key.expires_at,
    schema_versions: key.schema_versions,
    issuer_label: key.issuer_label,
    reason_class: key.reason_class,
  }));
  return {
    ok: true,
    document,
    digest,
    registry_env_value: JSON.stringify(registryRows),
  };
}

export type InstitutionalTrustEnvInput = {
  /** Pre-pinned registry JSON for ABRAXAS_RECEIPT_VERIFICATION_REGISTRY */
  receipt_verification_registry_json?: string;
  /** Optional network bootstrap — requires pinnedDigest when used in production integrations */
  trust_origin_url?: string;
  pinned_receipt_key_document_digest?: string;
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
  | "fingerprint_mismatch";

export type InstitutionalTrustEnvResult =
  | { ok: true; env: Record<string, string>; receipt_key_document_digest: string | null }
  | { ok: false; code: InstitutionalTrustEnvFailureCode };

/** Merge institution-controlled trust env. Network fetch never replaces a pin mismatch. */
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

  if (input.receipt_verification_registry_json?.trim()) {
    env[RECEIPT_VERIFICATION_REGISTRY_ENV] = input.receipt_verification_registry_json.trim();
  } else if (input.trust_origin_url?.trim()) {
    const fetched = await fetchVerifiedReceiptKeyDocument({
      originUrl: input.trust_origin_url.trim(),
      fetchFn: input.fetchFn,
      pinnedDigest: input.pinned_receipt_key_document_digest,
    });
    if (!fetched.ok) {
      return { ok: false, code: fetched.code === "pin_mismatch" ? "pin_mismatch" : fetched.code };
    }
    env[RECEIPT_VERIFICATION_REGISTRY_ENV] = fetched.registry_env_value;
    digest = fetched.digest;
  }

  if (!env[RECEIPT_VERIFICATION_REGISTRY_ENV] && !env.ABRAXAS_SIGNING_KEY) {
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
