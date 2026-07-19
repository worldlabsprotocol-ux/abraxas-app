// FILE: lib/authenticationProof/loopStatus.ts
// What is live vs what still requires Move redeploy / env configuration.

export const AUTHENTICATION_PROOF_LOOP_STATUS = {
  live: [
    "POST /api/credentials/verify returns authentication_proof + decision_receipt on every decision",
    "GET /api/proof/[id] returns signature_valid + public_key for independent verification",
    "GET /api/proof/reference/[assetId] issues production reference proof (Cielo · Chickasaw)",
    "Intake flows (inquire, apply, bounty) issue signed authentication proofs",
    "Asset monitoring apply path issues asset_state_change proofs",
  ],
  requiresMoveRedeploy: [
    "anchor_status: anchored on Sui (needs anchor_authentication_proof in deployed Move package)",
  ],
  envFlags: {
    ABRAXAS_SIGNING_KEY: "Required for signed proofs (falls back to unsigned without it)",
    ABRAXAS_PUBLIC_KEY: "Required for GET /api/proof signature_valid verification",
    ON_CHAIN_ANCHOR_ENABLED: "Set false to skip Sui anchor attempts",
    SUI_SPONSOR_SECRET_KEY: "Required for on-chain anchor transactions",
    ASSET_MONITORING_AUTO_APPLY: "Set true for cron feed auto-apply + state-change proofs",
  },
} as const;
