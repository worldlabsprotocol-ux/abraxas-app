// FILE: lib/abraxasNetwork.ts
// Abraxas portable eligibility network — issuer / holder / verifier model,
// claim stack taxonomy, credential lifecycle, and three product layers.
// Single source of truth for positioning across site, passport, and partner API.

import type { ProductStatus } from "@/lib/passportLayers";

export type NetworkRole = "issuer" | "holder" | "verifier";

export const NETWORK_ROLES: Record<
  NetworkRole,
  { title: string; description: string; examples: string[] }
> = {
  issuer: {
    title: "Issuer",
    description:
      "The party that verifies a fact and signs a tamper-evident claim. Abraxas coordinates issuers — it is not the only issuer.",
    examples: [
      "Licensed ID provider (Veriff)",
      "Accredited-investor verification firm",
      "Chain analytics / wallet-risk provider",
      "Appraiser, title company, or attorney for asset attestations",
    ],
  },
  holder: {
    title: "Holder",
    description:
      "The user or business that controls the credential. Abraxas Passport is the interface to review, consent, share, and revoke.",
    examples: [
      "Review active claims and issuers",
      "Approve selective disclosure per partner request",
      "Bind and revoke wallets",
      "Re-verify when credentials expire",
    ],
  },
  verifier: {
    title: "Verifier",
    description:
      "The marketplace, lender, issuer, or protocol that needs an auditable eligibility decision before allowing an action.",
    examples: [
      "RWA offering subscription gate",
      "Booking or high-value settlement policy",
      "Token transfer eligibility check",
      "Lending or collateral onboarding",
    ],
  },
};

/** Credential lifecycle — every claim moves through these states */
export type CredentialLifecycleState =
  | "draft"
  | "issued"
  | "active"
  | "suspended"
  | "revoked"
  | "expired"
  | "reissued";

export const CREDENTIAL_LIFECYCLE: {
  state: CredentialLifecycleState;
  label: string;
  description: string;
}[] = [
  { state: "draft", label: "Draft", description: "Check initiated, not yet issued." },
  { state: "issued", label: "Issued", description: "Provider completed the check; signed claim recorded." },
  { state: "active", label: "Active", description: "Partners may rely on it under their policy." },
  { state: "suspended", label: "Suspended", description: "Temporarily unavailable while a concern is investigated." },
  { state: "revoked", label: "Revoked", description: "Must no longer be trusted." },
  { state: "expired", label: "Expired", description: "Must be refreshed before high-risk actions." },
  { state: "reissued", label: "Reissued", description: "Updated proof replaces an older credential." },
];

export type ClaimLayer = "identity" | "wallet" | "investor" | "business" | "asset" | "transfer";

export interface ClaimStackEntry {
  claim_type: string;
  layer: ClaimLayer;
  question: string;
  example_value: string;
  status: ProductStatus;
  issuer_types: string[];
  typical_ttl: string;
  /** Never sent to partners by default */
  never_disclosed?: boolean;
}

/**
 * KYC is not one green checkmark — each layer is an independent signed claim.
 * A "KYC verified" badge must never imply all of these.
 */
export const CLAIM_STACK: ClaimStackEntry[] = [
  {
    claim_type: "identity_verified",
    layer: "identity",
    question: "Is this a real person?",
    example_value: "true · assurance L2",
    status: "pilot",
    issuer_types: ["Licensed ID provider"],
    typical_ttl: "12 months",
  },
  {
    claim_type: "liveness_passed",
    layer: "identity",
    question: "Is a live human completing this?",
    example_value: "true",
    status: "pilot",
    issuer_types: ["Licensed ID provider"],
    typical_ttl: "12 months",
  },
  {
    claim_type: "government_id_verified",
    layer: "identity",
    question: "Is the ID document authentic?",
    example_value: "passport · US",
    status: "pilot",
    issuer_types: ["Licensed ID provider"],
    typical_ttl: "12 months",
  },
  {
    claim_type: "residency_country",
    layer: "identity",
    question: "Where does this person live?",
    example_value: "US",
    status: "pilot",
    issuer_types: ["Licensed ID provider"],
    typical_ttl: "12 months",
  },
  {
    claim_type: "screening_outcome",
    layer: "identity",
    question: "Is this person or entity prohibited?",
    example_value: "clear · pending_partner_screen",
    status: "partner_gated",
    issuer_types: ["Sanctions / AML provider"],
    typical_ttl: "24 hours",
  },
  {
    claim_type: "risk_review",
    layer: "identity",
    question: "Is enhanced review needed (PEP / adverse media)?",
    example_value: "required · clear",
    status: "partner_gated",
    issuer_types: ["Screening provider"],
    typical_ttl: "24 hours",
  },
  {
    claim_type: "wallet_binding_confirmed",
    layer: "wallet",
    question: "Does this user control this wallet now?",
    example_value: "0x… · signed challenge",
    status: "live",
    issuer_types: ["Abraxas network"],
    typical_ttl: "30 days (step-up for high value)",
  },
  {
    claim_type: "wallet_risk_band",
    layer: "wallet",
    question: "Has this wallet touched risky funds?",
    example_value: "low · medium · high",
    status: "partner_gated",
    issuer_types: ["Chain analytics provider"],
    typical_ttl: "24 hours",
  },
  {
    claim_type: "accredited_status",
    layer: "investor",
    question: "Can they enter a private offering?",
    example_value: "valid · expired",
    status: "partner_gated",
    issuer_types: ["Accredited verification firm"],
    typical_ttl: "90 days",
  },
  {
    claim_type: "product_eligibility",
    layer: "investor",
    question: "Is the product appropriate for them?",
    example_value: "approved · manual_review",
    status: "planned",
    issuer_types: ["Issuer / broker-dealer"],
    typical_ttl: "Per offering",
  },
  {
    claim_type: "kyb_verified",
    layer: "business",
    question: "Is this company real?",
    example_value: "entity · jurisdiction",
    status: "pilot",
    issuer_types: ["KYB provider / manual review"],
    typical_ttl: "12 months",
  },
  {
    claim_type: "ubo_verified",
    layer: "business",
    question: "Who controls the company?",
    example_value: "beneficial owners attested",
    status: "planned",
    issuer_types: ["KYB provider"],
    typical_ttl: "12 months",
  },
  {
    claim_type: "asset_ownership_reviewed",
    layer: "asset",
    question: "Does the seller own the asset?",
    example_value: "asset_id · reviewed",
    status: "pilot",
    issuer_types: ["Abraxas review / title firm"],
    typical_ttl: "Per asset",
  },
  {
    claim_type: "asset_title_verified",
    layer: "asset",
    question: "Is title chain and lien status confirmed?",
    example_value: "title · lien search",
    status: "planned",
    issuer_types: ["Title company / attorney"],
    typical_ttl: "Per asset",
  },
  {
    claim_type: "transfer_eligibility",
    layer: "transfer",
    question: "May this wallet receive this token?",
    example_value: "true · blocked",
    status: "planned",
    issuer_types: ["Policy engine + on-chain program"],
    typical_ttl: "Per transaction",
  },
];

/** Fields that must never leave the regulated provider / encrypted store */
export const NEVER_SHARED_WITH_PARTNERS = [
  "Passport image",
  "Passport number",
  "Full date of birth",
  "Home address",
  "Selfie / biometric template",
  "Tax documents",
  "Investor financial evidence",
  "Raw screening reports",
  "Corporate formation originals",
] as const;

export type PolicyDecision = "approved" | "denied" | "manual_review";

export const POLICY_DECISIONS: Record<
  PolicyDecision,
  { label: string; description: string; color: string }
> = {
  approved: {
    label: "Approved",
    description: "All required claims satisfied under partner policy version.",
    color: "#10B981",
  },
  denied: {
    label: "Denied",
    description: "One or more required claims missing, expired, or failed.",
    color: "#EF4444",
  },
  manual_review: {
    label: "Manual review",
    description: "Edge case — human review required before settlement.",
    color: "#F59E0B",
  },
};

/** Three connected product layers — the actual Abraxas product */
export const NETWORK_PRODUCTS = [
  {
    id: "passport",
    title: "Abraxas Passport",
    role: "holder" as NetworkRole,
    status: "live" as ProductStatus,
    tagline: "User-facing credential wallet, consent, and re-verification queue.",
    capabilities: [
      "Credential dashboard with issuer + expiry",
      "Selective disclosure consent ceremony",
      "Wallet binding and revocation",
      "Partner access history",
      "Status re-check before settlement",
    ],
  },
  {
    id: "trust_registry",
    title: "Abraxas Trust Registry",
    role: "issuer" as NetworkRole,
    status: "pilot" as ProductStatus,
    tagline: "Which issuers are trusted for which claims — a credential is only valuable if the verifier trusts the issuer.",
    capabilities: [
      "Issuer onboarding standards",
      "Public keys + supported schemas",
      "Assurance tiers per claim type",
      "Jurisdiction acceptance rules",
      "Issuer suspension / audit status",
    ],
  },
  {
    id: "policy_engine",
    title: "Abraxas Policy Engine",
    role: "verifier" as NetworkRole,
    status: "live" as ProductStatus,
    tagline: "Partners configure eligibility rules — Abraxas returns approve / deny / manual review plus audit trail.",
    capabilities: [
      "Versioned partner policies",
      "Rules evaluator on live claims",
      "Partner verifier API v1",
      "Consent receipts + decision logs",
      "Pre-settlement status check",
    ],
  },
] as const;

export const ABRAXAS_POSITIONING = {
  category:
    "Portable eligibility and verification network for permissioned on-chain finance.",
  notThis: [
    "We do KYC",
    "We replace banks",
    "We have universal compliance",
    "One green checkmark for everything",
  ],
  promise:
    "Verify once with approved providers, reuse eligible credentials across participating applications — share the proof, not the documents.",
  proofNotDocuments:
    "Share the proof, not the documents. Partners receive only the claims their policy requires.",
  eligibilityDisclaimer:
    "Eligibility is policy-based, issuer-specific, and time-bound. Verification status does not guarantee eligibility for every product, jurisdiction, or partner.",
  refreshPromise:
    "Verify once, reuse what remains valid, and refresh only what changed or expired.",
  launchWedge:
    "Portable eligibility for permissioned RWA transactions within the Abraxas network — identity, sanctions, wallet binding, and accredited status as separate claims.",
} as const;

export function claimsByLayer(layer: ClaimLayer): ClaimStackEntry[] {
  return CLAIM_STACK.filter(c => c.layer === layer);
}

export function getClaimStackEntry(claimType: string): ClaimStackEntry | undefined {
  return CLAIM_STACK.find(c => c.claim_type === claimType);
}
