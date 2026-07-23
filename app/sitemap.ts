// FILE: app/sitemap.ts

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { BLOG_ARTICLES } from "@/lib/content/blogArticles";

const STATIC_ROUTES = [
  "",
  "/passport",
  "/integrate",
  "/verification",
  "/mainnet",
  "/trust-framework",
  "/build",
  "/blog",
  "/docs",
  "/docs/why-verification",
  "/security",
  "/roadmap",
  "/about",
  "/faq",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries = STATIC_ROUTES.map(path => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const blogEntries = BLOG_ARTICLES.map(article => ({
    url: `${SITE_URL}/blog/${article.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: article.featured ? 0.9 : 0.7,
  }));

  return [...staticEntries, ...blogEntries];
}
