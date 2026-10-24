/**
 * Minimal relying-party integration surface (Build #821).
 * Copy this module alongside @abraxas/independent-verifier in your application.
 */
import {
  verifyAbraxasReceiptIndependently,
  type DecisionReceiptRecord,
  type IndependentVerificationResult,
  type SignedIssuerAuthorityStatement,
  type SignedReceiptStatusStatement,
  type TrustAnchorBundleV1,
} from "../../packages/abraxas-independent-verifier/src/index";

export type RelyingPartyScope = {
  partner_id: string;
  policy_id: string;
  environment: "demo" | "production";
};

export type PortableDecisionArtifacts = {
  record: DecisionReceiptRecord;
  pinnedTrustAnchor: TrustAnchorBundleV1;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  signedStatusStatement: SignedReceiptStatusStatement;
};

export type VerifyPortableDecisionInput = PortableDecisionArtifacts & {
  relyingParty: RelyingPartyScope;
  /** Verifier clock for freshness checks (defaults to now). */
  statementObservedAt?: string;
  /** Anti-rollback checkpoint when the RP has seen a newer status version. */
  minimumStatusVersion?: number;
  minimumRegistryVersion?: number;
};

export function verifyPortableDecision(input: VerifyPortableDecisionInput): IndependentVerificationResult {
  return verifyAbraxasReceiptIndependently({
    record: input.record,
    pinnedTrustAnchor: input.pinnedTrustAnchor,
    signedIssuerAuthority: input.signedIssuerAuthority,
    relyingParty: input.relyingParty,
    statementObservedAt: input.statementObservedAt ?? new Date().toISOString(),
    signedStatusStatement: input.signedStatusStatement,
    minimumStatusVersion: input.minimumStatusVersion,
    minimumRegistryVersion: input.minimumRegistryVersion,
  });
}

export function permitScopedAction(result: IndependentVerificationResult): boolean {
  return result.currently_acceptable === "yes";
}

export function integrationFailureSummary(result: IndependentVerificationResult): string[] {
  const lines: string[] = [];
  if (result.failure_codes.length) lines.push(...result.failure_codes);
  if (result.currently_acceptable !== "yes") {
    lines.push(`currently_acceptable=${result.currently_acceptable}`);
  }
  return Array.from(new Set(lines));
}
