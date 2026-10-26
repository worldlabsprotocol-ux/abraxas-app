// FILE: lib/home/protocolPositioningCopy.ts
// Public protocol positioning for homepage (Build #837).

export const PROTOCOL_HERO_TITLE = "Trust decisions. Independently verified.";
export const PROTOCOL_HERO_LEAD =
  "Abraxas turns authoritative evidence into signed, policy bound decisions that applications and protocols can verify independently, without exposing unnecessary personal data.";
export const PROTOCOL_HERO_PRIVACY_SUPPORT =
  "Prove only what a service needs. Holders keep documents private while partners receive a current, policy specific result.";

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
