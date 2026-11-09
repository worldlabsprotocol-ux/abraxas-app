// Curated homepage discovery. Explanatory copy only — no customers, approvals, or live results.

export const HOMEPAGE_DISCOVERY_OPENING_MS = 5_000;
export const HOMEPAGE_DISCOVERY_CHAPTER_MS = 7_000;
export const HOMEPAGE_DISCOVERY_PILLAR_MS = 3_500;

export const HOMEPAGE_DISCOVERY_CTA_NOTE =
  "Start building opens the sandbox on this page. You can read how a decision is assembled before connecting a wallet. This page does not issue a live approval.";

export const HOMEPAGE_DISCOVERY_CHAPTERS = [
  {
    id: "opening",
    label: "Opening",
    description: "The Abraxas presentation",
  },
  {
    id: "story",
    label: "The decision",
    description: "Why a signature is not enough, and the four ideas that complete it",
  },
  {
    id: "how-it-works",
    label: "How Abraxas works",
    description: "Protocol architecture and independent verification",
  },
  {
    id: "begin",
    label: "What you start",
    description: "What happens after Start building, and the kinds of questions the product is built to answer",
  },
] as const;

export const HOMEPAGE_DISCOVERY_PROBLEM = {
  eyebrow: "The problem",
  title: "A signature is not the whole decision.",
  body: "A signature shows who signed. It does not, by itself, show that they were authorized for this action, or that the evidence is still valid.",
  product:
    "Abraxas helps a system produce a trust-sensitive authorization decision, and lets another system check that decision without trusting this website.",
} as const;

export const HOMEPAGE_DISCOVERY_PILLARS = [
  {
    id: "evidence",
    label: "Evidence",
    summary: "Where the supporting information came from, and whether it is still valid.",
    detail: "The decision names the evidence it used. Expired or revoked evidence means the decision is no longer acceptable.",
  },
  {
    id: "authority",
    label: "Authority",
    summary: "Who had the legitimate right to authorize this action.",
    detail: "The signer has to be the authority for this environment and this action. A demo authority does not authorize a production decision.",
  },
  {
    id: "proof",
    label: "Proof",
    summary: "How another system checks the decision without trusting Abraxas to say it is true.",
    detail: "The other system checks the signature, the issuer statement, and the current status with keys it already trusts.",
  },
  {
    id: "continuity",
    label: "Continuity",
    summary: "Expiration, revocation, freshness, and replay protection.",
    detail: "A replayed, expired, revoked, or rolled-back result is rejected even when the original signature was valid.",
  },
] as const;

export const HOMEPAGE_DISCOVERY_BEGIN = {
  eyebrow: "How to begin",
  title: "Start building when the decision makes sense.",
  body: "The button moves you to the sandbox on this page. You can inspect the path from a policy question to a checkable result. Connecting a wallet is not required to understand the product.",
  examplesTitle: "The kind of question it is built to answer",
  examples: [
    "A financial institution can ask whether an action is still authorized.",
    "A developer can check the decision in their own system.",
    "A digital asset platform can separate a signature from current permission.",
  ],
  disclaimer: "These are examples of the question, not customers, live transactions, or completed verifications.",
} as const;
