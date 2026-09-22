export const SOLANA_DEVNET_TEST_PLAN = {
  title: "Human-run Solana devnet gate path",
  live: false as const,
  steps: [
    "Build the reviewed V2 eligibility-gate ELF and confirm its keccak digest matches the approved registry artifact before verify/register.",
    "Complete Hosted Partner Flow for the sandbox policy.",
    "Re-fetch GET /api/receipts/{id}/public and require currently_valid.",
    "Issue a chain attestation bound to the verified deployment_ref.",
    "Place Ed25519 verify immediately before authorize, then activate_protocol_access.",
    "Replay the same nonce; expect replay rejection.",
    "Wait until valid_until; expect assert_protocol_access inactive.",
  ],
  expected_safe_outputs: [
    "authorization PDA consumed once",
    "protocol access valid_until copied from expires_at",
    "no SOL transfer, mint, or token CPI",
  ],
  failure_cases: [
    "missing --confirm on deploy",
    "solana_mainnet target",
    "unverified manifest register",
    "tampered program_digest",
    "expired or revoked receipt",
  ],
};

export const EVM_TESTNET_TEST_PLAN = {
  title: "Human-run EVM testnet gate path",
  live: false as const,
  steps: [
    "Complete Hosted Partner Flow for the sandbox policy.",
    "Re-fetch GET /api/receipts/{id}/public and require currently_valid.",
    "Issue an EIP-712 attestation bound to the verified deployment_ref.",
    "Call consumeEligibility then activateProtocolAccess on the partner-owned contracts.",
    "Replay the nonce; expect replay rejection.",
    "Advance past expiresAt; expect hasAccess false.",
  ],
  expected_safe_outputs: [
    "gate nonce consumed once",
    "validUntil copied from attestation expiresAt",
    "no ETH/token transfer, mint, or approval",
  ],
  failure_cases: [
    "missing --confirm on deploy",
    "evm_mainnet or arc_circle_mainnet",
    "unpublished Arc chain ID",
    "bytecode or config digest mismatch",
    "expired or revoked receipt",
  ],
};

export const INSTITUTIONAL_TESTNET_TEST_PLAN = {
  title: "Human-run V2 institutional testnet gate path",
  live: false as const,
  utila_integration: false as const,
  steps: [
    "Institutional policy review required",
    "Create V2 testnet deployment plan",
    "Human deploys gate",
    "Verify exact deployed configuration",
    "Register verified sandbox deployment",
    "Request a fresh institutional presentation and chain attestation",
  ],
  expected_safe_outputs: [
    "opaque organization and actor commitments only",
    "expiry-bound protocol access, no permanent entitlement",
    "no legal name, documents, UBOs, wallets, RPC URLs, or signatures in the plan",
  ],
  failure_cases: [
    "missing --confirm on institutional deploy",
    "mainnet or unpublished Arc",
    "static organization or actor commitment on the deployment plan",
    "attestation expiry or missing institutional fields at authorize",
    "register before verified_sandbox",
  ],
};
