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
    definition: "Self-reported data provided by the asset owner or issuer.",
    technical: "Cryptographically signed user payload anchored to registry.",
  },
  {
    level: 2,
    code: "L2-Review",
    label: "Level 2: Review",
    shortLabel: "L2 Review",
    definition: "Documents received and cross-checked via Abraxas automated pipelines.",
    technical: "Verified document hashes anchored on-chain.",
  },
  {
    level: 3,
    code: "L3-Attested",
    label: "Level 3: Attested",
    shortLabel: "L3 Attested",
    definition: "Independent, certified third-party professional sign-off.",
    technical: "Multisig approval from a staked V5 reviewer network.",
  },
  {
    level: 4,
    code: "L4-Monitored",
    label: "Level 4: Monitored",
    shortLabel: "L4 Monitored",
    definition: "Active or programmatic data refresh cadence (e.g. live listing cross-check).",
    technical: "Oracles or automated refresh pings against public sources.",
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
