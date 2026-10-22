// Founder brand exploration — not production branding (see app/founder-brand-review).

export type BrandDirectionId = "sovereign-core" | "living-protocol" | "verifiable-universe";

export type BrandExplorationLevel = "permanent" | "living";

export type OperatorDirectionId = "sentinel" | "protocol-entity" | "living-intelligence";

export const BRAND_EXPLORATION_COLORS = {
  institutionalTeal: "#4CBB92",
  graphite: "#0B1218",
  graphiteElevated: "#141C24",
  mist: "#E8EEF2",
  livingViolet: "#9B4DFF",
  livingLime: "#8FD944",
  livingGold: "#F5D547",
  livingMagenta: "#D94FA8",
} as const;

export const RECOMMENDED_BRAND_DIRECTION: BrandDirectionId = "living-protocol";
export const RECOMMENDED_OPERATOR_DIRECTION: OperatorDirectionId = "protocol-entity";

export interface BrandDirectionSpec {
  id: BrandDirectionId;
  title: string;
  metaphor: string;
  silhouette: string;
  colorStrategy: string;
  continuity: string;
  risks: string;
  smallSize: string;
}

export interface OperatorDirectionSpec {
  id: OperatorDirectionId;
  title: string;
  role: string;
  personality: string;
  brandLink: string;
  risks: string;
}

export const BRAND_DIRECTIONS: BrandDirectionSpec[] = [
  {
    id: "sovereign-core",
    title: "Direction A — The Sovereign Core",
    metaphor: "A protected nucleus inside concentric trust boundaries — sovereignty, integrity, permanence.",
    silhouette: "Double ring + solid core + four restrained arc segments.",
    colorStrategy: "Teal shell on graphite; monochrome-first; no internal spectrum required.",
    continuity: "Preserves the crystalline / compass seriousness of the current protocol emblem without the Earth horizon raster.",
    risks: "Can read as generic “secure circle” unless the arc geometry stays distinctive.",
    smallSize: "Strong at 16px — core dot + ring reads instantly.",
  },
  {
    id: "living-protocol",
    title: "Direction B — The Living Protocol",
    metaphor: "Thousands of interdependent proofs forming one intelligent sphere — controlled complexity inside a clear boundary.",
    silhouette: "Sphere shell + five clustered filament bands (abstract, not anatomical).",
    colorStrategy: "Permanent mark: teal shell + graphite filaments. Living object: restrained violet/lime/gold/magenta accents inside the shell only.",
    continuity: "Carries Abraxas green (#4CBB92), spherical protocol identity, and institutional tone while evolving away from the purple-box raster.",
    risks: "Filament count must stay low in the permanent mark; color only in Level 2 hero art.",
    smallSize: "Readable at 16px as circle + 3 macro strokes; detail reserved for ≥64px and hero.",
  },
  {
    id: "verifiable-universe",
    title: "Direction C — The Verifiable Universe",
    metaphor: "Independent paths converging to one verifiable decision — mathematical, architectural proof geometry.",
    silhouette: "Outer sphere + six converging chords + hex proof kernel.",
    colorStrategy: "Teal convergence lines; optional gold kernel highlight in living tier only.",
    continuity: "Echoes protocol “proof convergence” language used across verification docs.",
    risks: "Can feel colder / less “alive” than the founder reference; weaker emotional recall.",
    smallSize: "Good at 24px+; 16px loses chord detail — simplified icon uses hex kernel only.",
  },
];

export const OPERATOR_DIRECTIONS: OperatorDirectionSpec[] = [
  {
    id: "sentinel",
    title: "Operator A — Sentinel",
    role: "Institutional system guide — explains stages, never authorizes.",
    personality: "Quiet dark orb, precise illuminated eyes, minimal motion.",
    brandLink: "Shares spherical silhouette with Direction A mark; no internal spectrum.",
    risks: "Less memorable; may blend with generic assistant orbs.",
  },
  {
    id: "protocol-entity",
    title: "Operator B — Protocol Entity",
    role: "Contextual integration coach inside Studio / Launchpad.",
    personality: "Mechanical sphere; eyes and chest geometry echo the Living Protocol filaments.",
    brandLink: "Unmistakable shared geometry with recommended logo — same filament language.",
    risks: "Must stay restrained to avoid mascot / toy associations.",
  },
  {
    id: "living-intelligence",
    title: "Operator C — Living Intelligence",
    role: "Premium explainer for verification outcomes and receipt trust.",
    personality: "Dark protective shell with controlled internal color energy (Level 2 sphere echo).",
    brandLink: "Strongest tie to founder reference; highest animation potential.",
    risks: "Highest risk of gaming / NFT aesthetics if color or motion is not disciplined.",
  },
];

export const EXISTING_BRAND_AUDIT = {
  primaryMark: "PNG emblem `/brand/official/abraxas-emblem-protocol.png` — crystalline mark over Earth horizon (not the black/purple box).",
  uiAccent: "ABRAXAS_BRAND_GREEN `#4CBB92` in `lib/brand/officialBrandAssets.ts`.",
  wordmark: "`Abraxas` uppercase styling in `AbraxasLogo.tsx` — weight 800, letter-spacing 0.06em, PUBLIC_FONT_SANS.",
  navUsage: "`RedesignNav` + `AbraxasLogo` lockup on public surfaces.",
  preserve: ["Teal verification green", "Uppercase institutional wordmark", "Spherical / emblematic protocol silhouette", "Serious premium tone"],
  retireFromPrimary: ["Purple-box raster as default logo if still present in legacy surfaces", "Rainbow gradients without hierarchy"],
} as const;
