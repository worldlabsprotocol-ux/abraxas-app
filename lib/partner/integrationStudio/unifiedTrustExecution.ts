import type { IntegrationStudioPathId } from "./contract";

export type IntegrationStudioExecutionMode = "offchain_portable" | "solana_finalized";

const SOLANA_EXECUTION_PATHS = new Set<IntegrationStudioPathId>([
  "solana_gate",
  "onchain_protocol_gate",
  "solana_onchain_eligibility_gate",
  "cross_chain_protocol_access",
  "testnet_gate_deployment",
  "institutional_eligibility_gate",
  "onchain_verifier_conformance",
]);

export function resolveIntegrationStudioExecutionMode(
  pathId: IntegrationStudioPathId,
): IntegrationStudioExecutionMode {
  return SOLANA_EXECUTION_PATHS.has(pathId) ? "solana_finalized" : "offchain_portable";
}

export type UnifiedTrustExecutionJourney = {
  phase: "awaiting_holder_authorization" | "authorized_pending_execution" | "executed" | "expired" | "failed";
  challenge_id: string;
  holder_url: string;
  receipt_id: string | null;
  decision_result: string | null;
  evidence_mode: string | null;
};

export type IllustrativeIndependentVerification = {
  scope?: string;
  disclaimer?: string;
  result?: {
    cryptographically_authentic?: boolean;
    currently_acceptable?: "yes" | "no" | "indeterminate";
    failure_codes?: string[];
  };
};

export function independentlyAccepted(
  verification: IllustrativeIndependentVerification | null | undefined,
): boolean {
  return verification?.result?.cryptographically_authentic === true
    && verification.result.currently_acceptable === "yes";
}

export type PortableDecisionClassification =
  | "allow"
  | "deny"
  | "indeterminate"
  | "revoked_or_stale"
  | "malformed";

export function classifyPortableDecision(
  decisionResult: string | null | undefined,
  verification: IllustrativeIndependentVerification | null | undefined,
): PortableDecisionClassification {
  if (verification?.result?.cryptographically_authentic !== true) return "malformed";
  if (verification.result.currently_acceptable === "no") return "revoked_or_stale";
  if (verification.result.currently_acceptable !== "yes") return "indeterminate";

  const decision = decisionResult?.trim().toLowerCase();
  if (decision === "approved" || decision === "allow") return "allow";
  if (decision === "denied" || decision === "deny") return "deny";
  return "indeterminate";
}

export function buildIntegrationStudioResumeUrl(currentUrl: string, challengeId: string): string {
  const url = new URL(currentUrl);
  url.searchParams.set("trust_execution_challenge", challengeId);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function appendSafeReturnPath(holderUrl: string, returnPath: string): string {
  const url = new URL(holderUrl, "https://abraxas.invalid");
  if (url.origin !== "https://abraxas.invalid") return holderUrl;
  if (!returnPath.startsWith("/") || returnPath.startsWith("//")) return holderUrl;
  url.searchParams.set("return_to", returnPath);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function safeSameOriginReturnPath(value: string | null): string | null {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function shouldContinueAfterHolderAuthorization(deferExecution: string | null): boolean {
  return deferExecution !== "1";
}

export const SOLANA_EXECUTION_PENDING_MESSAGE =
  "This path requires a finalized Solana authorization and consumption transaction. The reviewed program upgrade is not yet deployed, so Abraxas will not report an offchain decision as onchain execution.";

