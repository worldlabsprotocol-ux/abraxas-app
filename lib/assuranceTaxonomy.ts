// FILE: lib/assuranceTaxonomy.ts
// Institutional assurance levels for asset and credential claims.

export type AssuranceLevel = 1 | 2 | 3 | 4;

export type AssuranceStatus = "verified" | "reviewed" | "attested" | "active" | "pending" | "reference";

export interface AssuranceLevelDef {
  level: AssuranceLevel;
  code: string;
  label: string;
  shortLabel: string;
  definition: string;
  technical: string;
}

export const ASSURANCE_LEVELS: AssuranceLevelDef[] = [
  {
    level: 1,
    code: "L1-Claim",
    label: "Level 1: Claim",
    shortLabel: "L1 Claim",
    definition: "Self-asserted or public-source reference — not independently verified.",
    technical: "Signed owner payload or public listing reference.",
  },
  {
    level: 2,
    code: "L2-Review",
    label: "Level 2: Review",
    shortLabel: "L2 Review",
    definition: "Account, wallet control, or documents cross-checked by Abraxas pipelines.",
    technical: "Document hashes + wallet binding on file.",
  },
  {
    level: 3,
    code: "L3-Attested",
    label: "Level 3: Attested",
    shortLabel: "L3 Attested",
    definition: "Third-party identity or professional evidence reviewed (Veriff, appraisal, title).",
    technical: "Named issuer + assurance level on credential claim.",
  },
  {
    level: 4,
    code: "L4-Monitored",
    label: "Level 4: Monitored",
    shortLabel: "L4 Monitored",
    definition: "Ongoing status checks against live or programmatic sources.",
    technical: "Refresh cadence + revocation on drift.",
  },
];

/** Partner-facing legend — evidence, issuer, TTL, revocation */
export const ASSURANCE_LEVELS_PARTNER = [
  {
    level: 1 as AssuranceLevel,
    label: "Self-asserted / reference",
    evidence: "Owner statement or public listing",
    issuerType: "Asset owner or public source",
    typicalTtl: "Until refreshed",
    revocation: "On dispute or supersede",
  },
  {
    level: 2 as AssuranceLevel,
    label: "Reviewed",
    evidence: "Documents or wallet control verified",
    issuerType: "Abraxas review or zkLogin binding",
    typicalTtl: "30–365 days",
    revocation: "Admin or policy engine",
  },
  {
    level: 3 as AssuranceLevel,
    label: "Independently attested",
    evidence: "Licensed IDV, appraisal, or title review",
    issuerType: "Veriff, appraiser, title firm",
    typicalTtl: "90–365 days",
    revocation: "Issuer suspend or Abraxas revoke",
  },
  {
    level: 4 as AssuranceLevel,
    label: "Actively monitored",
    evidence: "Live cross-check (listing, custody, oracle)",
    issuerType: "Monitoring partner or Abraxas oracle",
    typicalTtl: "24h–30 days",
    revocation: "Auto on drift detection",
  },
];

export interface AssuranceClaim {
  label: string;
  value: string;
  level: AssuranceLevel;
  source: string;
  asOf: string;
  expires?: string;
  assumptions?: string;
  status?: AssuranceStatus;
}

export interface AssuranceBreakdown {
  L1_IdentityClaim?: { status: string; timestamp?: string; provider?: string };
  L2_LegalReview?: { status: string; timestamp?: string; provider?: string };
  L3_ProfessionalAttestation?: { status: string; timestamp?: string; authority?: string };
  L4_ActiveMonitoring?: { status: string; lastSync?: string; oracleSource?: string };
}

export const CIELO_ASSURANCE_CLAIMS: AssuranceClaim[] = [
  {
    label: "Appraised value",
    value: "$1.1M",
    level: 3,
    source: "Independent appraisal (V5 attestation)",
    asOf: "2025-12-01",
    assumptions: "As-is market value for short-term rental use.",
    status: "attested",
  },
  {
    label: "Cash yield",
    value: "14.6%",
    level: 1,
    source: "Owner operating model projection",
    asOf: "2026-01-15",
    assumptions: "Based on trailing occupancy and nightly rate assumptions. Not guaranteed.",
    status: "reference",
  },
  {
    label: "Collateral score",
    value: "96/100",
    level: 2,
    source: "Abraxas V5 collateral model",
    asOf: "2026-06-01",
    assumptions: "Model inputs from deed, appraisal, and lien search. See dossier for methodology.",
    status: "reviewed",
  },
];

export function levelDef(level: AssuranceLevel): AssuranceLevelDef {
  return ASSURANCE_LEVELS.find(l => l.level === level) ?? ASSURANCE_LEVELS[0];
}
