"use client";
// FILE: app/north-star/page.tsx
// External-facing focus — no internal memo mechanics.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  ABRAXAS_CATEGORY,
  ABRAXAS_HEADLINE,
  ABRAXAS_ONE_LINER,
  ABRAXAS_SUBHEAD,
  NORTH_STAR_PRINCIPLES,
} from "@/lib/northStar";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

const CURRENT_FOCUS = [
  "Finish the Cielo reference loop — sign in, consent, verify, book with USDC on Sui",
  "Support active design partners in hospitality and tribal/mineral verticals",
  "Measure time saved, documents avoided, and repeat verification eliminated",
  "Keep the public registry honest — real numbers, clear assurance scope",
];

const WHATS_NEXT = [
  "Publish partner case studies with approved names and metrics",
  "Expand relying parties beyond first-party Cielo dogfood",
  "Expand financial-asset vertical once hospitality and land partner metrics compound",
];

export default function NorthStarPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow={ABRAXAS_CATEGORY}
        title={ABRAXAS_HEADLINE}
        subtitle={ABRAXAS_SUBHEAD}
      />

      <ContentCard title="What we believe">
        <p style={quoteStyle}>{ABRAXAS_ONE_LINER}</p>
        <p style={{ ...bodyStyle, marginBottom: 0, marginTop: "0.75rem" }}>
          You prove something once. Then you never upload it again. That is the entire category.
        </p>
      </ContentCard>

      <ContentCard title="Principles">
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.65rem" }}>
          {NORTH_STAR_PRINCIPLES.slice(0, 6).map((p, i) => (
            <li key={p.id} style={{
              padding: "0.75rem 0.85rem", borderRadius: 12,
              border: "1px solid var(--border)", background: "var(--surface)",
            }}>
              <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: ACCENT, fontWeight: 700, marginBottom: 4 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                {p.title}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
                {p.body}
              </p>
            </li>
          ))}
        </ol>
      </ContentCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        <ContentCard title="Current focus">
          <ul style={listStyle}>
            {CURRENT_FOCUS.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentCard>
        <ContentCard title="What's next">
          <ul style={listStyle}>
            {WHATS_NEXT.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ContentCard>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/#workflow" size="lg">See the workflow →</Btn>
        <Btn href="/design-partner" variant="secondary" size="lg">Design partners →</Btn>
        <Link href="/" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          Home →
        </Link>
      </div>
    </RedesignPage>
  );
}

const quoteStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "1rem",
  fontWeight: 700,
  color: "var(--text-primary)",
  lineHeight: 1.55,
  margin: 0,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: "0 0 0.75rem",
};

const listStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
  paddingLeft: "1.1rem",
};
