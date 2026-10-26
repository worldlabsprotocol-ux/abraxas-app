"use client";
// FILE: components/home/HomeUnifiedProductEntry.tsx
// Sandbox-first entry below protocol explanation.

import { useEffect } from "react";
import Link from "next/link";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { HomeNativeSandboxChapter } from "@/components/home/HomeNativeSandboxChapter";
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";
import {
  HOMEPAGE_UNIFIED_EYEBROW,
  HOMEPAGE_UNIFIED_LEAD,
  HOMEPAGE_UNIFIED_RESOURCE_LINKS,
} from "@/lib/home/homepageUnifiedEntryCopy";

const LEGACY_HASH_REDIRECTS: Record<string, string> = {
  "how-abraxas-works": "protocol-infrastructure",
  "chapter-how": "protocol-infrastructure",
  "chapter-evidence": "protocol-infrastructure",
  "chapter-build-wrap": "start-sandbox",
};

export function HomeUnifiedProductEntry() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.location.hash.replace(/^#/, "");
    const target = LEGACY_HASH_REDIRECTS[id];
    if (target && window.location.hash !== `#${target}`) {
      window.history.replaceState(null, "", `#${target}`);
    }
  }, []);

  return (
    <section
      id="start-with-abraxas"
      className="abx-home-unified-entry"
      aria-labelledby="home-unified-heading"
    >
      <header className="abx-home-unified-entry__header">
        <p className="abx-home-unified-entry__eyebrow">{HOMEPAGE_UNIFIED_EYEBROW}</p>
        <h2 id="home-unified-heading" className="abx-v2-section-title">
          Start sandbox
        </h2>
        <p className="abx-v2-section-lead abx-v2-section-lead--tight">{HOMEPAGE_UNIFIED_LEAD}</p>
      </header>

      <HomeSignedInModule />

      <LazyHomeSection minHeight="10rem" eager>
        <HomeNativeSandboxChapter />
      </LazyHomeSection>

      <nav className="abx-home-unified-entry__resources" aria-label="Supporting developer resources">
        {HOMEPAGE_UNIFIED_RESOURCE_LINKS.map((link) => (
          <Link key={link.href} className="abx-home-unified-entry__resource-link" href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
