// FILE: lib/seo/keywords.ts
// Target SEO keywords — use naturally in copy and metadata, not stuffed.

/** High-priority primary keywords */
export const SEO_PRIMARY_KEYWORDS = [
  "real world asset tokenization",
  "tokenization companies",
  "RWA verification app",
  "RWA app",
  "RWA website",
] as const;

/** Supporting keywords for articles and landing pages */
export const SEO_SUPPORTING_KEYWORDS = [
  "tokenized real-world assets",
  "RWA infrastructure",
  "asset verification",
  "digital asset verification",
  "verification infrastructure",
  "reusable verification",
  "real-world assets",
  "blockchain verification",
  "asset tokenization platform",
  "institutional RWA",
  "RWA compliance",
] as const;

/** Combined list for meta keywords tag */
export const SEO_ALL_KEYWORDS = [...SEO_PRIMARY_KEYWORDS, ...SEO_SUPPORTING_KEYWORDS];

/** Default site-wide description weaving primary terms */
export const SEO_DEFAULT_DESCRIPTION =
  "Abraxas is the RWA verification app and asset tokenization platform for real world asset tokenization — reusable verification infrastructure for tokenized real-world assets, digital asset verification, and institutional RWA compliance.";

export const SEO_DEFAULT_TITLE = "Abraxas · abraxasworld.xyz";
