// FILE: lib/cmnPokemonCaseStudy.ts
// PSA-graded Pokémon collectibles — registry reference (not for sale).

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

export const CMN_POKEMON_TEASER = {
  badge: "More slabs coming soon",
  headline: "First slab on-registry",
  body:
    "One PSA-graded Pokémon slab is live on Abraxas today. Full vault photography and cert manifest publish as each slab clears the same verification bar as our real-estate flagship assets.",
} as const;

export const CMN_POKEMON_FEATURED_SLAB = {
  name: "Pikachu-Holo",
  set: "2002 Pokémon Japanese · McDonald's #010",
  grade: "PSA NM-MT 8",
  cert: "88655608",
} as const;

export const CMN_POKEMON_ASSET = {
  id: "ABX-COL-PSA-007",
  designation: "COLLECTIBLE · PSA GRADED · POKÉMON",
  name: "PSA Pokémon · Graded Collection",
  subtitle: "First PSA slab on-registry · new collectibles asset class on Abraxas",
  owner: "Beneficial owner on file",
  location: "Certified custody · United States",
  image: CMN_DESIGNS_REGISTRY_IMAGE.src,
  imageObjectPosition: CMN_DESIGNS_REGISTRY_IMAGE.objectPosition,
  caseStudyPath: "/case-studies/cmn-pokemon-collection" as const,
  verifyPath: "/verify/ABX-COL-PSA-007" as const,
  stats: {
    assetClass: "Graded Card · Pokémon",
    grading: "PSA (Professional Sports Authenticator)",
    custody: "Insured vault · United States",
    disposition: "Not for sale · registry visibility",
    photoCount: "1 featured · vault catalog expanding",
  },
} as const;

export { CMN_DESIGNS_GALLERY_PATHS as CMN_POKEMON_GALLERY_PATHS };

export const CMN_POKEMON_CONFLICTS = {
  headline: "Disclosure",
  items: [
    {
      topic: "Not an offering",
      disclosure:
        "This entry demonstrates Abraxas collectibles verification posture. These slabs are not listed for sale on Abraxas.",
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
      disclosure: "Beneficial owner and custody location are disclosed under signed diligence.",
      implication: "Registry L4 monitoring for collectibles is custody-feed dependent — pending partner hookup.",
    },
  ],
} as const;

export const CMN_POKEMON_SOURCES = [
  {
    claim: "Grading authority",
    value: "PSA",
    level: "L3 Pending",
    source: "Slab serial / cert on file",
    asOf: "2026-07-23",
  },
  {
    claim: "Custody",
    value: "Insured vault",
    level: "L2 Review",
    source: "Owner attestation",
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
