// FILE: lib/home/protocolPositioningCopy.ts
// Public protocol positioning for homepage.

export const PROTOCOL_HERO_TITLE = "Trust decisions. Independently verified.";
export const PROTOCOL_HERO_LEAD =
  "Abraxas turns authoritative evidence into signed trust decisions that applications can independently verify.";

export const PROTOCOL_SECTION_EYEBROW = "Protocol";
export const PROTOCOL_SECTION_TITLE = "Trust you can verify.";
export const PROTOCOL_SECTION_CONSOLIDATED_GUARANTEE =
  "Policy evaluation, issuer authority, freshness, and revocation remain enforced within the protocol, without separate paragraphs for every guarantee.";

export const PROTOCOL_PUBLIC_PILLARS = [
  {
    id: "evidence",
    label: "Evidence",
    summary: "Authenticated inputs evaluated against policy.",
  },
  {
    id: "decision",
    label: "Decision",
    summary: "A scoped result signed by Abraxas.",
  },
  {
    id: "verify",
    label: "Verify",
    summary: "Applications independently validate and enforce the result.",
  },
] as const;

/** Full sequence for progressive disclosure and developer docs. */
export const PROTOCOL_FLOW_STAGES = [
  { id: "evidence", label: "Evidence", summary: "Authenticated inputs evaluated under policy." },
  { id: "policy", label: "Policy", summary: "Requirements decide what may be approved." },
  { id: "decision", label: "Decision", summary: "Abraxas signs an approved or denied result." },
  { id: "verify", label: "Verify", summary: "Relying parties check signatures and current validity." },
  { id: "enforce", label: "Enforce", summary: "Partners apply the result in their own systems." },
] as const;

export const PROTOCOL_FLOW_TAGLINE =
  "One protocol. From authoritative evidence to independently enforced trust.";

export const PROTOCOL_GUARANTEES = [
  {
    id: "evidence",
    title: "Evidence integrity",
    body: "Decisions use authenticated, policy appropriate evidence on issuer controlled paths.",
  },
  {
    id: "authority",
    title: "Issuer authority",
    body: "Receipts authenticate against established signing authority and registry policy.",
  },
  {
    id: "validity",
    title: "Current validity",
    body: "Expiration, revocation, and signed status determine whether a result remains acceptable.",
  },
  {
    id: "verification",
    title: "Independent verification",
    body: "Relying parties validate portable evidence without Abraxas as an online enforcement dependency.",
  },
] as const;

export const PROTOCOL_DEVELOPER_INTEGRATION_STEPS = [
  "Application requests verification",
  "Holder authorizes the required action",
  "Abraxas evaluates policy and issues a signed decision",
  "Application receives portable verification evidence",
  "Independent verifier evaluates issuer authority and current status",
  "Application enforces permit, deny, or indeterminate",
] as const;
