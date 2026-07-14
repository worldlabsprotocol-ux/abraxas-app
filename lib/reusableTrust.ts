// FILE: lib/reusableTrust.ts
// Category, vocabulary, flywheel, and pilot metrics — one source for marketing surfaces.

import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";

/** North Star metric — rally every team and surface around this. */
export const NORTH_STAR_METRIC = {
  name: "Repeated verifications eliminated",
  shortLabel: "Re-verifications eliminated",
  description: "Every proof reused instead of re-collected counts toward compounding trust on the network.",
} as const;

/** Abraxas product vocabulary — plain language on primary journeys; technical terms live in Docs. */
export const ABRAXAS_VOCAB = {
  proof: "Proof",
  trustRequest: "Trust Request",
  trustRules: "Trust Rules",
  passport: "Passport",
  registry: "Registry",
  /** Docs-only aliases */
  docs: {
    credential: "W3C Verifiable Credential",
    policyEngine: "Policy Engine",
    assuranceLevel: "Assurance Level (L1–L4)",
    relyingParty: "Relying Party",
  },
} as const;

export const TRUST_FLYWHEEL_STEPS = [
  { id: "verify-once", label: "Verify once", outcome: "Upload stops repeating" },
  { id: "reuse", label: "Reuse proof", outcome: "Same answer travels to the next partner" },
  { id: "less-review", label: "Less manual review", outcome: "Staff sees yes/no — not document folders" },
  { id: "lower-cost", label: "Lower cost", outcome: "Hours and tickets drop" },
  { id: "more-partners", label: "More partners accept it", outcome: "Network standard emerges" },
  { id: "more-places", label: "More places it works", outcome: "Trust compounds across verticals" },
  { id: "more-users", label: "More users verify once", outcome: "Flywheel accelerates" },
] as const;

/** Operator ROI — hospitality-first; translates to lenders, marketplaces, deal rooms. */
export const OPERATOR_WITHOUT_ABRAXAS = [
  "Guests upload documents on every new booking channel",
  "Staff manually re-reviews the same ID and eligibility checks",
  "Support tickets pile up around document resends",
  "Approvals slow down — deals wait on email threads",
] as const;

export const OPERATOR_WITH_ABRAXAS = [
  "Guest approves once — reusable proof on Passport",
  "Partner sends a Trust Request — you share only what's required",
  "Faster yes/no decisions — fewer document uploads",
  "Less operational overhead — USDC settlement available today on pilot assets",
] as const;

/** Pilot-labeled metrics — update from live counters as data compounds. */
export interface PilotMetric {
  value: string;
  label: string;
  note: string;
  pilot: boolean;
}

/** Static fallbacks when /api/metrics/public is unavailable. */
export const PILOT_METRICS: PilotMetric[] = [
  {
    value: "~80%",
    label: "Fewer duplicate document uploads",
    note: "Pilot target · Cielo reference loop",
    pilot: true,
  },
  {
    value: "~2 min",
    label: "Guest onboarding to verified booking",
    note: "Measured on Cielo verified-rate flow",
    pilot: true,
  },
  {
    value: "USDC",
    label: "Settlement live on Sui",
    note: "Cielo pilot · available today",
    pilot: true,
  },
  {
    value: "$2.7M+",
    label: "Attested registry scope",
    note: `Cielo + ${CPG_ASSET.name} · live partners`,
    pilot: false,
  },
];

export interface PublicMetricsPayload {
  ok?: boolean;
  metrics?: {
    verified_assets?: number;
    attested_value_label?: string;
    zklogin_wallets?: number;
    active_credentials?: number;
    captured_cielo_bookings?: number;
    cielo_revenue_usdc?: number;
    verification_network?: {
      total_presentations?: number;
      presentations_30d?: number;
      credentials_issued_30d?: number;
      data_available?: boolean;
    };
  };
}

/** Merge live Supabase counters with pilot-labeled fallbacks. */
export function buildPilotMetricsFromPublic(api: PublicMetricsPayload | null): PilotMetric[] {
  const m = api?.metrics;
  if (!api?.ok || !m) return PILOT_METRICS;

  const vn = m.verification_network;
  const presentations = vn?.total_presentations ?? 0;
  const passports = m.zklogin_wallets ?? 0;
  const usdcRev = m.cielo_revenue_usdc ?? 0;
  const bookings = m.captured_cielo_bookings ?? 0;
  const registryLabel = m.attested_value_label ?? "$2.7M+ attested";

  return [
    {
      value: presentations > 0 ? String(presentations) : "~80%",
      label: presentations > 0 ? "Trust Requests answered" : "Fewer duplicate uploads",
      note: presentations > 0 ? "Live · Supabase" : "Pilot target · Cielo loop",
      pilot: presentations === 0,
    },
    {
      value: passports > 0 ? String(passports) : "~2 min",
      label: passports > 0 ? "Passports created" : "Onboarding to verified booking",
      note: passports > 0 ? "Live · zkLogin wallets" : "Cielo verified-rate flow",
      pilot: passports === 0,
    },
    {
      value: usdcRev > 0 ? `$${Math.round(usdcRev).toLocaleString()}` : "USDC",
      label: usdcRev > 0 ? "Captured on Sui" : "Settlement live today",
      note: usdcRev > 0
        ? `${bookings} booking${bookings === 1 ? "" : "s"} · Sui`
        : "Cielo pilot · on-protocol",
      pilot: usdcRev === 0,
    },
    {
      value: registryLabel.replace(/\s+attested$/i, "").replace(/\s+registry$/i, "") || registryLabel,
      label: "Attested registry scope",
      note: vn?.data_available ? "Live · registry stats" : `Cielo + ${CPG_ASSET.name}`,
      pilot: false,
    },
  ];
}

/** Permissioning demo — visual selective disclosure (not jargon). */
export const PERMISSIONING_DEMO = {
  shared: [
    { label: "Age eligible", shared: true },
    { label: "Citizenship confirmed", shared: true },
    { label: "Booking approved", shared: true },
  ],
  hidden: [
    { label: "Full identity document", shared: false },
    { label: "Passport number", shared: false },
    { label: "Home address", shared: false },
  ],
} as const;

/** Signature audit trail — example timeline for marketing/demo surfaces. */
export const TRUST_AUDIT_TRAIL_EXAMPLE = [
  { step: "Passport created", detail: "Google sign-in · wallet ready" },
  { step: "Identity verified", detail: "One-time check · proof stored" },
  { step: "Land survey verified", detail: `${CPG_ASSET.name} · 11 plats on file` },
  { step: "Environmental clean", detail: "Phase I complete" },
  { step: "Approved by partner", detail: "Trust Request answered" },
  { step: "Accepted by registry", detail: "ABX record live" },
  { step: "Ready to transact", detail: "Acquire · USDC on Sui" },
] as const;

export function computeOperatorRoi(input: {
  verificationsPerMonth: number;
  minutesPerVerification: number;
  hourlyLaborUsd: number;
  reductionPct?: number;
}): {
  hoursBefore: number;
  hoursAfter: number;
  hoursSaved: number;
  laborSavedUsd: number;
  documentsAvoided: number;
} {
  const reduction = input.reductionPct ?? 0.75;
  const hoursBefore = (input.verificationsPerMonth * input.minutesPerVerification) / 60;
  const hoursAfter = hoursBefore * (1 - reduction);
  const hoursSaved = hoursBefore - hoursAfter;
  const laborSavedUsd = Math.round(hoursSaved * input.hourlyLaborUsd);
  const documentsAvoided = Math.round(input.verificationsPerMonth * 0.8 * reduction);

  return { hoursBefore, hoursAfter, hoursSaved, laborSavedUsd, documentsAvoided };
}
