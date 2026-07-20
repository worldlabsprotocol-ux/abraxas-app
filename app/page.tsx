// FILE: app/page.tsx
// Landing page — server-rendered sections for crawlers and fast first paint.

import type { Metadata } from "next";
import { RedesignHome } from "@/components/redesign/RedesignHome";
import { PreRaiseHero } from "@/components/home/PreRaiseHero";
import { HomePublicVerifierSection } from "@/components/home/HomePublicVerifierSection";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { HomeLiveProof } from "@/components/home/HomeLiveProof";
import { HomeStatusCard } from "@/components/home/HomeStatusCard";
import { HomeBuilderStrip } from "@/components/home/HomeBuilderStrip";
import { canonicalOrigin, siteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Abraxas — Stop proving your assets over and over",
  description: "One verification. Unlimited applications. Verification infrastructure for real-world assets.",
  alternates: { canonical: siteUrl("/") },
  openGraph: {
    title: "Abraxas — Stop proving your assets over and over",
    description: "One verification. Unlimited applications.",
    url: siteUrl("/"),
    siteName: "Abraxas",
    images: ["/og-image.jpg"],
    type: "website",
  },
};

function OrganizationJsonLd() {
  const origin = canonicalOrigin();
  const json = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Abraxas Protocol",
    url: origin,
    logo: `${origin}/icon-512.png`,
    description: "Verification infrastructure for real-world assets. Verify once, reuse proof across relying parties.",
    sameAs: [
      "https://www.linkedin.com/company/worldlabsprotocol/",
      "https://github.com/worldlabsprotocol-ux/abraxas-app",
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />
      <RedesignHome>
        <PreRaiseHero />
        <HomePublicVerifierSection />
        <HomeHowItWorks />
        <HomeLiveProof />
        <HomeStatusCard />
        <HomeBuilderStrip />
      </RedesignHome>
    </>
  );
}
