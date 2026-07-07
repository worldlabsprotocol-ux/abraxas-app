// FILE: lib/passportLayers.ts
// Three-layer passport model + honest product status per capability.
// Passport Core (live) · Compliance Passport (pilot/partner-gated) · Asset Passport (planned/pilot).

import type { StampBitId } from "@/lib/passport/stamps";

export type ProductStatus = "live" | "pilot" | "planned" | "partner_gated";

export type PassportLayerId = "core" | "compliance" | "asset";

export const PRODUCT_STATUS_META: Record<
  ProductStatus,
  { label: string; color: string; description: string }
> = {
  live: {
    label: "Live",
    color: "#10B981",
    description: "Available in production flows today.",
  },
  pilot: {
    label: "Pilot",
    color: "#F59E0B",
    description: "Working in design-partner flows; scope may change.",
  },
  planned: {
    label: "Planned",
    color: "#6B7280",
    description: "On the roadmap — not yet available.",
  },
  partner_gated: {
    label: "Partner-gated",
    color: "#3B82F6",
    description: "Available when a partner policy requires it.",
  },
};

export const PASSPORT_LAYERS = [
  {
    id: "core" as const,
    title: "Passport Core",
    status: "live" as ProductStatus,
    tagline: "Account, wallet binding, consent, and credential display.",
    summary:
      "Sign in with Google, get a Sui wallet, manage consent, and carry proof in Apple Wallet. No ID upload required to browse or book.",
    capabilities: [
      "Google sign-in + automatic Sui wallet",
      "Wallet binding via signed challenge",
      "Consent and credential dashboard",
      "Apple Wallet pass (pilot)",
      "Public verifier + share links",
    ],
  },
  {
    id: "compliance" as const,
    title: "Compliance Passport",
    status: "pilot" as ProductStatus,
    tagline: "Specific eligibility claims — not a vague “KYC verified” badge.",
    summary:
      "Identity, screening, KYB, accreditation, and jurisdiction eligibility as separate signed claims. Partners set their own acceptance rules.",
    capabilities: [
      "Government ID + liveness (Veriff)",
      "Sanctions / screening outcome (partner-gated)",
      "KYB + business verification (manual review)",
      "Accreditation & suitability (partner-gated)",
      "Policy engine + partner verifier API v1 (live)",
    ],
  },
  {
    id: "asset" as const,
    title: "Asset Passport",
    status: "pilot" as ProductStatus,
    tagline: "Where Abraxas differentiates — verified ownership and asset evidence.",
    summary:
      "Title, appraisal, custody, lien status, and offering-specific attestations tied to real assets in the registry — with L1–L4 assurance levels.",
    capabilities: [
      "Genesis asset dossier (Cielo Sunrise)",
      "Asset owner document review",
      "Assurance taxonomy L1–L4 on registry",
      "Token transfer eligibility (planned)",
      "Custody + lien attestation chain (planned)",
    ],
  },
] as const;

/** Trust Registry product layer (network) */
export const TRUST_REGISTRY_LAYER = {
  id: "trust_registry" as const,
  title: "Trust Registry",
  status: "pilot" as ProductStatus,
  tagline: "Which issuers are trusted for which claims.",
  summary:
    "A credential is only valuable if the verifier trusts the issuer. Abraxas maintains issuer onboarding standards, public keys, and schema acceptance rules.",
  capabilities: [
    "Issuer due diligence tiers",
    "Supported claim types per issuer",
    "Assurance level acceptance",
    "Jurisdiction rules",
    "Issuer suspension + audit status",
  ],
} as const;

export interface StampCatalogEntry {
  id: StampBitId;
  label: string;
  layer: PassportLayerId;
  status: ProductStatus;
  claim: string;
  desc: string;
  /** Shown when stamp is not yet earned — explains availability */
  availabilityNote?: string;
}

/** UI stamp catalog — honest status per claim type */
export const STAMP_CATALOG: StampCatalogEntry[] = [
  {
    id: "identity",
    label: "Identity",
    layer: "compliance",
    status: "pilot",
    claim: "identity_verified",
    desc: "Government ID + liveness via approved provider",
    availabilityNote: "Veriff when configured · dev mock otherwise",
  },
  {
    id: "biometric",
    label: "Biometric",
    layer: "compliance",
    status: "pilot",
    claim: "liveness_passed",
    desc: "Live human match at time of ID check",
    availabilityNote: "Issued with identity verification",
  },
  {
    id: "compliance",
    label: "Screening",
    layer: "compliance",
    status: "partner_gated",
    claim: "screening_outcome",
    desc: "Provider screening outcome — not universal clearance",
    availabilityNote: "Full AML/OFAC program is partner-gated",
  },
  {
    id: "business",
    label: "Business",
    layer: "compliance",
    status: "pilot",
    claim: "kyb_verified",
    desc: "Entity formation + beneficial ownership review",
    availabilityNote: "Manual review queue",
  },
  {
    id: "owner",
    label: "Asset Owner",
    layer: "asset",
    status: "pilot",
    claim: "asset_ownership_reviewed",
    desc: "Ownership claim reviewed for a named asset",
    availabilityNote: "Per-asset manual review",
  },
  {
    id: "property",
    label: "Property",
    layer: "asset",
    status: "planned",
    claim: "asset_title_verified",
    desc: "Title chain + lien search attestation",
  },
  {
    id: "royalty",
    label: "Royalty",
    layer: "asset",
    status: "planned",
    claim: "royalty_rights_verified",
    desc: "Catalog / split-sheet provenance review",
  },
  {
    id: "tribal",
    label: "Tribal",
    layer: "asset",
    status: "planned",
    claim: "sovereign_rights_verified",
    desc: "Sovereign land / mineral rights attestation",
  },
  {
    id: "lending",
    label: "Lending",
    layer: "asset",
    status: "planned",
    claim: "collateral_eligible",
    desc: "Collateral credit + lending policy eligibility",
  },
  {
    id: "social",
    label: "Social",
    layer: "core",
    status: "pilot",
    claim: "social_proof",
    desc: "OAuth-linked account attestation (Reclaim)",
    availabilityNote: "Reclaim Protocol integration",
  },
];

export const STAMPS_BY_LAYER = PASSPORT_LAYERS.map(layer => ({
  ...layer,
  stamps: STAMP_CATALOG.filter(s => s.layer === layer.id),
}));

/** Stamps users can realistically earn today (live + pilot) */
export const TRACKABLE_STAMP_IDS = STAMP_CATALOG.filter(
  s => s.status === "live" || s.status === "pilot",
).map(s => s.id);

export const PUBLIC_POSITIONING = {
  headline: "Verify once with trusted providers.",
  subhead:
    "Reuse approved credentials across participating Abraxas applications and partners — without repeatedly uploading your documents.",
  disclaimer:
    "Eligibility is policy-based, issuer-specific, and time-bound. Verification status does not guarantee eligibility for every product, jurisdiction, or partner.",
  assetDisclaimer:
    "Asset Passport records the verification trail behind an asset — ownership, custody, valuation, and legal attestations required by the applicable offering policy.",
  proofNotDocuments:
    "Share the proof, not the documents. Partners receive only the claims their policy requires.",
  category:
    "Portable eligibility and verification network for permissioned on-chain finance.",
  refreshPromise:
    "Verify once, reuse what remains valid, and refresh only what changed or expired.",
} as const;

export function stampsForLayer(layerId: PassportLayerId): StampCatalogEntry[] {
  return STAMP_CATALOG.filter(s => s.layer === layerId);
}

export function getStampEntry(id: string): StampCatalogEntry | undefined {
  return STAMP_CATALOG.find(s => s.id === id);
}
