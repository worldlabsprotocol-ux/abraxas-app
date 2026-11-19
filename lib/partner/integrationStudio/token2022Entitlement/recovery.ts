export type Token2022EntitlementRecoveryCode =
  | "wrong_wallet"
  | "missing_entitlement"
  | "wrong_policy"
  | "wrong_registry"
  | "unauthorized_issuer"
  | "revoked_receipt"
  | "expired_receipt"
  | "duplicate_issuance"
  | "already_consumed"
  | "missing_trusted_config"
  | "rpc_unavailable"
  | "wallet_signature_rejected"
  | "token2022_unavailable"
  | "evidence_auth_unavailable"
  | "connected_execution_unavailable"
  | "production_entitlement_unavailable"
  | "policy_scope_mismatch"
  | "application_not_found";

export type Token2022RecoveryGuidance = {
  headline: string;
  detail: string;
  next_action: string;
  fail_closed: true;
};

const GUIDANCE: Record<Token2022EntitlementRecoveryCode, Token2022RecoveryGuidance> = {
  wrong_wallet: {
    headline: "Wrong wallet",
    detail: "The connected holder wallet does not match the wallet bound to this entitlement journey.",
    next_action: "Connect the wallet that completed proof verification, then try again.",
    fail_closed: true,
  },
  missing_entitlement: {
    headline: "No entitlement token",
    detail: "The holder token account is missing or empty for this mint.",
    next_action: "Complete verified issuance first, or load the local ProgramTest reference to study the journey.",
    fail_closed: true,
  },
  wrong_policy: {
    headline: "Policy mismatch",
    detail: "The trusted relying-party configuration does not match your authorized sandbox policy.",
    next_action: "Use the policy pinned to your Launchpad application. Studio cannot override trusted scope.",
    fail_closed: true,
  },
  wrong_registry: {
    headline: "Registry mismatch",
    detail: "The proof registry does not match the trusted configuration for this partner.",
    next_action: "Confirm registry admin and partner binding in Launchpad, then re-run proof verification.",
    fail_closed: true,
  },
  unauthorized_issuer: {
    headline: "Unauthorized issuer",
    detail: "The receipt commitment was not signed by the registry-authorized issuer.",
    next_action: "Issue a fresh receipt through your authorized harness path. Do not reuse unverified material.",
    fail_closed: true,
  },
  revoked_receipt: {
    headline: "Receipt revoked",
    detail: "The underlying receipt commitment is revoked on-chain or in current status.",
    next_action: "Request a new verification. Revoked permissions cannot be consumed.",
    fail_closed: true,
  },
  expired_receipt: {
    headline: "Receipt expired",
    detail: "The receipt commitment is past its validity window.",
    next_action: "Run a fresh proof verification before entitlement issuance or consumption.",
    fail_closed: true,
  },
  duplicate_issuance: {
    headline: "Duplicate issuance",
    detail: "This receipt already minted a non-transferable entitlement for the holder.",
    next_action: "Use the existing token or revoke and re-issue through authorized flows only.",
    fail_closed: true,
  },
  already_consumed: {
    headline: "Already consumed",
    detail: "This entitlement was already recorded as consumed for the relying party.",
    next_action: "Issue a new authorized verification if a new action is required.",
    fail_closed: true,
  },
  missing_trusted_config: {
    headline: "Trusted config missing",
    detail: "The partner relying-party configuration PDA is not initialized.",
    next_action: "Initialize trusted config with your partner admin key in a deployed sandbox, or review the local reference.",
    fail_closed: true,
  },
  rpc_unavailable: {
    headline: "RPC unavailable",
    detail: "Authenticated chain verification requires a reachable independent RPC URL.",
    next_action: "Set PARTNER_VERIFY_RPC_URL for CLI attestation, or accept structural-only checks for ProgramTest artifacts.",
    fail_closed: true,
  },
  wallet_signature_rejected: {
    headline: "Wallet signature rejected",
    detail: "The wallet did not authorize the required message or transaction.",
    next_action: "Review the wallet prompt and approve the sandbox-specific request.",
    fail_closed: true,
  },
  token2022_unavailable: {
    headline: "Token-2022 unavailable",
    detail: "This environment does not expose an authorized Token-2022 mint or consume execution path.",
    next_action: "Run the local ProgramTest reference (`npm run test:build-981`) or deploy programs to a connected sandbox.",
    fail_closed: true,
  },
  evidence_auth_unavailable: {
    headline: "Chain attestation not performed",
    detail: "Offline structural checks passed, but authenticated on-chain proof was not established.",
    next_action: "Use partner-verify with PARTNER_VERIFY_RPC_URL for live cluster attestation when programs are deployed.",
    fail_closed: true,
  },
  connected_execution_unavailable: {
    headline: "Connected execution unavailable",
    detail: "Entitlement programs are not deployed and authorized on the configured RPC.",
    next_action: "Continue with the labeled local ProgramTest reference. Mint and consume controls stay disabled here.",
    fail_closed: true,
  },
  production_entitlement_unavailable: {
    headline: "Production entitlement disabled",
    detail: "Receipt-backed Token-2022 entitlements are not enabled on production without separate deployment approval.",
    next_action: "Use sandbox harness proof verification and the independent verification CLI on reference artifacts.",
    fail_closed: true,
  },
  policy_scope_mismatch: {
    headline: "Unauthorized scope change",
    detail: "The browser cannot redefine partner, policy, application, or registry for this journey.",
    next_action: "Configure trusted scope in Launchpad and reload the workspace.",
    fail_closed: true,
  },
  application_not_found: {
    headline: "Application not found",
    detail: "This Launchpad application is not authorized for your partner session.",
    next_action: "Select an application in your sandbox workspace or create a new test app.",
    fail_closed: true,
  },
};

export function token2022EntitlementRecovery(
  code: Token2022EntitlementRecoveryCode,
): Token2022RecoveryGuidance {
  return GUIDANCE[code];
}