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

export function shouldContinueAfterHolderAuthorization(deferExecution: string | null): boolean {
  return deferExecution !== "1";
}

export const SOLANA_EXECUTION_PENDING_MESSAGE =
  "This path requires a finalized Solana authorization and consumption transaction. The reviewed program upgrade is not yet deployed, so Abraxas will not report an offchain decision as onchain execution.";
