"use client";
// FILE: components/home/HomeDocsBrief.tsx
// Documentation entry point on the homepage.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { DOCS_HUB_NAV } from "@/lib/docs/docsHub";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeDocsBrief() {
  return (
    <section aria-labelledby="home-docs-heading" id="docs">
      <p className="abx-section-label" style={{ marginBottom: "0.5rem" }}>
        Documentation
      </p>
      <h2 id="home-docs-heading" className="abx-home-h2" style={{ marginBottom: "0.5rem" }}>
        Understand the protocol in minutes
      </h2>
      <p className="abx-home-lead" style={{ marginBottom: "1rem", maxWidth: 640 }}>
        Overview, quick start, core concepts, and developer docs. Each section fits one screen.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "1rem" }}>
        {DOCS_HUB_NAV.map((item) => (
          <Link
            key={item.id}
            href={`/docs#docs-group-${item.id}`}
            style={{
              padding: "0.4rem 0.75rem", borderRadius: 10,
              border: "1px solid var(--border)", color: "var(--text-secondary)",
              fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600, textDecoration: "none",
            }}
          >
            {item.title}
          </Link>
        ))}
      </div>
      <Btn href="/docs" variant="secondary" size="sm">Read documentation</Btn>
    </section>
  );
}
