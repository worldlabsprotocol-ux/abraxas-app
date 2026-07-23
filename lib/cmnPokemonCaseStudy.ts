// FILE: lib/cmnPokemonCaseStudy.ts
// CMN Designs · PSA-graded Pokémon collectibles — registry reference (not for sale).

import {
  CMN_DESIGNS_GALLERY_PATHS,
  CMN_DESIGNS_PHOTO_NUMBERS,
  CMN_DESIGNS_REGISTRY_IMAGE,
} from "@/lib/cmnDesignsMedia";

export interface CmnPokemonCardRow {
  slot: string;
  name: string;
  set?: string;
  year?: number;
  grade: string;
  gradingCo: string;
  certNumber?: string;
  forSale: false;
}

/**
 * Add one row per slab when ready. Photos map to cmn{N}.jpg in public/assets/.
 */
export const CMN_POKEMON_CARDS: CmnPokemonCardRow[] = [];

export const CMN_POKEMON_ASSET = {
  id: "ABX-COL-PSA-007",
  designation: "COLLECTIBLE · PSA GRADED · CMN DESIGNS",
  name: "CMN Designs · PSA Pokémon Vault",
  subtitle: "Graded trading cards · CMN Designs custody · registry reference only",
  owner: "CMN Designs",
  location: "Certified custody · United States",
  image: CMN_DESIGNS_REGISTRY_IMAGE.src,
  imageObjectPosition: CMN_DESIGNS_REGISTRY_IMAGE.objectPosition,
  caseStudyPath: "/case-studies/cmn-pokemon-collection" as const,
  verifyPath: "/verify/ABX-COL-PSA-007" as const,
  stats: {
    assetClass: "Graded Card · Pokémon",
    grading: "PSA (Professional Sports Authenticator)",
    custody: "CMN Designs · insured vault",
    disposition: "Not for sale · registry visibility",
    photoCount: `${CMN_DESIGNS_PHOTO_NUMBERS.length} slabs photographed`,
  },
} as const;

export { CMN_DESIGNS_GALLERY_PATHS as CMN_POKEMON_GALLERY_PATHS };

export const CMN_POKEMON_CONFLICTS = {
  headline: "Disclosure",
  items: [
    {
      topic: "Not an offering",
      disclosure:
        "This entry demonstrates Abraxas collectibles verification posture. CMN Designs has not listed these slabs for sale on Abraxas.",
      implication: "Photos and grades are owner-attested unless a cert number is published in the manifest below.",
    },
    {
      topic: "Grading",
      disclosure:
        "PSA-graded slabs are referenced per Abraxas Graded Card class rules. Population reports and cert lookup are owner-supplied when disclosed.",
      implication: "Maximum LTV tiers in protocol docs apply only after full L3 attestation — not claimed here.",
    },
    {
      topic: "Custody",
      disclosure: "CMN Designs is the disclosed beneficial owner. Custody location and insurance limits are available under signed diligence.",
      implication: "Registry L4 monitoring for collectibles is custody-feed dependent — pending partner hookup.",
    },
  ],
} as const;

export const CMN_POKEMON_SOURCES = [
  {
    claim: "Owner",
    value: "CMN Designs",
    level: "L1 Reference",
    source: "Owner attestation",
    asOf: "2026-07-23",
  },
  {
    claim: "Grading authority",
    value: "PSA",
    level: "L3 Pending",
    source: "Slab serial / cert on file",
    asOf: "2026-07-23",
  },
  {
    claim: "Disposition",
    value: "Hold · not listed",
    level: "L1 Reference",
    source: "Registry policy",
    asOf: "2026-07-23",
  },
] as const;

export const CMN_POKEMON_PROOF = [
  { label: "Verify record", desc: "ABX-COL-PSA-007 on Abraxas", href: CMN_POKEMON_ASSET.verifyPath },
  { label: "Graded Card class", desc: "Protocol rules for PSA / BGS / SGC", href: "/trust-framework" },
  { label: "Asset classes", desc: "How collectibles fit the registry", href: "/verify" },
] as const;
