// FILE: lib/data/cieloVerificationScope.ts
// Asset-level verification scope for Cielo Sunrise — institutional disclosure panel.

export const CIELO_VERIFICATION_SCOPE = {
  assetId: "ABX-RE-HOSP-001",
  assetName: "Cielo Sunrise",
  status: "pilot" as const,
  offeringNote: "Pilot asset — not a public securities offering. Figures are attestations, not investment advice.",
  scope: [
    "Property identity and listing cross-check",
    "Ownership evidence and deed review",
    "Independent appraisal on file",
    "Booking availability on Abraxas Protocol Calendar",
  ],
  issuers: [
    { role: "Identity (owner)", name: "Veriff · licensed IDV", assurance: "L2" },
    { role: "Legal review", name: "Fannin County deed review · Abraxas manual", assurance: "L2" },
    { role: "Valuation", name: "Independent appraisal (V5 attestation)", assurance: "L3" },
    { role: "Monitoring", name: "Airbnb listing cross-check", assurance: "L4" },
  ],
  lastReviewed: "2026-07-03",
  notVerified: [
    "Future occupancy or yield",
    "Investor eligibility for any token offering",
    "Securities registration status",
  ],
  claims: [
    { label: "Appraised value", value: "$1.1M", level: 3, asOf: "2025-12-01", type: "appraised" },
    { label: "Cash yield", value: "14.6%", level: 1, asOf: "2026-01-15", type: "projected" },
    { label: "Collateral score", value: "96/100", level: 2, asOf: "2026-06-01", type: "model" },
  ],
};
