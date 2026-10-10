// FILE: examples/good-trouble-wix/backend/flowOwnership.js
// Partner-flow PKCE escrow (purchase gtf_* and browse gtb_*) — verifier sealed server-side;
// recovery requires a fresh flow ownership secret (never gtv/gtb/receipt alone).

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const OWNERSHIP_SECRET_BYTES = 32;
const ESCROW_VERSION = "v1";

/**
 * @param {string} flowId
 * @param {string} ownershipSecret
 * @param {string} pepper
 */
export function hashFlowOwnershipProof(flowId, ownershipSecret, pepper) {
  if (!pepper) {
    throw Object.assign(new Error("pkce_escrow_secret_unavailable"), {
      code: "pkce_escrow_secret_unavailable",
    });
  }
  return createHmac("sha256", pepper)
    .update(`${flowId}:${ownershipSecret}`, "utf8")
    .digest("hex");
}

/**
 * @param {unknown} secret
 * @returns {{ ok: true, secret: string } | { ok: false, code: string }}
 */
export function validateFlowOwnershipSecret(secret) {
  const trimmed = typeof secret === "string" ? secret.trim() : "";
  if (!trimmed) return { ok: false, code: "missing_flow_ownership" };
  if (trimmed.length !== OWNERSHIP_SECRET_BYTES * 2) {
    return { ok: false, code: "invalid_flow_ownership" };
  }
  if (!/^[a-f0-9]+$/.test(trimmed)) {
    return { ok: false, code: "invalid_flow_ownership" };
  }
  return { ok: true, secret: trimmed };
}

function deriveEscrowKey(flowId, ownershipSecret, pepper) {
  return createHmac("sha256", pepper)
    .update(`escrow:${flowId}:${ownershipSecret}`, "utf8")
    .digest();
}

/**
 * @param {{ flowId: string, verifier: string, ownershipSecret: string, pepper: string }} input
 */
export function sealVerifierForFlow(input) {
  const key = deriveEscrowKey(input.flowId, input.ownershipSecret, input.pepper);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(input.verifier, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${ESCROW_VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

/**
 * @param {{ flowId: string, ownershipSecret: string, verifierSealed: string, pepper: string }} input
 */
export function unsealVerifierForFlow(input) {
  const parts = input.verifierSealed.split(":");
  if (parts.length !== 4 || parts[0] !== ESCROW_VERSION) {
    throw new Error("invalid_sealed_verifier");
  }
  const iv = Buffer.from(parts[1], "hex");
  const tag = Buffer.from(parts[2], "hex");
  const enc = Buffer.from(parts[3], "hex");
  const key = deriveEscrowKey(input.flowId, input.ownershipSecret, input.pepper);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
  return plain.toString("utf8");
}

/**
 * @param {{ flowId: string, verifier: string, pepper: string }} input
 */
export function createFlowOwnershipArtifacts(input) {
  const ownershipSecret = randomBytes(OWNERSHIP_SECRET_BYTES).toString("hex");
  const pepper = input.pepper;
  return {
    ownershipSecret,
    ownershipProofHash: hashFlowOwnershipProof(input.flowId, ownershipSecret, pepper),
    verifierSealed: sealVerifierForFlow({
      flowId: input.flowId,
      verifier: input.verifier,
      ownershipSecret,
      pepper,
    }),
  };
}

/** @deprecated Use createFlowOwnershipArtifacts */
export const createPurchaseFlowOwnershipArtifacts = createFlowOwnershipArtifacts;

/**
 * @param {string} expectedHash
 * @param {string} candidateHash
 */
export function ownershipProofHashesMatch(expectedHash, candidateHash) {
  if (typeof expectedHash !== "string" || typeof candidateHash !== "string") return false;
  if (expectedHash.length !== 64 || candidateHash.length !== 64) return false;
  try {
    return timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(candidateHash, "hex"));
  } catch {
    return false;
  }
}
