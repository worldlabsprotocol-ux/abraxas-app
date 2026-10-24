"use client";
// FILE: components/home/HomeUnifiedProductEntry.tsx
// Single cohesive product-entry region below the approved hero.

import { useCallback, useEffect, useState } from "react";
import { HomeHowAbraxasWorksSection } from "@/components/home/HomeHowAbraxasWorksSection";
import { HomeVerifiableTrustChapter } from "@/components/home/HomeVerifiableTrustChapter";
import { HomeBuildEntrySection } from "@/components/home/HomeBuildEntrySection";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";
import { HomeNativeSandboxChapter } from "@/components/home/HomeNativeSandboxChapter";
import {
  HOMEPAGE_UNIFIED_EYEBROW,
  HOMEPAGE_UNIFIED_LEAD,
  HOMEPAGE_UNIFIED_PANELS,
  type HomeUnifiedEntryPanel,
} from "@/lib/home/homepageUnifiedEntryCopy";

const PANEL_TO_HASH: Record<HomeUnifiedEntryPanel, string> = {
  workspace: "start-sandbox",
  how: "how-abraxas-works",
  evidence: "chapter-evidence",
  build: "chapter-build-wrap",
};

function panelFromHash(hash: string): HomeUnifiedEntryPanel {
  const id = hash.replace(/^#/, "");
  if (id === "how-abraxas-works" || id === "chapter-how") return "how";
  if (id === "chapter-evidence") return "evidence";
  if (id === "chapter-build-wrap") return "build";
  return "workspace";
}

export function HomeUnifiedProductEntry() {
  const [active, setActive] = useState<HomeUnifiedEntryPanel>("workspace");

  const syncFromLocation = useCallback(() => {
    if (typeof window === "undefined") return;
    setActive(panelFromHash(window.location.hash));
  }, []);

  useEffect(() => {
    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    return () => window.removeEventListener("hashchange", syncFromLocation);
  }, [syncFromLocation]);

  function selectPanel(id: HomeUnifiedEntryPanel) {
    setActive(id);
    if (typeof window !== "undefined") {
      const hash = PANEL_TO_HASH[id];
      window.history.replaceState(null, "", hash ? `#${hash}` : "/");
    }
  }

  return (
    <section
      id="start-with-abraxas"
      className="abx-home-unified-entry"
      aria-labelledby="home-unified-heading"
    >
      <header className="abx-home-unified-entry__header">
        <p className="abx-home-unified-entry__eyebrow">{HOMEPAGE_UNIFIED_EYEBROW}</p>
        <h2 id="home-unified-heading" className="abx-v2-section-title">
          {HOMEPAGE_UNIFIED_EYEBROW}
        </h2>
        <p className="abx-v2-section-lead abx-v2-section-lead--tight">{HOMEPAGE_UNIFIED_LEAD}</p>
      </header>

      <HomeSignedInModule />

      <nav className="abx-home-unified-entry__nav" aria-label="Product entry">
        {HOMEPAGE_UNIFIED_PANELS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            className={`abx-home-unified-entry__tab${active === panel.id ? " abx-home-unified-entry__tab--active" : ""}`}
            aria-current={active === panel.id ? "true" : undefined}
            onClick={() => selectPanel(panel.id)}
          >
            <span className="abx-home-unified-entry__tab-label">{panel.label}</span>
            <span className="abx-home-unified-entry__tab-desc">{panel.description}</span>
          </button>
        ))}
      </nav>

      <div className="abx-home-unified-entry__panel">
        {active === "workspace" ? (
          <LazyHomeSection minHeight="10rem" eager>
            <HomeNativeSandboxChapter />
          </LazyHomeSection>
        ) : null}
        {active === "how" ? <HomeHowAbraxasWorksSection /> : null}
        {active === "evidence" ? (
          <div id="chapter-evidence">
            <LazyHomeSection minHeight="22rem" eager>
              <HomeVerifiableTrustChapter />
            </LazyHomeSection>
          </div>
        ) : null}
        {active === "build" ? (
          <div id="chapter-build-wrap">
            <HomeBuildEntrySection />
          </div>
        ) : null}
      </div>
    </section>
  );
}
