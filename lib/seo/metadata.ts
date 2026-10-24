// FILE: lib/seo/metadata.ts
// Next.js metadata helpers with consistent SEO keywords.

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { SEO_ALL_KEYWORDS, SEO_DEFAULT_DESCRIPTION, SEO_DEFAULT_TITLE } from "./keywords";

export function siteMetadata(overrides?: Partial<Metadata>): Metadata {
  const title = overrides?.title ?? SEO_DEFAULT_TITLE;
  const description =
    typeof overrides?.description === "string" ? overrides.description : SEO_DEFAULT_DESCRIPTION;

  return {
    metadataBase: new URL(SITE_URL),
    icons: {
      icon: [
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: "/icon-192.png",
    },
    title: {
      default: typeof title === "string" ? title : SEO_DEFAULT_TITLE,
      template: "%s · abraxasworld.xyz",
    },
    description,
    keywords: SEO_ALL_KEYWORDS,
    openGraph: {
      title: typeof title === "string" ? title : SEO_DEFAULT_TITLE,
      description,
      url: SITE_URL,
      siteName: "Abraxas",
      images: ["/og-image.jpg"],
      type: "website",
      ...overrides?.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: typeof title === "string" ? title : SEO_DEFAULT_TITLE,
      description,
      images: ["/og-image.jpg"],
      ...overrides?.twitter,
    },
    alternates: overrides?.alternates,
    ...overrides,
  };
}

export function pageMetadata(input: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const url = input.path ? `${SITE_URL}${input.path}` : SITE_URL;
  return siteMetadata({
    title: input.title,
    description: input.description,
    openGraph: {
      title: input.title,
      description: input.description,
      url,
    },
    twitter: {
      title: input.title,
      description: input.description,
    },
    alternates: input.path ? { canonical: url } : undefined,
  });
}
