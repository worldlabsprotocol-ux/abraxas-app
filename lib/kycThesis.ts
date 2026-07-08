// FILE: lib/kycThesis.ts
// Market-facing thesis aligned with Abraxas network vision.

import { ABRAXAS_POSITIONING, NETWORK_ROLES } from "@/lib/abraxasNetwork";

export const PLAIN_LANGUAGE_OPENER =
  "Abraxas is a verification network — not a marketplace, law firm, or music auditor. You prove who you are and what's real once. Partners check that signed proof when a transaction needs trust — instead of making you upload the same documents again.";

export const KYC_DEBT_HEADLINE =
  "Verification debt is the hidden tax on every permissioned on-chain transaction.";

export const KYC_BARRIERS = [
  {
    title: "Trust, liability, and privacy — not upload UX",
    body: "Each platform asks the same person for the same passport because it needs an auditable answer under its own risk rules — not because forms are hard to design.",
  },
  {
    title: "KYC is a stack, not one checkmark",
    body: "Identity, liveness, sanctions, wallet control, accreditation, and asset title are separate claims with different issuers, assurance levels, and expiry.",
  },
  {
    title: "Documents should stay with regulated providers",
    body: "Raw PII cannot live on-chain. The product is signed proof + selective disclosure — share the claim, not the document.",
  },
  {
    title: "Wallet control is a separate problem",
    body: "A verified person is not automatically tied to a wallet. Binding requires a signed challenge and step-up for high-value actions.",
  },
  {
    title: "Partners need policy + audit, not a generic API",
    body: "Verifiers configure their own rules and receive approve / deny / manual review with consent receipts and decision references.",
  },
  {
    title: "Reuse is policy-driven, not forever",
    body: "Passports expire, sanctions lists change, wallet risk shifts. Verify once, refresh only what changed or expired.",
  },
] as const;

export const ABRAXAS_SOLUTION_STEPS = [
  {
    step: "1",
    title: "Issuer verifies once",
    body: `${NETWORK_ROLES.issuer.title}: licensed ID provider, screening firm, or appraiser signs tamper-evident claims.`,
  },
  {
    step: "2",
    title: "Holder controls consent",
    body: `${NETWORK_ROLES.holder.title}: Abraxas Passport shows credentials, expiry, and exactly what each partner will receive.`,
  },
  {
    step: "3",
    title: "Verifier applies policy",
    body: `${NETWORK_ROLES.verifier.title}: policy engine returns approved / denied / manual review with audit trail.`,
  },
  {
    step: "4",
    title: "Selective disclosure",
    body: "Partners receive only the claims their policy requires — never passport images, biometrics, or full profiles by default.",
  },
  {
    step: "5",
    title: "Status check before settlement",
    body: "Decisions are time-bound. Re-check claim status before booking capture, investment, or token transfer.",
  },
  {
    step: "6",
    title: "Enforcement at the action",
    body: "Cielo booking, payment, and RWA transfer gates evaluate live claims — not a static dashboard badge.",
  },
] as const;

export const HYBRID_ARCHITECTURE_SUMMARY = ABRAXAS_POSITIONING.promise;

export const UNIFIED_EXPERIENCE_PRINCIPLES = [
  "I verify once with an approved provider.",
  "I see each claim separately — not one vague KYC badge.",
  "I approve exactly what each partner receives.",
  "My wallet binding is proven by signature, not assumption.",
  "Eligibility is policy-based, issuer-specific, and time-bound.",
] as const;

export const OLD_VS_NEW_FLOW = {
  old: [
    "User uploads passport → Platform A stores it",
    "User uploads passport again → Platform B stores it",
    "User uploads passport again → Platform C stores it",
  ],
  new: [
    "User completes strong verification once with a trusted issuer",
    "Issuer signs proof to the holder's Abraxas Passport",
    "User shares only required claims with Platform A, B, or C",
    "Each platform applies its policy and keeps an audit record",
  ],
} as const;
