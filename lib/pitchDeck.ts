// FILE: lib/pitchDeck.ts
// Plain-language story deck — bottleneck, not fundraising. No solicitation copy.

export interface PitchSlide {
  id: string;
  title: string;
  bullets: string[];
  highlight?: string;
  link?: { label: string; href: string };
}

export const PITCH_DECK: PitchSlide[] = [
  {
    id: "nft-era",
    title: "When value lived on the chain",
    bullets: [
      "2020: artists put work on chain — the token was the product",
      "Price and hype built inside the marketplace",
      "A collection badge on OpenSea was enough — nobody had to prove a real-world thing",
    ],
    highlight: "Verification was optional because value accrued in the token itself.",
  },
  {
    id: "rwa-shift",
    title: "Real assets flip the problem",
    bullets: [
      "Hundreds of billions in property, credit, and commodities are heading on chain",
      "The value still lives in the real world — rent, land, cash flow, title",
      "The token is a pointer — not the asset",
    ],
    highlight: "Industry forecasts massive RWA growth — the bridge is the bottleneck.",
  },
  {
    id: "gray-area",
    title: "Where it gets messy in real life",
    bullets: [
      "Land development: tribes, title, appraisals, local rules — not one clean PDF",
      "Every lender and marketplace asks the same questions again",
      "Trust stops at each new login screen",
    ],
    highlight: "The gap is not technology — it is repeatable proof that survives handoffs.",
  },
  {
    id: "bottleneck",
    title: "The broken bridge",
    bullets: [
      "Someone says: I own this asset",
      "A platform says: prove it — upload everything again",
      "Documents, IDs, and wallet checks do not travel",
    ],
    highlight: "If the chain says yes but reality says maybe, the whole stack wobbles.",
  },
  {
    id: "abraxas",
    title: "What Abraxas is for",
    bullets: [
      "Verify once — bind wallet, identity, and asset claims when needed",
      "Carry a small proof — not another folder of scans",
      "Partners ask a policy question — you consent — they get yes, no, or review",
    ],
    link: { label: "Why verification", href: "/docs/why-verification" },
  },
  {
    id: "live-proof",
    title: "Live today: Cielo Sunrise",
    bullets: [
      "Real hospitality property — public booking and payment flow",
      "Shows what was checked — not marketing fluff",
      "Receipt-style outcome partners can re-check later",
    ],
    link: { label: "Cielo case study", href: "/case-studies/cielo" },
  },
  {
    id: "network",
    title: "Built for partners — not another marketplace",
    bullets: [
      "Issuers sign claims · holders control consent · partners evaluate policy",
      "Same proof can gate booking, listing, or transfer — scope stays explicit",
      "Sandbox demos labeled honestly — production paths stay strict",
    ],
    link: { label: "Trust framework", href: "/trust-framework" },
  },
  {
    id: "north-star",
    title: "North star",
    bullets: [
      "No break between real-world value and on-chain representation",
      "Plain enough that anyone who reads English can follow the flow",
      "Works across asset classes and chains — one passport, many proofs",
    ],
    highlight: "Simple language is infrastructure — confusion is the tax everyone pays.",
    link: { label: "Create Passport", href: "/passport" },
  },
];
