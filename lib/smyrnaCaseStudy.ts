// FILE: lib/smyrnaCaseStudy.ts
// Second verified asset case study template — capital partner / equity loan narrative.

import { SMYRNA_TOWNHOME_IMAGE } from "@/lib/data/registryAssetImages";

export const SMYRNA_ASSET = {
  id: "ABX-RE-RES-002",
  designation: "VERIFIED RESIDENTIAL · SERIES B",
  name: "Smyrna Townhome",
  subtitle: "2BD/2BA · Battery Atlanta corridor · Clear title, paid off",
  location: "Smyrna, Georgia 30080 · 6 min from Truist Park",
  image: SMYRNA_TOWNHOME_IMAGE.src,
  gallery: [
    SMYRNA_TOWNHOME_IMAGE.src,
  ] as const,
  stats: {
    purchase1999: "$76,200",
    currentEst: "$208,200+",
    appreciation: "~3x since 1999",
    rentEst: "$1,850 / mo",
    sqft: "1,220",
    lien: "Clear · No debt",
  },
};

export const SMYRNA_CONFLICTS = {
  headline: "Disclosure",
  items: [
    {
      topic: "Pipeline stage",
      disclosure: "Smyrna is in V5 pipeline with ownership and title confirmed. It is open for verified capital partner interest — not yet at MARKETPLACE_LIVE like Cielo.",
      implication: "Metrics below are sourced from public records and owner statements; independent appraisal attestation is in progress.",
    },
    {
      topic: "Capital partner structure",
      disclosure: "Deal structures (on-chain equity loan, fractional appreciation, STR income) are illustrative options — not offers. Securities counsel required before any investment solicitation.",
      implication: "Case study documents verification progress and asset quality, not a live offering.",
    },
  ],
} as const;

export const SMYRNA_SOURCES = [
  {
    claim: "Purchase price (1999)",
    value: "$76,200",
    level: "L3 Attested",
    source: "Fulton/Cobb public sale record",
    asOf: "1999-03-01",
    method: "County recorder cross-check",
    expires: "Permanent record",
  },
  {
    claim: "Current estimate",
    value: "$208,200+",
    level: "L2 Review",
    source: "Comparable sales analysis",
    asOf: "2026-01-01",
    method: "Abraxas V5 collateral model inputs",
    expires: "2026-07-01",
  },
  {
    claim: "Lien status",
    value: "Clear",
    level: "L3 Attested",
    source: "Title search",
    asOf: "2025-11-01",
    method: "Independent title review",
    expires: "Annual refresh",
  },
  {
    claim: "Rent estimate",
    value: "$1,850/mo",
    level: "L1 Reference",
    source: "Market rent comps (Battery Atlanta corridor)",
    asOf: "2026-02-01",
    method: "Owner + market data — not guaranteed",
    expires: "2026-08-01",
  },
] as const;

export const SMYRNA_PROOF = [
  { label: "Public registry card", desc: "Asset explorer entry with verification state", href: "/#registry" },
  { label: "Verify asset ID", desc: "Registry lookup when pipeline stage advances", href: `/verify/${encodeURIComponent(SMYRNA_ASSET.id)}` },
  { label: "Submit capital interest", desc: "Investor intake for verified partner flows", href: "/investors" },
  { label: "V5 pipeline docs", desc: "How assets move to MARKETPLACE_LIVE", href: "/build" },
] as const;

export const SMYRNA_STRUCTURES = [
  {
    title: "On-chain equity loan",
    badge: "Preferred structure",
    desc: "Borrow USDC against verified equity without bank refinance. Property is paid off — up to 60% LTV subject to appraisal.",
  },
  {
    title: "Fractional appreciation share",
    badge: "Investor option",
    desc: "Tokenized equity participation in Battery Atlanta corridor appreciation. Owner retains majority control.",
  },
  {
    title: "STR income tokenization",
    badge: "Potential",
    desc: "Truist Park proximity supports premium short-term rental on event days — 3M+ annual visitors to The Battery.",
  },
] as const;
