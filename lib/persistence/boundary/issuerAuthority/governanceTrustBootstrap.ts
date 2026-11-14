// First governance public-pin installation. Requires possession of the governance private key
// and an operator witness secret from an out-of-band ceremony. A change ticket alone is not enough.

import { createHash, timingSafeEqual } from "node:crypto";
import nacl from "tweetnacl";
import { canonicalizeJson, verifyEd25519Detached } from "@abraxas/independent-verifier";

export const GOVERNANCE_TRUST_BOOTSTRAP_DOCUMENT = "abraxas_governance_trust_bootstrap/1.0.0" as const;
export const GOVERNANCE_TRUST_BOOTSTRAP_SCHEMA_VERSION = "1.0.0" as const;

/** Legacy env name documented for operators. Establish does not read it from the issuer runtime. */
export const GOVERNANCE_OPERATOR_WITNESS_ENV = "ABRAXAS_GOVERNANCE_OPERATOR_WITNESS_SHA256" as const;

export type GovernanceTrustBootstrapAuthorization = {
  document: typeof GOVERNANCE_TRUST_BOOTSTRAP_DOCUMENT;
  schema_version: typeof GOVERNANCE_TRUST_BOOTSTRAP_SCHEMA_VERSION;
  environment: "demo" | "production";
  governance_key_id: string;
  public_key_fingerprint: string;
  operator_change_ticket: string;
  operator_attested_at: string;
};

export function hashGovernanceTrustBootstrap(authorization: GovernanceTrustBootstrapAuthorization): string {
  return createHash("sha256").update(canonicalizeJson(authorization), "utf8").digest("hex");
}

export function signGovernanceTrustBootstrap(input: {
  authorization: GovernanceTrustBootstrapAuthorization;
  governancePrivateJwk: JsonWebKey;
}): string {
  if (!input.governancePrivateJwk.d) throw new Error("governance_private_jwk_required");
  const seed = Buffer.from(input.governancePrivateJwk.d, "base64url");
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const signature = nacl.sign.detached(
    Buffer.from(hashGovernanceTrustBootstrap(input.authorization), "hex"),
    keyPair.secretKey,
  );
  return Buffer.from(signature).toString("base64url");
}

export function verifyGovernanceTrustBootstrap(input: {
  authorization: GovernanceTrustBootstrapAuthorization;
  signatureBase64Url: string;
  governancePublicJwk: JsonWebKey;
  governanceKeyId: string;
  publicKeyFingerprint: string;
}): { ok: true } | { ok: false; reason: "governance_bootstrap_document_invalid" | "governance_bootstrap_signature_invalid" } {
  if (
    input.authorization.document !== GOVERNANCE_TRUST_BOOTSTRAP_DOCUMENT
    || input.authorization.schema_version !== GOVERNANCE_TRUST_BOOTSTRAP_SCHEMA_VERSION
    || input.authorization.governance_key_id !== input.governanceKeyId
    || input.authorization.public_key_fingerprint !== input.publicKeyFingerprint
  ) {
    return { ok: false, reason: "governance_bootstrap_document_invalid" };
  }
  const ok = verifyEd25519Detached({
    message: Buffer.from(hashGovernanceTrustBootstrap(input.authorization), "hex"),
    signatureBase64Url: input.signatureBase64Url,
    publicJwk: input.governancePublicJwk,
  });
  return ok ? { ok: true } : { ok: false, reason: "governance_bootstrap_signature_invalid" };
}

export function sha256WitnessAuthorizationHex(secret: string): string {
  return createHash("sha256").update(secret.trim(), "utf8").digest("hex");
}

/**
 * Witness hash is passed in at ceremony time. Issuer runtime configuration is not a trust source.
 */
export function verifyGovernanceOperatorBootstrapWitness(input: {
  witnessSecret: string;
  authorizedWitnessSha256: string;
}): { ok: true } | { ok: false; reason: "governance_bootstrap_witness_required" | "governance_bootstrap_witness_invalid" } {
  const configured = input.authorizedWitnessSha256.trim().toLowerCase();
  if (!configured || !/^[0-9a-f]{64}$/.test(configured)) {
    return { ok: false, reason: "governance_bootstrap_witness_required" };
  }
  const actual = sha256WitnessAuthorizationHex(input.witnessSecret);
  try {
    if (!timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(configured, "hex"))) {
      return { ok: false, reason: "governance_bootstrap_witness_invalid" };
    }
  } catch {
    return { ok: false, reason: "governance_bootstrap_witness_invalid" };
  }
  return { ok: true };
}
