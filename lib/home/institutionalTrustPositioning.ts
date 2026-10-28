// FILE: lib/home/institutionalTrustPositioning.ts
// Public institutional trust thesis — product-truthful, no implied vendor partnerships.

/** Primary public thesis (architecture chapter and protocol surfaces). */
export const INSTITUTIONAL_TRUST_THESIS = "Trust is continuous.";

/** Institutional lead — what Abraxas enables without replacing custody or vault RBAC. */
export const INSTITUTIONAL_TRUST_LEAD =
  "Abraxas enables applications to make policy-bound trust decisions backed by authoritative evidence, independently verifiable proof, and current authorization.";

/** Distinction repeated in institutional and developer copy. */
export const AUTHENTICITY_VS_AUTHORITY =
  "A valid signature proves authenticity. It does not, by itself, establish that an actor remains authorized to perform an action.";

export const INSTITUTIONAL_TRUST_CLOSURE =
  "Abraxas does not replace institutional control. It makes trust decisions independently verifiable and subject to current authority.";

/** Plain-language questions institutions recognize (everyday wording). */
export const INSTITUTIONAL_PLAIN_QUESTIONS = [
  "What can this person do?",
  "Who approved it?",
  "Does that approval still apply?",
  "Can another system check the result?",
] as const;

/** Problems Abraxas is designed to address — not claims of live integrations. */
export const INSTITUTIONAL_TRUST_PROBLEMS = [
  "Who or what is requesting an action",
  "Which authority grants permission",
  "Whether that authority applies to the requested action",
  "Whether institutional policy is satisfied",
  "Whether supporting evidence is authentic and current",
  "Whether permissions or mandates expired or were revoked",
  "Whether a relying party can verify the result independently",
  "Whether the decision remains acceptable under current conditions",
] as const;

/** Abraxas is not a replacement for these systems (generic — no vendor names). */
export const INSTITUTIONAL_NOT_A_REPLACEMENT_FOR = [
  "Custody infrastructure",
  "MPC signing systems",
  "Vault administration",
  "Treasury management",
  "Existing access-control platforms",
  "Institutional transaction execution engines",
] as const;

/** Four protocol engines in institutional language (distinct but connected). */
export const INSTITUTIONAL_FOUR_ENGINES = [
  {
    id: "evidence",
    title: "Evidence",
    summary: "Is the information authentic, authoritative, relevant to this policy, and sufficiently current?",
  },
  {
    id: "proof",
    title: "Proof",
    summary: "Can another party independently verify the resulting decision without relying on Abraxas's hosted interface?",
  },
  {
    id: "authority",
    title: "Authority",
    summary: "Who is permitted to request, issue, or authorize the relevant action, and within what scope?",
  },
  {
    id: "continuity",
    title: "Continuity",
    summary:
      "Does the evidence and authorization remain acceptable under expiration, revocation, freshness, and recovery conditions?",
  },
] as const;

/** Illustrative institutional use cases — require authoritative evidence; not shipped integrations. */
export const INSTITUTIONAL_USE_CASE_EXAMPLES = [
  {
    id: "delegated-signing",
    title: "Delegated transaction authority",
    body: "Verify a signer’s mandate for a specific transfer under fund policy, with evidence an external party can re-check.",
  },
  {
    id: "treasury-policy",
    title: "Treasury policy eligibility",
    body: "Confirm an action satisfies institutional limits and approvals before your treasury system executes.",
  },
  {
    id: "cross-platform",
    title: "Cross-platform attestations",
    body: "Share policy-bound decisions across custodians, operators, and counterparties without a shared application database.",
  },
  {
    id: "agent-actions",
    title: "Policy-bound automated actions",
    body: "Gate agent or workflow steps on independently verifiable permit, deny, or indeterminate outcomes.",
  },
] as const;

/** Capability gaps — honest limits for integrators (no Utila/custody vendor claims). */
export const INSTITUTIONAL_CAPABILITY_GAPS = [
  "Authoritative institutional role or mandate sources must be supplied by the integrating organization.",
  "Abraxas cannot infer vault permissions or asset authority from a wallet signature alone.",
  "Custody co-signer or webhook integrations are integrator design patterns, not production-certified connectors.",
  "Real-time monitoring of every institutional policy is not implied unless configured and verified for that deployment.",
] as const;
