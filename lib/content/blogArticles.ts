// FILE: lib/content/blogArticles.ts
// Static blog articles — maps slugs to content until MD pipeline ships.

import type { BlogCategory } from "./types";

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  readingTime: string;
  body: string[];
  relatedHref?: string;
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "why-tokenization-alone-isnt-enough",
    title: "Why Tokenization Alone Isn't Enough",
    description: "Minting an asset on-chain does not create institutional trust.",
    category: "problem",
    readingTime: "6 min",
    body: [
      "The RWA market crossed $30B because institutions want liquidity — not because minting a token magically creates trust.",
      "Counterparties still re-run KYC, re-request appraisals, and re-verify title at every transaction. That friction is where deals die.",
      "Abraxas positions assets before the legacy system catches up: verify once, consent-based reuse, policy-gated decisions at transaction time.",
    ],
    relatedHref: "/build",
  },
  {
    slug: "hidden-cost-repeated-verification",
    title: "The Hidden Cost of Repeated Verification",
    description: "Time, drop-off, trust erosion, and support burden.",
    category: "problem",
    readingTime: "7 min",
    body: [
      "Every repeated document upload is a conversion leak. Every manual review is margin burned.",
      "Hospitality operators feel this on guest checkout. Land sellers feel it when every buyer's lender asks for the same plat PDFs.",
      "Reusable credentials collapse that loop — the holder controls disclosure, the relying party checks live state.",
    ],
    relatedHref: "/trust-framework",
  },
  {
    slug: "cielo-sunrise-proof-model-works",
    title: "Cielo Sunrise: Proof That the Model Works",
    description: "Genesis asset — appraisal, STR revenue, USDC on Sui.",
    category: "proof",
    readingTime: "10 min",
    body: [
      "Cielo Sunrise is the first asset run through the full Abraxas loop: registry, passport-gated booking, verified guest policy, and on-chain settlement path.",
      "This is not a deck slide — it is a live property with real revenue and a public verify record.",
    ],
    relatedHref: "/case-studies/cielo",
  },
  {
    slug: "reusable-trust-institutional-finance",
    title: "How Reusable Trust Changes Institutional Finance",
    description: "W3C credentials, zkLogin, policy engine.",
    category: "product",
    readingTime: "8 min",
    body: [
      "Institutions do not need another identity silo. They need a minimum proof envelope that fails closed when state drifts.",
      "Abraxas issues signed claims, partners evaluate policy server-side, and monitoring feeds refresh or suspend attestations when material facts change.",
    ],
    relatedHref: "/integrate",
  },
  {
    slug: "founder",
    title: "From the builder",
    description: "Why Abraxas exists — twenty years in markets, one verification model.",
    category: "founder",
    readingTime: "5 min",
    body: [
      "I traded through every macro regime that taught me the same lesson: the edge is not information alone — it is acting before the crowd prices it in.",
      "Tokenization without verification is a timing trap. Legacy assets go on-chain quietly, then extract a premium from people who waited.",
      "Abraxas is the protocol layer to position assets now — verify, tokenize-ready, transact with reusable trust — so holders exercise options when the chain opens, not after.",
    ],
    relatedHref: "/about/team",
  },
];

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find(a => a.slug === slug);
}
