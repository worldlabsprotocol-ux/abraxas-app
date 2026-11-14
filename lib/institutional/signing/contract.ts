// Institutional signing identities. A purpose string is not an authorization.

export const INSTITUTIONAL_SIGNING_ROLES = ["issuer_anchor", "status_signer"] as const;

/** Ed25519 key spec shared by KMS and PKCS#11 custody adapters bound to CustodyClient. */
export const INSTITUTIONAL_ED25519_KEY_SPEC = "ECC_NIST_EDWARDS25519" as const;
export type InstitutionalSigningRole = (typeof INSTITUTIONAL_SIGNING_ROLES)[number];

export type InstitutionalSigningFailureReason =
  | "unauthorized_institutional_action"
  | "environment_mismatch"
  | "digest_must_be_32_bytes"
  | "institutional_signer_unavailable"
  | "signature_material_invalid"
  | "production_exportable_key_forbidden"
  | "exportable_jwk_not_a_signer"
  | "signing_roles_must_be_separate"
  | "signing_identities_must_be_separate"
  | "public_key_must_not_carry_private_material"
  | "invalid_public_key"
  | "institutional_signer_not_configured"
  | "kms_public_key_mismatch"
  | "kms_key_spec_mismatch"
  | "anchor_key_mismatch"
  | "status_signer_mismatch"
  | "authority_document_invalid"
  | "authority_state_digest_mismatch"
  | "authority_state_unchanged"
  | "stale_authority_approval"
  | "authority_approval_not_bound";

export type CustodyPublicKey = {
  keySpec: string;
  publicKey: Uint8Array;
};

/** One runtime identity bound to one key. It cannot name a different key at sign time. */
export type CustodyClient = {
  readonly identityId: string;
  readonly keyId: string;
  getPublicKey(): Promise<CustodyPublicKey>;
  signRawDigest(message: Uint8Array): Promise<Uint8Array>;
};

export class CustodyResponseError extends Error {
  readonly reason: "kms_public_key_mismatch" | "kms_key_spec_mismatch" | "signature_material_invalid";

  constructor(reason: CustodyResponseError["reason"]) {
    super(reason);
    this.name = "CustodyResponseError";
    this.reason = reason;
  }
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

export function publicKeyMaterialCarriesPrivateSeed(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(publicKeyMaterialCarriesPrivateSeed);
  const record = value as Record<string, unknown>;
  if ("d" in record && record.d != null) return true;
  return Object.values(record).some(publicKeyMaterialCarriesPrivateSeed);
}
