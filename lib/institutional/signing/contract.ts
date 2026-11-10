// Role-separated institutional signing. Abraxas chooses the document.
// The signer only produces an Ed25519 signature over that document's 32-byte SHA-256 digest.

export const INSTITUTIONAL_SIGNING_ROLES = ["issuer_anchor", "status_signer"] as const;
export type InstitutionalSigningRole = (typeof INSTITUTIONAL_SIGNING_ROLES)[number];

export const INSTITUTIONAL_SIGNING_PURPOSES = [
  "issuer_authority_statement",
  "authority_change_authorization",
  "receipt_status_statement",
] as const;
export type InstitutionalSigningPurpose = (typeof INSTITUTIONAL_SIGNING_PURPOSES)[number];

const PURPOSES_BY_ROLE: Record<InstitutionalSigningRole, readonly InstitutionalSigningPurpose[]> = {
  issuer_anchor: ["issuer_authority_statement", "authority_change_authorization"],
  status_signer: ["receipt_status_statement"],
};

export type InstitutionalSigningFailureReason =
  | "unauthorized_signing_purpose"
  | "environment_mismatch"
  | "digest_must_be_32_bytes"
  | "institutional_signer_unavailable"
  | "signature_material_invalid"
  | "production_exportable_key_forbidden"
  | "exportable_jwk_not_a_signer"
  | "signing_roles_must_be_separate"
  | "public_key_must_not_carry_private_material"
  | "invalid_public_key"
  | "institutional_signer_not_configured";

export type SignInstitutionalDigestRequest = {
  role: InstitutionalSigningRole;
  purpose: InstitutionalSigningPurpose;
  environment: "demo" | "production";
  /** Raw SHA-256 digest of the canonical document. Not hex, and not hashed again. */
  digest: Uint8Array;
};

export type SignInstitutionalDigestResult =
  | {
      ok: true;
      role: InstitutionalSigningRole;
      purpose: InstitutionalSigningPurpose;
      signature_base64url: string;
      public_jwk: JsonWebKey;
    }
  | { ok: false; reason: InstitutionalSigningFailureReason };

export function purposeAllowed(role: InstitutionalSigningRole, purpose: InstitutionalSigningPurpose): boolean {
  return PURPOSES_BY_ROLE[role].includes(purpose);
}

export function publicEd25519Jwk(jwk: JsonWebKey):
  | { ok: true; jwk: JsonWebKey }
  | { ok: false; reason: "public_key_must_not_carry_private_material" | "invalid_public_key" } {
  if (jwk.d != null || jwk.k != null) {
    return { ok: false, reason: "public_key_must_not_carry_private_material" };
  }
  if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.x !== "string" || jwk.x.length === 0) {
    return { ok: false, reason: "invalid_public_key" };
  }
  const raw = Buffer.from(jwk.x, "base64url");
  if (raw.length !== 32) return { ok: false, reason: "invalid_public_key" };
  return { ok: true, jwk: { kty: "OKP", crv: "Ed25519", x: jwk.x } };
}
