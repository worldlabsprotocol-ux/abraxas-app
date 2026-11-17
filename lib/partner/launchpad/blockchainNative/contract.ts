/** Explicit opt-in — never replaces `launchpadUsesSovereignPostgres()` on the default path. */
export function isBlockchainNativePrototypeEnabled(): boolean {
  return process.env.ABRAXAS_BLOCKCHAIN_NATIVE_PROTOTYPE === "1";
}

export const BLOCKCHAIN_NATIVE_ADAPTER_LABEL = "abraxas_blockchain_native_launchpad/0.1";

/** Authoritative on-chain (local prototype program). */
export const CHAIN_NATIVE_AUTHORITATIVE = [
  "sandbox_wallet_binding",
  "execution_ledger_nonce",
  "receipt_payload_commitment",
  "receipt_status_version",
  "scope_partner_policy_application",
] as const;

/** Still required off-chain / not eliminated by this prototype. */
export const POSTGRES_OR_HOST_RETAINED = [
  "partner_org_membership",
  "launchpad_operator_sessions",
  "private_evidence_storage",
  "full_application_configuration_ui",
  "audit_log_retention",
  "demo_hosted_verifier_ui",
] as const;

/** Eliminated only on the blockchain-native adapter path (not default Launchpad). */
export const POSTGRES_ELIMINATED_ON_ADAPTER_PATH = [
  "harness_verification_request_row",
  "partner_launchpad_signed_receipts_insert",
  "replay_nonce_in_database",
  "sovereign_verification_execution_transaction",
] as const;

/** Evidence availability: signed portable export + integrator custody (not chain-only hashes). */
export const OFF_CHAIN_EVIDENCE_MECHANISM =
  "Signed decision receipt JSON (portable export) held by integrator or holder; on-chain stores payload hash + status continuity only.";