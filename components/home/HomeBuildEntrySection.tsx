"use client";
// FILE: components/home/HomeBuildEntrySection.tsx

import Link from "next/link";
import dynamic from "next/dynamic";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { InstitutionalHomeClose } from "@/components/institutional/InstitutionalHomeClose";

const CapabilityMatrix = dynamic(
  () => import("@/components/institutional/CapabilityMatrix").then((m) => m.CapabilityMatrix),
  { ssr: false, loading: () => <div className="abx-lazy-home-section" style={{ minHeight: "8rem" }} aria-hidden /> },
);

export function HomeBuildEntrySection() {
  return (
    <section id="chapter-build" className="abx-cinematic-build-chapter" aria-labelledby="home-build-heading">
      <p className="abx-v2-eyebrow">Build with Abraxas</p>
      <h2 id="home-build-heading" className="abx-v2-section-title">
        Build with Abraxas
      </h2>
      <div className="abx-build-entry__actions">
        <Link className="abx-premium-hero__cta abx-premium-hero__cta--primary" href="#start-sandbox">
          Open sandbox
        </Link>
        <Link className="abx-premium-hero__cta abx-premium-hero__cta--secondary" href="/docs">
          Developer documentation
        </Link>
      </div>

      <details className="abx-build-entry__advanced">
        <summary>Capability matrix — product access states for this deployment</summary>
        <LazyHomeSection minHeight="12rem">
          <CapabilityMatrix />
        </LazyHomeSection>
      </details>

      <InstitutionalHomeClose />
    </section>
  );
}
