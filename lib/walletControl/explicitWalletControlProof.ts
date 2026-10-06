// FILE: lib/walletControl/explicitWalletControlProof.ts
// Canonical explicit wallet-control proof classification — not account binding alone.

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { WalletBindingAuthorityRow } from "@/lib/walletControl/claimBindingLineage";

/** Proof mechanisms that satisfy post-revocation wallet-control recovery. */
export const QUALIFYING_EXPLICIT_WALLET_CONTROL_PROOF_METHODS = [
  "siwe",
  "siwe_evm",
  "signed_challenge",
  "wallet_standard",
] as const;

export type QualifyingExplicitWalletControlProofMethod =
  (typeof QUALIFYING_EXPLICIT_WALLET_CONTROL_PROOF_METHODS)[number];

export type WalletControlProofClass = "explicit" | "account_binding" | "ambiguous";

export interface WalletControlProofClassification {
  proofClass: WalletControlProofClass;
  method: string | null;
}

function claimValueString(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const raw = value[key];
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

function resolveProofMethod(
  claim: Pick<CredentialClaimRecord, "claim_value">,
  binding: WalletBindingAuthorityRow | null | undefined,
): string | null {
  const value = (claim.claim_value ?? {}) as Record<string, unknown>;
  return claimValueString(value, "control_method")
    ?? claimValueString(value, "binding_method")
    ?? binding?.binding_method
    ?? null;
}

/**
 * Classify whether a claim represents explicit cryptographic wallet-control proof
 * versus account/session binding (e.g. zkLogin repair).
 */
export function classifyExplicitWalletControlProof(
  claim: Pick<CredentialClaimRecord, "claim_value">,
  binding?: WalletBindingAuthorityRow | null,
): WalletControlProofClassification {
  const value = (claim.claim_value ?? {}) as Record<string, unknown>;
  const method = resolveProofMethod(claim, binding);
  const challengeId = claimValueString(value, "challenge_id");
  const proofSignature = claimValueString(value, "proof_signature");

  if (method === "zklogin") {
    return { proofClass: "account_binding", method: "zklogin" };
  }

  if (method === "signed_challenge") {
    if (challengeId || proofSignature) {
      return { proofClass: "explicit", method: "signed_challenge" };
    }
    return { proofClass: "ambiguous", method: "signed_challenge" };
  }

  if (method === "siwe" || method === "siwe_evm") {
    const bindingProof = binding?.proof_signature ?? null;
    if (proofSignature || challengeId || bindingProof) {
      return { proofClass: "explicit", method: method ?? "siwe" };
    }
    return { proofClass: "ambiguous", method: method ?? "siwe" };
  }

  if (method === "wallet_standard") {
    if (challengeId || proofSignature) {
      return { proofClass: "explicit", method: "wallet_standard" };
    }
    return { proofClass: "ambiguous", method: "wallet_standard" };
  }

  if (challengeId && proofSignature) {
    return { proofClass: "explicit", method: method ?? "signed_message" };
  }
  if (proofSignature) {
    return { proofClass: "explicit", method: method ?? "signed_message" };
  }

  return { proofClass: "ambiguous", method };
}

export function isQualifyingExplicitWalletControlProof(
  claim: Pick<CredentialClaimRecord, "claim_value">,
  binding?: WalletBindingAuthorityRow | null,
): boolean {
  return classifyExplicitWalletControlProof(claim, binding).proofClass === "explicit";
}
