// Versioned onchain verifier SDK and protocol conformance. Public verifier material only.

import { CHAIN_ATTESTATION_FORBIDDEN_KEYS } from "@/lib/partner/chainAttestation/contract";
import { ONCHAIN_GATE_FORBIDDEN_KEYS } from "@/lib/partner/onchainGateDeployments/contract";
import { INSTITUTIONAL_FORBIDDEN_MANIFEST_KEYS } from "@/lib/partner/testnetGateDeploymentKit/institutional";
import { PORTABLE_ACTION_NOT_EXECUTION } from "@/lib/partner/portableActionContract/contract";
import { ELIGIBILITY_PRESENTATION_NOTICE } from "@/lib/eligibilityPresentation/contract";
import { SELECTIVE_DISCLOSURE_NOTICE } from "@/lib/privacy/selectiveDisclosure/contract";

export const ONCHAIN_VERIFIER_CONFORMANCE_VERSION = "1.0.0" as const;
export const ONCHAIN_VERIFIER_CONFORMANCE_DOCS = "/docs/onchain-verifier-conformance" as const;
export const ONCHAIN_VERIFIER_CONFORMANCE_CLI = "abraxas-conformance" as const;

export const ONCHAIN_VERIFIER_CONFORMANCE_COMMANDS = [
  "evm <manifest>",
  "solana <manifest>",
  "vectors",
  "report <manifest>",
] as const;

export const ONCHAIN_VERIFIER_CONFORMANCE_SEQUENCE = [
  "Download verifier package",
  "Run conformance locally",
  "Fix any failed binding or stale signer",
  "Request a fresh sandbox attestation",
] as const;

export const ONCHAIN_VERIFIER_CONFORMANCE_SAFE_STATES = [
  "not_started",
  "vectors_ready",
  "bindings_failed",
  "signer_stale",
  "conformant_sandbox",
] as const;
export type OnchainVerifierConformanceSafeState = (typeof ONCHAIN_VERIFIER_CONFORMANCE_SAFE_STATES)[number];

export const ONCHAIN_VERIFIER_CONFORMANCE_SAFE_REASONS = [
  "permitted",
  "schema_mismatch",
  "domain_mismatch",
  "prefix_mismatch",
  "length_mismatch",
  "signer_mismatch",
  "signer_update_required",
  "binding_mismatch",
  "institutional_required",
  "expired",
  "replayed",
  "presentation_insufficient",
  "deployment_not_verified",
  "plan_envelope",
  "forbidden_field",
  "unauthorized",
  "invalid",
] as const;
export type OnchainVerifierConformanceReason = (typeof ONCHAIN_VERIFIER_CONFORMANCE_SAFE_REASONS)[number];

export const ONCHAIN_VERIFIER_CONFORMANCE_FORBIDDEN_KEYS = [
  ...CHAIN_ATTESTATION_FORBIDDEN_KEYS,
  ...ONCHAIN_GATE_FORBIDDEN_KEYS,
  ...INSTITUTIONAL_FORBIDDEN_MANIFEST_KEYS,
  "private_key",
  "ubo",
  "beneficial_owner",
  "legal_name",
  "source_receipt",
  "provider_payload",
  "callback_url",
  "rpc_url",
] as const;

export const ONCHAIN_VERIFIER_CONFORMANCE_REPORT_KEYS = [
  "ok",
  "command",
  "gate_type",
  "schema_version",
  "network_id",
  "deployment_ref",
  "signer_key_id",
  "reasons",
  "file_kind",
  "require_institutional",
  "institutional_class",
  "institutional_label",
  "live",
  "from_browser",
] as const;

export const ONCHAIN_VERIFIER_CONFORMANCE_NOTICE =
  "Versioned verifier artifacts and a local conformance suite for partner-owned EVM and Solana eligibility gates. Not a wallet, router, payment path, or custody layer.";

export const ONCHAIN_VERIFIER_CONFORMANCE_ABRAXAS_VERIFIES = [
  "Exact chain-attestation schema version",
  "EIP-712 domain or Solana canonical prefix and length",
  "Trusted signer key ID and public verifier",
  "Partner, policy, action, environment, and deployment bindings",
  "V2 institutional commitments when required",
  "Expiry and one-time nonce / replay",
  "Current public receipt re-fetch",
] as const;

export const ONCHAIN_VERIFIER_CONFORMANCE_PROTOCOL_OWNS = [
  "Deploying and operating the partner-owned gate",
  "Named action after a verified consume",
  "Human-operated testnet deployment and registration",
  "Policy review and production readiness",
] as const;

export const ONCHAIN_VERIFIER_CONFORMANCE_BOUNDARY = [
  PORTABLE_ACTION_NOT_EXECUTION,
  ELIGIBILITY_PRESENTATION_NOTICE,
  SELECTIVE_DISCLOSURE_NOTICE,
  "A presentation is never sufficient. Re-fetch the current public receipt.",
  "No payable methods, token calls, arbitrary CPI, transfers, approvals, wallet creation, or custody.",
].join(" ");
