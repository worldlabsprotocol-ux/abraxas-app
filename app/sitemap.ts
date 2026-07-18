import type { MetadataRoute } from "next";
import { PILLAR_PAGES, SOLUTION_PAGES, COMPARISON_PAGES } from "@/lib/categoryInfrastructure";
import { SITE_URL } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.replace(/\/$/, "");
  const staticRoutes = [
    "",
    "/terminal",
    "/passport",
    "/platform",
    "/solutions",
    "/learn",
    "/developers",
    "/comparisons",
    "/research",
    "/tools/verification-cost-calculator",
    "/docs",
    "/roadmap",
    "/about",
  ];

  return [
    ...staticRoutes.map(path => ({
      url: `${base}${path || "/"}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" || path === "/terminal" ? 1 : 0.8,
    })),
    ...PILLAR_PAGES.map(p => ({
      url: `${base}/learn/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...SOLUTION_PAGES.map(s => ({
      url: `${base}/solutions/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...COMPARISON_PAGES.map(c => ({
      url: `${base}/comparisons/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
