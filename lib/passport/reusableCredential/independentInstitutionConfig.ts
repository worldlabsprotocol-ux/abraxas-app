// FILE: lib/passport/reusableCredential/independentInstitutionConfig.ts
// Institution controlled trust for independent Passport verification (Build #569).

import type { PortableRevocationBootstrapTrust, PortableRevocationIssuerTrustPolicy } from "@/lib/protocol/portableRevocation";

export const PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV = "ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS";

export const PORTABLE_REVOCATION_ISSUER_TRUST_ENV = "ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST";

export type IndependentInstitutionConfig = {
  partner_id: string;
  policy_id: string;
  /** Public trust material and registry JSON (no private signing keys in institution config files). */
  trust_env: Record<string, string>;
};

export type IndependentInstitutionConfigParseResult =
  | { ok: true; config: IndependentInstitutionConfig }
  | { ok: false; code: string; detail?: string };

export function parseIndependentInstitutionConfig(raw: unknown): IndependentInstitutionConfigParseResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, code: "institution_config_invalid" };
  }
  const row = raw as Record<string, unknown>;
  const partner_id = typeof row.partner_id === "string" ? row.partner_id.trim() : "";
  const policy_id = typeof row.policy_id === "string" ? row.policy_id.trim() : "";
  if (!partner_id || !policy_id) {
    return { ok: false, code: "institution_partner_or_policy_missing" };
  }
  const trust_env =
    row.trust_env && typeof row.trust_env === "object" && !Array.isArray(row.trust_env)
      ? (row.trust_env as Record<string, string>)
      : null;
  if (!trust_env) {
    return { ok: false, code: "institution_trust_env_missing" };
  }
  return { ok: true, config: { partner_id, policy_id, trust_env } };
}

export function loadPortableRevocationIssuerTrustPolicy(
  env: Record<string, string | undefined>,
): PortableRevocationIssuerTrustPolicy | null {
  const raw = env[PORTABLE_REVOCATION_ISSUER_TRUST_ENV]?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PortableRevocationIssuerTrustPolicy;
    if (!parsed?.bindings?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadInstitutionPortableRevocationBootstrapTrusts(
  env: Record<string, string | undefined>,
): PortableRevocationBootstrapTrust[] {
  const raw = env[PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS_ENV]?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PortableRevocationBootstrapTrust[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type InstitutionTrustReadiness =
  | { ok: true; issuerTrust: PortableRevocationIssuerTrustPolicy; bootstrapTrusts: PortableRevocationBootstrapTrust[] }
  | { ok: false; code: "portable_revocation_issuer_trust_missing" | "portable_revocation_issuer_trust_invalid" };

export function resolveInstitutionPortableRevocationTrust(
  env: Record<string, string | undefined>,
): InstitutionTrustReadiness {
  const issuerTrust = loadPortableRevocationIssuerTrustPolicy(env);
  if (!issuerTrust) {
    return { ok: false, code: "portable_revocation_issuer_trust_missing" };
  }
  const bootstrapTrusts = loadInstitutionPortableRevocationBootstrapTrusts(env);
  return { ok: true, issuerTrust, bootstrapTrusts };
}

export type BundleEvidenceBindingResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "bundle_receipt_partner_mismatch"
        | "bundle_receipt_policy_mismatch"
        | "bundle_metadata_partner_mismatch"
        | "bundle_metadata_policy_mismatch";
    };

/** Evidence consistency only. Institutional authority is `IndependentInstitutionConfig`, not bundle metadata. */
export function validateBundleEvidenceAgainstInstitution(input: {
  bundle: {
    partner_id?: string;
    policy_id?: string;
    presentation: { signed_decision_receipt: { partner_id: string; policy_id: string } };
  };
  institution: IndependentInstitutionConfig;
}): BundleEvidenceBindingResult {
  const signed = input.bundle.presentation.signed_decision_receipt;
  if (signed.partner_id !== input.institution.partner_id) {
    return { ok: false, code: "bundle_receipt_partner_mismatch" };
  }
  if (signed.policy_id !== input.institution.policy_id) {
    return { ok: false, code: "bundle_receipt_policy_mismatch" };
  }
  if (input.bundle.partner_id && input.bundle.partner_id !== signed.partner_id) {
    return { ok: false, code: "bundle_metadata_partner_mismatch" };
  }
  if (input.bundle.policy_id && input.bundle.policy_id !== signed.policy_id) {
    return { ok: false, code: "bundle_metadata_policy_mismatch" };
  }
  return { ok: true };
}
