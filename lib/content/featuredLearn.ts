// FILE: lib/content/featuredLearn.ts
// Featured learn hub cards. Keep in sync with blogArticles.ts slugs.

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
    slug: "top-5-rwa-verification-platforms",
    title: "Top 5 RWA Verification Platforms for Real-World Asset Tokenization",
    description:
      "What verification platforms do before minting, and how Abraxas compares alongside identity and compliance vendors.",
    category: "product",
    readingTime: "12 min",
  },
  {
    slug: "what-is-real-world-asset-tokenization",
    title: "What Is Real-World Asset Tokenization?",
    description:
      "Seven institutional steps, diligence questions, and why minting alone is not enough. The full thesis.",
    category: "product",
    readingTime: "12 min",
  },
];

export const LEARN_HUB_LINKS = [
  { label: "Top 5 verification platforms", href: "/blog/top-5-rwa-verification-platforms" },
  { label: "RWA tokenization essay", href: "/blog/what-is-real-world-asset-tokenization" },
  { label: "Thesis on Medium", href: "https://medium.com/@worldlabsprotocol/what-is-real-world-asset-tokenization-13d6c8d0a595" },
  { label: "Comparison on Medium", href: "https://medium.com/@worldlabsprotocol/top-5-rwa-verification-platforms-for-real-world-asset-tokenization-35c1f5d82a49" },
  { label: "All articles", href: "/blog" },
  { label: "Trust over time", href: "/trust-framework#trust-over-time" },
  { label: "Cielo case study", href: "/case-studies/cielo" },
] as const;
