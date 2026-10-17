"use client";
// FILE: components/home/HomeBuildEntrySection.tsx

import Link from "next/link";
import dynamic from "next/dynamic";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { HomeWorkspacePrimaryCta } from "@/components/home/HomeSandboxSessionEntry";
import {
  HOMEPAGE_CLOSE_HEADING,
  HOMEPAGE_CLOSE_LEAD,
  HOMEPAGE_CTA_DEVELOPER_GUIDES,
  HOMEPAGE_FEATURES_EXPANDER,
} from "@/lib/home/homepagePlainCopy";

const CapabilityMatrix = dynamic(
  () => import("@/components/institutional/CapabilityMatrix").then((m) => m.CapabilityMatrix),
  { ssr: false, loading: () => <div className="abx-lazy-home-section" style={{ minHeight: "8rem" }} aria-hidden /> },
);

export function HomeBuildEntrySection() {
  return (
    <section id="chapter-build" className="abx-cinematic-build-chapter abx-home-close-section" aria-labelledby="home-close-heading">
      <h2 id="home-close-heading" className="abx-v2-section-title">
        {HOMEPAGE_CLOSE_HEADING}
      </h2>
      <p className="abx-v2-section-lead abx-v2-section-lead--tight">{HOMEPAGE_CLOSE_LEAD}</p>
      <div className="abx-build-entry__actions">
        <HomeWorkspacePrimaryCta />
        <Link className="abx-premium-hero__cta abx-premium-hero__cta--secondary" href="/docs">
          {HOMEPAGE_CTA_DEVELOPER_GUIDES}
        </Link>
      </div>

      <details className="abx-build-entry__advanced">
        <summary>{HOMEPAGE_FEATURES_EXPANDER}</summary>
        <LazyHomeSection minHeight="12rem">
          <CapabilityMatrix />
        </LazyHomeSection>
      </details>
    </section>
  );
}
