// FILE: lib/content/featuredLearn.ts
// Featured learn hub cards — keep in sync with content/blog/*.md slugs.

import type { BlogCategory } from "./types";

export interface FeaturedLearnArticle {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  readingTime: string;
}

export const FEATURED_LEARN_ARTICLES: FeaturedLearnArticle[] = [
  {
    slug: "why-tokenization-alone-isnt-enough",
    title: "Why Tokenization Alone Isn't Enough",
    description: "Minting an asset on-chain does not create institutional trust. The gap is repeated verification.",
    category: "problem",
    readingTime: "6 min",
  },
  {
    slug: "hidden-cost-repeated-verification",
    title: "The Hidden Cost of Repeated Verification",
    description: "Time, drop-off, trust erosion, and support burden — with examples from hospitality and RWAs.",
    category: "problem",
    readingTime: "7 min",
  },
  {
    slug: "cielo-sunrise-proof-model-works",
    title: "Cielo Sunrise: Proof That the Model Works",
    description: "$1.1M appraisal, live STR, Superhost, USDC on Sui — the genesis case study.",
    category: "proof",
    readingTime: "10 min",
  },
  {
    slug: "reusable-trust-institutional-finance",
    title: "How Reusable Trust Changes Institutional Finance",
    description: "W3C credentials, zkLogin, policy engine — one verification across counterparties.",
    category: "product",
    readingTime: "8 min",
  },
];

export const LEARN_HUB_LINKS = [
  { label: "All articles", href: "/blog" },
  { label: "From the builder", href: "/blog/founder" },
  { label: "Community", href: "/community" },
  { label: "Cielo case study", href: "/case-studies/cielo" },
] as const;
