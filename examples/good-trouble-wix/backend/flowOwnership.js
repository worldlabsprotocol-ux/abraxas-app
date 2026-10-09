// FILE: examples/good-trouble-wix/backend/flowOwnership.js
// Purchase-flow PKCE escrow — verifier sealed server-side; recovery requires flow ownership secret (never gtv/receipt alone).

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const OWNERSHIP_SECRET_BYTES = 32;
const ESCROW_VERSION = "v1";

/** @type {string | null} */
let configuredEscrowPepper = null;

export function configureFlowEscrowPepper(pepper) {
  configuredEscrowPepper = typeof pepper === "string" && pepper.trim()
    ? pepper.trim()
    : null;
}

function resolveEscrowPepper() {
  if (configuredEscrowPepper) return configuredEscrowPepper;
  const fromEnv = process.env.GOOD_TROUBLE_PKCE_ESCROW_PEPPER?.trim();
  if (fromEnv) return fromEnv;
  return "good-trouble-wix-pkce-escrow-pepper-v1";
}

/**
 * @param {string} flowId
 * @param {string} ownershipSecret
 * @param {string} [pepper]
 */
export function hashFlowOwnershipProof(flowId, ownershipSecret, pepper = resolveEscrowPepper()) {
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
 * @param {{ flowId: string, verifier: string, ownershipSecret: string, pepper?: string }} input
 */
export function sealVerifierForFlow(input) {
  const pepper = input.pepper ?? resolveEscrowPepper();
  const key = deriveEscrowKey(input.flowId, input.ownershipSecret, pepper);
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
 * @param {{ flowId: string, ownershipSecret: string, verifierSealed: string, pepper?: string }} input
 */
export function unsealVerifierForFlow(input) {
  const pepper = input.pepper ?? resolveEscrowPepper();
  const parts = input.verifierSealed.split(":");
  if (parts.length !== 4 || parts[0] !== ESCROW_VERSION) {
    throw new Error("invalid_sealed_verifier");
  }
  const iv = Buffer.from(parts[1], "hex");
  const tag = Buffer.from(parts[2], "hex");
  const enc = Buffer.from(parts[3], "hex");
  const key = deriveEscrowKey(input.flowId, input.ownershipSecret, pepper);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
  return plain.toString("utf8");
}

/**
 * @param {{ flowId: string, verifier: string, pepper?: string }} input
 */
export function createPurchaseFlowOwnershipArtifacts(input) {
  const ownershipSecret = randomBytes(OWNERSHIP_SECRET_BYTES).toString("hex");
  const pepper = input.pepper ?? resolveEscrowPepper();
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
