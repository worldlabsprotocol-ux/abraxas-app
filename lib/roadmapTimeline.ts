// FILE: lib/roadmapTimeline.ts
// Public timeline framing — conservative vs confident copy. No fabricated calendar dates.

export const TIMELINE_DISCLAIMER =
  "We do not publish calendar dates until audits and partner commitments are firm. Stages below describe sequencing, not promises.";

export type TimelineVariant = "conservative" | "confident";

export interface TimelineFraming {
  id: TimelineVariant;
  label: string;
  headline: string;
  body: string;
  bullets: readonly string[];
  whenToUse: string;
}

export const TIMELINE_FRAMINGS: readonly TimelineFraming[] = [
  {
    id: "conservative",
    label: "Conservative (diligence / institutional)",
    headline: "Pilot infrastructure today — open mainnet after audits and external proof",
    body:
      "Use when speaking to banks, title firms, or investors who need fail-closed language. Emphasize what is live, what is devnet, and what gates remain.",
    bullets: [
      "Today: Passport + W3C VC issuance and verify API in production for pilot partners",
      "Today: Sui Passport Move module on devnet — mainnet deployment follows audit",
      "Next: First unaffiliated relying party clears a production transaction",
      "Next: Asset monitoring v1 — state-change signals, not eternal attestations",
      "Full capacity: All seven mainnet readiness gates complete (see checklist)",
    ],
    whenToUse: "Partner diligence, term sheets, regulatory-adjacent conversations",
  },
  {
    id: "confident",
    label: "Confident (operators / builders)",
    headline: "The trust layer is live — mainnet scale is sequencing, not starting from zero",
    body:
      "Use when speaking to tokenization platforms, embedded finance teams, or design partners who can ship on pilot rails now while mainnet hardening completes.",
    bullets: [
      "Real assets and partners already on-registry — Cielo, land deals, integration SDK patterns",
      "Cryptographic trust transfer: counterparties verify credentials, not Abraxas reputation",
      "Integrate now via design partner program; self-serve opens after audit + bounty",
      "On-chain Passport moves to mainnet as audits complete — not a rebuild",
      "Verify once means reuse valid proof — refresh on expiry or material state change",
    ],
    whenToUse: "Integrate page, operator outreach, builder community, X threads",
  },
] as const;

export function getTimelineFraming(variant: TimelineVariant): TimelineFraming {
  const found = TIMELINE_FRAMINGS.find(f => f.id === variant);
  if (!found) throw new Error(`Unknown timeline variant: ${variant}`);
  return found;
}
