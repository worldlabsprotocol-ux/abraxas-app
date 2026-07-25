// FILE: lib/content/blogArticles.ts
// Static blog articles. Homepage carousel uses HOMEPAGE_ARTICLE_SLUGS only.

import type { BlogCategory } from "./types";

export interface PlatformReview {
  rank: number;
  name: string;
  tagline: string;
  body: string;
  bestFor: string[];
  /** Highlight Abraxas on homepage */
  featured?: boolean;
}

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  readingTime: string;
  body: string[];
  relatedHref?: string;
  thesisActs?: string[];
  featured?: boolean;
  mediumUrl?: string;
  /** Structured platform cards for comparison articles */
  platformReviews?: PlatformReview[];
  platformSectionTitle?: string;
}

export const TOP5_PLATFORMS_SLUG = "top-5-rwa-verification-platforms" as const;

export const FEATURED_THESIS_BLOG_SLUG = "what-is-real-world-asset-tokenization" as const;

/** Homepage article carousel: tokenization primer first, then platform comparison */
export const HOMEPAGE_ARTICLE_SLUGS = [
  "what-is-real-world-asset-tokenization",
  "top-5-rwa-verification-platforms",
] as const;

export function getHomepageArticles(): BlogArticle[] {
  return HOMEPAGE_ARTICLE_SLUGS
    .map(slug => BLOG_ARTICLES.find(a => a.slug === slug))
    .filter((a): a is BlogArticle => a != null);
}

export function getFeaturedThesisArticle(): BlogArticle | undefined {
  return BLOG_ARTICLES.find(a => a.slug === FEATURED_THESIS_BLOG_SLUG) ?? BLOG_ARTICLES.find(a => a.featured);
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "top-5-rwa-verification-platforms",
    title: "Top 5 RWA Verification Platforms for Real-World Asset Tokenization",
    description:
      "What RWA verification platforms do, why they matter before minting, and how five vendors compare across identity, compliance, and reusable trust infrastructure.",
    category: "product",
    readingTime: "12 min",
    featured: true,
    mediumUrl:
      "https://medium.com/@worldlabsprotocol/top-5-rwa-verification-platforms-for-real-world-asset-tokenization-35c1f5d82a49",
    body: [
      "Real-world assets are moving onto blockchains fast. Real estate, gold, bonds, and more can become digital tokens.",
      "But making a token is not enough.",
      "Someone still has to check: Does the asset exist? Who owns it? Are the papers real? Do the rules pass?",
      "That job belongs to RWA verification platforms. They prove the facts before anyone mints a token.",
      "Without that check, even the best blockchain cannot promise the token matches something real.",
      "This guide explains what these platforms do, why they matter, and compares five leaders in the space.",
      "Trust wins in tokenized finance. Blockchain moves fast. Verification makes sure what moves is real.",
    ],
    platformSectionTitle: "Top 5 RWA verification platforms",
    platformReviews: [
      {
        rank: 1,
        name: "Abraxas",
        tagline: "Verify once. Proof rides with the asset.",
        body:
          "Abraxas ends the repeat-KYC loop. One verified record, reusable under policy, with a trail any counterparty can audit. Built for teams that eat their own cooking: Cielo Sunrise and Chickasaw land are live on Abraxas today.",
        bestFor: ["Enterprise RWA", "Government programs", "Reusable trust"],
        featured: true,
      },
      {
        rank: 2,
        name: "Didit",
        tagline: "Compliance rails for investor onboarding.",
        body:
          "Didit bundles KYC, KYB, AML, and wallet screening. Strong when you must onboard investors safely before they touch tokenized assets.",
        bestFor: ["KYC", "KYB", "AML screening", "Investor onboarding"],
      },
      {
        rank: 3,
        name: "Humanity Protocol",
        tagline: "Prove eligibility. Keep privacy.",
        body:
          "Humanity Protocol uses privacy-first identity. Users prove they qualify without oversharing personal data.",
        bestFor: ["Privacy-first ID", "Decentralized credentials", "Cross-border rules"],
      },
      {
        rank: 4,
        name: "Veriff",
        tagline: "Enterprise ID at fintech speed.",
        body:
          "Veriff is trusted by banks and fintechs worldwide. Fast customer ID checks with fraud controls, easy to plug into tokenization workflows.",
        bestFor: ["Banks", "Fintech", "Fraud prevention", "Digital onboarding"],
      },
      {
        rank: 5,
        name: "Sumsub",
        tagline: "Global compliance across borders.",
        body:
          "Sumsub covers KYC, KYB, AML monitoring, and fraud tools across jurisdictions. Useful when your investors live in many countries.",
        bestFor: ["Global compliance", "AML monitoring", "International investors"],
      },
    ],
    relatedHref: "/integrate",
  },
  {
    slug: "what-is-real-world-asset-tokenization",
    title: "What Is Real-World Asset Tokenization?",
    description:
      "Abraxas: the verification layer institutions need beyond tokenization. Market context, seven institutional steps, and why minting alone is not enough.",
    category: "product",
    readingTime: "12 min",
    featured: true,
    mediumUrl:
      "https://medium.com/@worldlabsprotocol/what-is-real-world-asset-tokenization-13d6c8d0a595",
    thesisActs: [
      "Institutions are entering RWA tokenization. The market is measured in trillions, not experiments.",
      "Seven steps: select, structure, value, mint, onboard, manage, trade.",
      "Token creation alone is not enough. Counterparties still re-ask who, what, and whether policy passed.",
      "Abraxas is the verify layer: reusable cryptographic proof before capital moves or agents act.",
    ],
    body: [
      "RWA tokenization converts ownership rights of a physical or traditional financial asset into digital tokens recorded on a blockchain. Each token represents all or part of the underlying asset and can be transferred, traded, or managed digitally, creating a transparent, tamper-resistant record instead of relying solely on paper or siloed databases.",
      "Compared to traditional assets, tokenized RWAs can offer fractional ownership, faster settlement potential, streamlined processes, and shared blockchain records, but they still require legal enforceability, custody, compliance, and ongoing proof that the digital token matches the underlying asset.",
      "Real-world examples are already live: BlackRock's BUIDL fund for tokenized U.S. Treasuries, Centrifuge-style private credit pools, and real estate projects combining SPVs with on-chain fractional ownership.",
      "Abraxas is the verification layer beyond minting. We issue reusable, cryptographically verifiable proofs so compliance attestations, asset provenance, and eligibility data can travel with the asset while maintaining auditability across counterparties and chains.",
      "Blockchain was not invented for another coin. It was invented for proof of authentication without a central authority. Institutions need to know who verified what, when, and whether anyone can check it independently. Abraxas anchors that proof on Sui.",
      "Long-term success depends not only on creating digital tokens but on building trusted verification systems that support institutional adoption. Verify once. Transact everywhere.",
    ],
    relatedHref: "/integrate",
  },
];

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find(a => a.slug === slug);
}
