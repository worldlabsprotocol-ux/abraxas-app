"use client";
// FILE: components/home/HomeUnifiedProductEntry.tsx

import { useEffect } from "react";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { HomeNativeSandboxChapter } from "@/components/home/HomeNativeSandboxChapter";

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
    <section id="start-sandbox" className="abx-home-unified-entry" aria-label="Start sandbox">
      <LazyHomeSection minHeight="10rem" eager>
        <HomeNativeSandboxChapter />
      </LazyHomeSection>
    </section>
  );
}
