"use client";
// FILE: app/case-studies/smyrna/page.tsx
// Second asset case study. capital partner / equity verification template.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, KeyValueTable, BulletList } from "@/components/redesign/RedesignContent";
import { CaseStudyPhotoHero } from "@/components/case-studies/CaseStudyGallery";
import { SmyrnaPhotoGallery } from "@/components/case-studies/SmyrnaPhotoGallery";
import {
  SMYRNA_ASSET,
  SMYRNA_CONFLICTS,
  SMYRNA_SOURCES,
  SMYRNA_PROOF,
  SMYRNA_STRUCTURES,
} from "@/lib/smyrnaCaseStudy";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#06B6D4";

const LEVEL_COLOR: Record<string, string> = {
  "L1 Reference": "#F59E0B",
  "L2 Review": "#3B82F6",
  "L3 Attested": "#10B981",
};

export default function SmyrnaCaseStudyPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Case study · Verified residential"
        title={SMYRNA_ASSET.name}
        subtitle="Second asset template: clear title, Battery Atlanta corridor, capital partner pipeline. Honest stage. not yet MARKETPLACE_LIVE like Cielo."
      />

      <CaseStudyPhotoHero
        src={SMYRNA_ASSET.image}
        alt="Smyrna Townhome"
        badge={SMYRNA_ASSET.designation}
        title={SMYRNA_ASSET.name}
        subtitle={SMYRNA_ASSET.subtitle}
      />

      <ContentCard title="Property photos & location context">
        <SmyrnaPhotoGallery altPrefix="Smyrna Townhome" />
      </ContentCard>

      <ContentCard title="Asset snapshot">
        <KeyValueTable rows={[
          { k: "Registry ID", v: SMYRNA_ASSET.id, mono: true },
          { k: "Location", v: SMYRNA_ASSET.location },
          { k: "Purchase (1999)", v: SMYRNA_ASSET.stats.purchase1999 },
          { k: "Current est.", v: SMYRNA_ASSET.stats.currentEst },
          { k: "Appreciation", v: SMYRNA_ASSET.stats.appreciation },
          { k: "Lien", v: SMYRNA_ASSET.stats.lien },
          { k: "Pipeline stage", v: "V5 · Open for capital partner" },
        ]} />
      </ContentCard>

      <ContentCard title={SMYRNA_CONFLICTS.headline}>
        {SMYRNA_CONFLICTS.items.map(item => (
          <div key={item.topic} style={{ marginBottom: "1rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
              {item.topic}
            </div>
            <p style={body}>{item.disclosure}</p>
            <p style={{ ...body, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
              {item.implication}
            </p>
          </div>
        ))}
      </ContentCard>

      <ContentCard title="Sourced metrics">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Claim", "Value", "Level", "Source", "As of"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SMYRNA_SOURCES.map(row => (
                <tr key={row.claim} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem", fontWeight: 600 }}>{row.claim}</td>
                  <td style={{ padding: "0.5rem", color: ACCENT, fontWeight: 700 }}>{row.value}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <span style={{ fontSize: "0.58rem", fontWeight: 700, color: LEVEL_COLOR[row.level] }}>{row.level}</span>
                  </td>
                  <td style={{ padding: "0.5rem", color: "var(--text-secondary)" }}>{row.source}</td>
                  <td style={{ padding: "0.5rem", color: "var(--text-muted)" }}>{row.asOf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentCard>

      <ContentCard title="Illustrative capital structures (not offers)">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {SMYRNA_STRUCTURES.map(s => (
            <div key={s.title} style={{ padding: "0.85rem", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700 }}>{s.title}</span>
                <span style={{ fontSize: "0.55rem", fontWeight: 700, color: ACCENT, padding: "0.15rem 0.4rem", borderRadius: 999, background: `${ACCENT}15` }}>
                  {s.badge}
                </span>
              </div>
              <p style={{ ...body, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Proof & next steps">
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {SMYRNA_PROOF.map(p => (
            <Link key={p.href} href={p.href} style={{
              display: "grid", gridTemplateColumns: "1fr auto", padding: "0.65rem 0",
              borderBottom: "1px solid var(--border)", textDecoration: "none", color: "inherit",
            }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700 }}>{p.label}</div>
                <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)" }}>{p.desc}</div>
              </div>
              <span style={{ color: ACCENT, alignSelf: "center" }}>→</span>
            </Link>
          ))}
        </div>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/case-studies/cielo" size="lg">Compare: Cielo →</Btn>
        <Btn href="/investors" variant="secondary" size="lg">Capital partner intake</Btn>
        <Link href="/verify" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          Public registry →
        </Link>
      </div>
    </RedesignPage>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: "0 0 0.5rem",
};
