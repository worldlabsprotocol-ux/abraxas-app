// FILE: lib/partner/integrationStudio/contract.ts
// Public Integration Studio contract. Reuses packs, kit, events, Solana. No parallel verifier.

import { GOOGLE_ACCOUNT_NOT_ELIGIBILITY } from "@/lib/partner/launchpad/policyPacks";
import { PARTNER_EVENT_NOT_AUTHORIZATION } from "@/lib/partner/eventDelivery/contract";
import { SOLANA_NO_FUNDS_BOUNDARY } from "@/lib/partner/solana/contract";
import { TRADING_VENUE_NO_FUNDS_BOUNDARY } from "@/lib/partner/tradingVenue/contract";
import { WALLET_STANDARD_NOT_IDENTITY } from "@/lib/partner/walletStandard/contract";
import { PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY } from "@/lib/partner/paymentAuthorization/contract";
import { PORTABLE_ACTION_NOT_EXECUTION } from "@/lib/partner/portableActionContract/contract";
import { EVM_NO_EXECUTION_BOUNDARY } from "@/lib/partner/evm/contract";

export const INTEGRATION_STUDIO_PATH = "/developers/integration-studio" as const;

export const INTEGRATION_STUDIO_PATHS = [
  "hosted_partner_flow",
  "server_receipt_verify",
  "webhook_events",
  "solana_gate",
  "trading_venue",
  "wallet_standard_binding",
  "payment_authorization",
  "portable_action_contract",
  "evm_partner_adapter",
  "onchain_protocol_gate",
  "solana_onchain_eligibility_gate",
  "evm_onchain_eligibility_gate",
  "eligibility_presentation",
  "cross_chain_protocol_access",
] as const;

export type IntegrationStudioPathId = (typeof INTEGRATION_STUDIO_PATHS)[number];

export const INTEGRATION_STUDIO_CHECKLIST = [
  {
    id: "hosted_verify",
    title: "Hosted verify",
    body: "Redirect the holder to /partner/verify with your partner_id and policy_id. Callback query keys are not authorization.",
  },
  {
    id: "approved_receipt",
    title: "Approved receipt",
    body: "Only a currently valid approved receipt can permit an action. Denied, expired, and revoked receipts fail closed.",
  },
  {
    id: "server_verification",
    title: "Server verification",
    body: "Fetch GET /api/receipts/{id}/public and evaluate with AbraxasPartnerKit on your server.",
  },
  {
    id: "expiry_revocation",
    title: "Expiry and revocation",
    body: "Re-evaluate before each grant. Public GET is not a one-time consume. Handle expired and revoked outcomes.",
  },
  {
    id: "webhook_verification",
    title: "Webhook verification",
    body: "Verify HMAC, ignore duplicates, then fetch the public receipt. A webhook body is never a grant.",
  },
  {
    id: "policy_version",
    title: "Policy version upgrades",
    body: "Pin policyVersion and requirePolicyVersion. Draft, deprecated, missing, and mismatched versions fail closed.",
  },
] as const;

export const INTEGRATION_STUDIO_PROVISION = {
  requires_partner_session: true as const,
  self_serve_sandbox: true as const,
  self_serve_production: false as const,
  create_sandbox_cta: "Create a sandbox integration",
  production_upgrade_cta: "Upgrade to Production after readiness review",
  apply_href: "/design-partner",
  launchpad_href: "/developers/launchpad",
  partner_portal_href: "/developers/partner",
  notice:
    "Signed-in partners can create an isolated sandbox integration through Partner Launchpad. The sandbox key is shown once. Production credentials stay on the reviewed upgrade path.",
};

export const INTEGRATION_STUDIO_GOOGLE = GOOGLE_ACCOUNT_NOT_ELIGIBILITY;
export const INTEGRATION_STUDIO_WEBHOOK_NOTICE = PARTNER_EVENT_NOT_AUTHORIZATION;
export const INTEGRATION_STUDIO_SOLANA_NOTICE = SOLANA_NO_FUNDS_BOUNDARY;
export const INTEGRATION_STUDIO_VENUE_NOTICE = TRADING_VENUE_NO_FUNDS_BOUNDARY;
export const INTEGRATION_STUDIO_WALLET_NOTICE = WALLET_STANDARD_NOT_IDENTITY;
export const INTEGRATION_STUDIO_PAYMENT_NOTICE = PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY;
export const INTEGRATION_STUDIO_PORTABLE_NOTICE = PORTABLE_ACTION_NOT_EXECUTION;
export const INTEGRATION_STUDIO_EVM_NOTICE = EVM_NO_EXECUTION_BOUNDARY;
export const INTEGRATION_STUDIO_ONCHAIN_NOTICE =
  "Holder proves a narrow result privately. Abraxas issues a short-lived signed authorization. The partner’s own contract or program verifies it. The partner’s own code chooses what action to allow. A valid attestation is not a payment, transfer, trade, token approval, gas authorization, or transaction.";
export const INTEGRATION_STUDIO_SOLANA_ONCHAIN_NOTICE =
  "Private holder verification, then the server verifies the current receipt. Abraxas signs a narrow Solana authorization. The partner transaction includes Ed25519 verification immediately before the gate. The partner program consumes that authorization once. Local/reference program only — not deployed to devnet or Mainnet.";
export const INTEGRATION_STUDIO_EVM_ONCHAIN_NOTICE =
  "Private holder verification, then the server verifies the current receipt. Abraxas signs a short-lived EIP-712 authorization. Your partner-owned gate verifies it and consumes the nonce once. Your contract decides what named action may proceed. Not a live deployment, Arc activation, USDC path, or Circle settlement.";
export const INTEGRATION_STUDIO_ELIGIBILITY_PRESENTATION_NOTICE =
  "Request one private eligibility presentation. The partner backend creates the request, the holder completes Hosted Partner Flow and fresh consent, then the backend verifies the signed envelope and re-fetches the current public receipt. A presentation is not a bearer credential, passport, or automatic KYC/KYB approval.";
export const INTEGRATION_STUDIO_CROSS_CHAIN_PROTOCOL_NOTICE =
  "Build a cross-chain protocol gate. Private proof, fresh consent, audience-bound receipt, server re-check, one-time chain authorization, then partner-owned activate_protocol_access. Access is short-lived until attestation expiry. Local/sandbox reference only. Not a live Arc, EVM, Solana, Mainnet, USDC, or Utila deployment.";

export function isIntegrationStudioPathId(value: string): value is IntegrationStudioPathId {
  return (INTEGRATION_STUDIO_PATHS as readonly string[]).includes(value);
}
