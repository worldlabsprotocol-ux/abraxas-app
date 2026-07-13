// FILE: lib/cieloCaseStudy.ts
// Institutional case study data — dated sources, conflicts, on-chain proof.

import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";

const D = FLAGSHIP_PROPERTY;
const SUI_EXPLORER = "https://suiscan.xyz/mainnet/tx";

export const CIELO_CONFLICTS = {
  headline: "Conflict of interest disclosure",
  items: [
    {
      topic: "Asset ownership",
      disclosure:
        "Cielo Sunrise is owned and operated by World Labs Protocol / the Abraxas founding team. This is intentional eat-your-own-dogfood — the first verified asset on the platform is our own property, not a third-party pilot.",
      implication: "Independent third-party asset pilots are a separate milestone on the roadmap.",
    },
    {
      topic: "Verification issuer",
      disclosure:
        "Abraxas Verification Network issued the AAS-1 certificate for an asset owned by the same organizational family. High-tier attestation steps use the same V5 pipeline external issuers will follow, with additional public scrutiny on this asset.",
      implication: "L3 appraisals and title review are documented with source dates below — not self-attested without evidence.",
    },
    {
      topic: "Yield projections",
      disclosure:
        "14.6% cash yield is an owner operating model projection based on trailing occupancy assumptions. It is labeled L1 reference in the assurance taxonomy — not a guaranteed return.",
      implication: "See /verify for assurance level per metric.",
    },
  ],
} as const;

export const CIELO_SOURCES = [
  {
    claim: "Appraised value $1.1M",
    value: "$1,100,000",
    level: "L3 Attested",
    source: D.collateral.appraiser,
    asOf: D.collateral.appraisalDate,
    method: "Independent USPAP appraisal for STR use",
    expires: "2026-05-01",
  },
  {
    claim: "Annual NOI",
    value: `$${D.collateral.annualNOI.toLocaleString()}`,
    level: "L2 Review",
    source: "Owner operating statements + Abraxas V5 review",
    asOf: "2025-12-01",
    method: "Trailing 12-month revenue minus documented operating expenses",
    expires: "2026-06-01",
  },
  {
    claim: "Cash yield",
    value: `${(D.financials.cashYield * 100).toFixed(1)}%`,
    level: "L1 Reference",
    source: "Owner projection model",
    asOf: "2026-01-15",
    method: "NOI / appraised value — not guaranteed",
    expires: "2026-07-01",
  },
  {
    claim: "Collateral score",
    value: `${D.collateral.collateralScore}/100`,
    level: "L2 Review",
    source: "Abraxas V5 collateral model",
    asOf: "2026-06-01",
    method: "Deed, lien search, appraisal, insurance inputs",
    expires: "2026-12-01",
  },
  {
    claim: "Live STR listing",
    value: "5.0 ★ Superhost",
    level: "L4 Monitored",
    source: "Airbnb public listing",
    asOf: "2026-07-01",
    method: "Public listing cross-check + guest reviews",
    expires: "Continuous",
  },
  {
    claim: "Title clear",
    value: "Fannin County, GA",
    level: "L3 Attested",
    source: "First American Title (2024-01-20)",
    asOf: "2024-01-20",
    method: "Title search and insurance placement",
    expires: "Annual refresh",
  },
] as const;

export const CIELO_WHAT_THIS_PROVES = [
  "Verification before tokenization — trust and assurance records precede any liquidity narrative",
  "Real numbers with honest assurance labels — every metric has date, level, and refresh window",
  "Live operational proof — Airbnb bookable independently; Abraxas adds reusable guest verification",
  "Technical stack works end-to-end — zkLogin, credentials, policy decisions, USDC-on-Sui pilot rail",
  "Same pipeline external issuers and relying partners integrate — Cielo is reference, not exception",
] as const;

export const CIELO_ONCHAIN_PROOF = [
  {
    label: "Public registry verifier",
    desc: "Instant assurance taxonomy + pipeline stage",
    href: `/verify/${encodeURIComponent(D.id)}`,
    type: "registry",
  },
  {
    label: "Certificate anchor (Sui devnet)",
    desc: "AAS-1 verification document hash anchored on-chain",
    href: `${SUI_EXPLORER}/${D.verification.anchoredTx}`,
    type: "anchor",
    txDigest: D.verification.anchoredTx,
    asOf: "2025-05-15",
  },
  {
    label: "Live booking payments",
    desc: "Captured USDC tx digests from Supabase stay_requests",
    href: "/transparency",
    type: "payments",
  },
  {
    label: "Operational health check",
    desc: "Pre-demo E2E verification of booking → pay → receipt loop",
    href: "/ops/cielo-e2e",
    type: "ops",
  },
  {
    label: "Property dossier",
    desc: "Photos, financials, calendar, provenance timeline",
    href: "/flagship",
    type: "dossier",
  },
  {
    label: "Airbnb listing (independent)",
    desc: "Bookable without Abraxas — cross-check availability",
    href: D.airbnbUrl,
    type: "external",
  },
] as const;

export const CIELO_TIMELINE = D.verification.provenanceTimeline;

export const CIELO_PHOTOS = [
  "/assets/cielo/07.jpg",
  "/assets/cielo/14.jpg",
  "/assets/cielo/06.jpg",
] as const;
