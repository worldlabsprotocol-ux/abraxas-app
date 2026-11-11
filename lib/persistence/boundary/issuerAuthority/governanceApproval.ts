// Independent governance approval for one authority transition.
// The issuer anchor verifies the issuer signature. This module verifies a second signature.
// The governance public key is an out-of-band pin supplied by the caller. This module does not
// read it from the issuer anchor configuration and does not install a replacement pin.

import { createHash } from "node:crypto";
import nacl from "tweetnacl";
import { canonicalizeJson, publicEd25519JwkFingerprint, verifyEd25519Detached } from "@abraxas/independent-verifier";

export const GOVERNANCE_APPROVAL_DOCUMENT = "abraxas_authority_governance_approval/1.0.0" as const;
export const GOVERNANCE_APPROVAL_SCHEMA_VERSION = "1.0.0" as const;
export const GOVERNANCE_SUCCESSION_DOCUMENT = "abraxas_governance_succession/1.0.0" as const;
export const GOVERNANCE_SUCCESSION_SCHEMA_VERSION = "1.0.0" as const;

/** Receipt signer identity. A governance pin cannot be this key. */
const RECEIPT_SIGNER_KEY_ID = "abraxas-primary";

export const GOVERNANCE_PIN_CUSTODY = {
  verificationImplemented: true,
  independentCustodyDemonstrated: false,
  multisignature: false,
  initialPin:
    "The registry writer receives the governance public key as an out-of-band pin. It does not read that key from the issuer anchor configuration and it does not fall back to the issuer anchor.",
  rotation:
    "The current governance key can sign a succession document naming the successor public key. The issuer anchor cannot authorize that succession. Installing the successor is an out-of-band pin change, not an issuer registry write.",
  recovery:
    "Loss of the governance private key has no in-application recovery. A single pinned key is not multisignature and is not multi-party custody.",
} as const;

export type GovernanceAction = "bootstrap" | "rotation" | "revocation";

export type IndependentGovernancePin = {
  keyId: string;
  publicJwk: JsonWebKey;
};

export type AuthorityGovernanceApproval = {
  document: typeof GOVERNANCE_APPROVAL_DOCUMENT;
  schema_version: typeof GOVERNANCE_APPROVAL_SCHEMA_VERSION;
  environment: "demo" | "production";
  action: GovernanceAction;
  registry_version: number;
  supersedes_registry_version: number | null;
  authority_state_digest: string;
  governance_key_id: string;
};

export type GovernanceSuccessionAuthorization = {
  document: typeof GOVERNANCE_SUCCESSION_DOCUMENT;
  schema_version: typeof GOVERNANCE_SUCCESSION_SCHEMA_VERSION;
  environment: "demo" | "production";
  current_governance_key_id: string;
  successor_governance_key_id: string;
  successor_public_jwk: JsonWebKey;
};

type AuthorityPublicKey = { key_id: string; public_jwk: JsonWebKey; status?: string };

export function classifyGovernanceAction(input: {
  change: "bootstrap" | "authority_change";
  statuses: string[];
}): GovernanceAction {
  if (input.change === "bootstrap") return "bootstrap";
  if (input.statuses.includes("revoked")) return "revocation";
  return "rotation";
}

export function hashAuthorityGovernanceApproval(approval: AuthorityGovernanceApproval): string {
  return createHash("sha256").update(canonicalizeJson(approval), "utf8").digest("hex");
}

export function signAuthorityGovernanceApproval(input: {
  approval: AuthorityGovernanceApproval;
  governancePrivateJwk: JsonWebKey;
}): string {
  if (!input.governancePrivateJwk.d) throw new Error("governance_private_jwk_required");
  const seed = Buffer.from(input.governancePrivateJwk.d, "base64url");
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const signature = nacl.sign.detached(
    Buffer.from(hashAuthorityGovernanceApproval(input.approval), "hex"),
    keyPair.secretKey,
  );
  return Buffer.from(signature).toString("base64url");
}

export function verifyAuthorityGovernanceApproval(input: {
  approval: AuthorityGovernanceApproval;
  signatureBase64Url: string;
  pin: IndependentGovernancePin;
}): { ok: true } | { ok: false; reason: "governance_approval_document_invalid" | "governance_approval_signature_invalid" } {
  if (
    input.approval.document !== GOVERNANCE_APPROVAL_DOCUMENT
    || input.approval.schema_version !== GOVERNANCE_APPROVAL_SCHEMA_VERSION
    || input.approval.governance_key_id !== input.pin.keyId
  ) {
    return { ok: false, reason: "governance_approval_document_invalid" };
  }
  const ok = verifyEd25519Detached({
    message: Buffer.from(hashAuthorityGovernanceApproval(input.approval), "hex"),
    signatureBase64Url: input.signatureBase64Url,
    publicJwk: input.pin.publicJwk,
  });
  return ok ? { ok: true } : { ok: false, reason: "governance_approval_signature_invalid" };
}

export function assertIndependentGovernancePin(input: {
  pin: IndependentGovernancePin;
  anchorKeyId: string;
  anchorPublicJwk: JsonWebKey;
  authorityKeys: AuthorityPublicKey[];
  statusSigners: AuthorityPublicKey[];
}): { ok: true } | { ok: false; reason: "governance_pin_invalid" | "governance_pin_not_independent" } {
  const pinFingerprint = publicEd25519JwkFingerprint(input.pin.publicJwk);
  const anchorFingerprint = publicEd25519JwkFingerprint(input.anchorPublicJwk);
  if (!pinFingerprint || !input.pin.keyId.trim() || !anchorFingerprint) {
    return { ok: false, reason: "governance_pin_invalid" };
  }
  if (
    input.pin.keyId === input.anchorKeyId
    || input.pin.keyId === RECEIPT_SIGNER_KEY_ID
    || pinFingerprint === anchorFingerprint
  ) {
    return { ok: false, reason: "governance_pin_not_independent" };
  }
  for (const key of [...input.authorityKeys, ...input.statusSigners]) {
    if (input.pin.keyId === key.key_id || publicEd25519JwkFingerprint(key.public_jwk) === pinFingerprint) {
      return { ok: false, reason: "governance_pin_not_independent" };
    }
  }
  return { ok: true };
}

export function governanceApprovalMatchesTransition(input: {
  approval: AuthorityGovernanceApproval;
  environment: "demo" | "production";
  action: GovernanceAction;
  authorityStateDigest: string;
  registryVersion: number;
  supersedesRegistryVersion: number | null;
  recordedVersion: number | null;
  recordedDigest?: string | null;
}): { ok: true } | {
  ok: false;
  reason:
    | "governance_environment_mismatch"
    | "governance_digest_mismatch"
    | "governance_action_mismatch"
    | "governance_version_mismatch"
    | "stale_governance_approval"
    | "replayed_governance_approval";
} {
  if (input.approval.environment !== input.environment) {
    return { ok: false, reason: "governance_environment_mismatch" };
  }
  if (input.approval.authority_state_digest !== input.authorityStateDigest) {
    return { ok: false, reason: "governance_digest_mismatch" };
  }
  if (
    input.recordedVersion != null
    && input.recordedDigest
    && input.approval.registry_version === input.recordedVersion
    && input.approval.authority_state_digest === input.recordedDigest
  ) {
    return { ok: false, reason: "replayed_governance_approval" };
  }
  if (input.approval.action !== input.action) {
    return { ok: false, reason: "governance_action_mismatch" };
  }
  const previousMatches = input.recordedVersion == null
    ? input.approval.supersedes_registry_version == null && input.approval.action === "bootstrap"
    : input.approval.supersedes_registry_version === input.recordedVersion
      && input.approval.action !== "bootstrap";
  if (!previousMatches) return { ok: false, reason: "stale_governance_approval" };
  const versionLinked = input.approval.registry_version === input.registryVersion
    && input.approval.supersedes_registry_version === input.supersedesRegistryVersion
    && (input.recordedVersion == null
      ? input.registryVersion === 854
      : input.registryVersion === input.recordedVersion + 1);
  if (!versionLinked) return { ok: false, reason: "governance_version_mismatch" };
  return { ok: true };
}

export function hashGovernanceSuccession(succession: GovernanceSuccessionAuthorization): string {
  return createHash("sha256").update(canonicalizeJson(succession), "utf8").digest("hex");
}

export function signGovernanceSuccession(input: {
  succession: GovernanceSuccessionAuthorization;
  governancePrivateJwk: JsonWebKey;
}): string {
  if (!input.governancePrivateJwk.d) throw new Error("governance_private_jwk_required");
  const seed = Buffer.from(input.governancePrivateJwk.d, "base64url");
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const signature = nacl.sign.detached(
    Buffer.from(hashGovernanceSuccession(input.succession), "hex"),
    keyPair.secretKey,
  );
  return Buffer.from(signature).toString("base64url");
}

export function verifyGovernanceSuccession(input: {
  succession: GovernanceSuccessionAuthorization;
  signatureBase64Url: string;
  currentPin: IndependentGovernancePin;
  anchorKeyId: string;
  anchorPublicJwk: JsonWebKey;
  authorityKeys: AuthorityPublicKey[];
  statusSigners: AuthorityPublicKey[];
}): { ok: true; successor: IndependentGovernancePin } | { ok: false; reason: string } {
  if (
    input.succession.document !== GOVERNANCE_SUCCESSION_DOCUMENT
    || input.succession.schema_version !== GOVERNANCE_SUCCESSION_SCHEMA_VERSION
    || input.succession.current_governance_key_id !== input.currentPin.keyId
  ) {
    return { ok: false, reason: "governance_succession_document_invalid" };
  }
  const signed = verifyEd25519Detached({
    message: Buffer.from(hashGovernanceSuccession(input.succession), "hex"),
    signatureBase64Url: input.signatureBase64Url,
    publicJwk: input.currentPin.publicJwk,
  });
  if (!signed) return { ok: false, reason: "governance_succession_signature_invalid" };
  const successor = {
    keyId: input.succession.successor_governance_key_id,
    publicJwk: input.succession.successor_public_jwk,
  };
  const independent = assertIndependentGovernancePin({
    pin: successor,
    anchorKeyId: input.anchorKeyId,
    anchorPublicJwk: input.anchorPublicJwk,
    authorityKeys: input.authorityKeys,
    statusSigners: input.statusSigners,
  });
  if (!independent.ok) return independent;
  if (successor.keyId === input.currentPin.keyId) {
    return { ok: false, reason: "governance_pin_not_independent" };
  }
  return { ok: true, successor };
}
