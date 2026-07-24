"use client";
// FILE: app/case-studies/cmn-pokemon-collection/page.tsx
// PSA Pokémon collectibles — registry reference (not for sale).

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, KeyValueTable } from "@/components/redesign/RedesignContent";
import { CmnPokemonPhotoGallery } from "@/components/case-studies/CmnPokemonPhotoGallery";
import { CmnPokemonTeaserVisual } from "@/components/registry/CmnPokemonTeaserVisual";
import {
  CMN_POKEMON_ASSET,
  CMN_POKEMON_CARDS,
  CMN_POKEMON_CONFLICTS,
  CMN_POKEMON_PROOF,
  CMN_POKEMON_SOURCES,
} from "@/lib/cmnPokemonCaseStudy";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#A78BFA";

const LEVEL_COLOR: Record<string, string> = {
  "L1 Reference": "#F59E0B",
  "L2 Review": "#3B82F6",
  "L3 Pending": "#8B5CF6",
  "L3 Attested": "#10B981",
};

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.6,
  margin: "0 0 0.75rem",
};

export default function CmnPokemonCollectionPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Case study · Collectibles · Graded Card"
        title={CMN_POKEMON_ASSET.name}
        subtitle="First PSA slab on-registry — new collectibles asset class on Abraxas. Not listed for sale."
      />

      <div style={{
        position: "relative", borderRadius: 18, overflow: "hidden",
        marginBottom: "0.65rem", background: "#000000",
      }}>
        <CmnPokemonTeaserVisual height={320} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 48%)",
        }} />
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, zIndex: 3 }}>
          <span style={{
            display: "inline-block", fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
            padding: "0.3rem 0.6rem", borderRadius: 999, marginBottom: "0.5rem",
            background: "rgba(232,197,71,0.2)", color: "var(--accent, #E8C547)",
            border: "1px solid var(--accent-border, rgba(232,197,71,0.4))",
          }}>
            {CMN_POKEMON_ASSET.designation}
          </span>
          <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            {CMN_POKEMON_ASSET.name}
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
            {CMN_POKEMON_ASSET.subtitle}
          </div>
        </div>
      </div>

      <ContentCard title="Featured slab">
        <CmnPokemonPhotoGallery altPrefix="PSA Pokémon slab" />
      </ContentCard>

      <ContentCard title="Registry snapshot">
        <KeyValueTable rows={[
          { k: "Registry ID", v: CMN_POKEMON_ASSET.id, mono: true },
          { k: "Owner", v: CMN_POKEMON_ASSET.owner },
          { k: "Asset class", v: CMN_POKEMON_ASSET.stats.assetClass },
          { k: "Grading", v: CMN_POKEMON_ASSET.stats.grading },
          { k: "Custody", v: CMN_POKEMON_ASSET.stats.custody },
          { k: "Disposition", v: CMN_POKEMON_ASSET.stats.disposition },
          { k: "Gallery capacity", v: CMN_POKEMON_ASSET.stats.photoCount },
        ]} />
      </ContentCard>

      {CMN_POKEMON_CARDS.length > 0 && (
        <ContentCard title="Card manifest">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.72rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Slot", "Card", "Set", "Grade", "Cert #"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CMN_POKEMON_CARDS.map(row => (
                  <tr key={row.slot} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>{row.slot}</td>
                    <td style={{ padding: "0.5rem", fontWeight: 600 }}>{row.name}</td>
                    <td style={{ padding: "0.5rem", color: "var(--text-secondary)" }}>{row.set ?? "—"}</td>
                    <td style={{ padding: "0.5rem", color: ACCENT, fontWeight: 700 }}>{row.grade}</td>
                    <td style={{ padding: "0.5rem", fontFamily: "monospace", color: "var(--text-muted)" }}>{row.certNumber ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}

      <ContentCard title={CMN_POKEMON_CONFLICTS.headline}>
        {CMN_POKEMON_CONFLICTS.items.map(item => (
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

      <ContentCard title="Sourced fields">
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
              {CMN_POKEMON_SOURCES.map(row => (
                <tr key={row.claim} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem", fontWeight: 600 }}>{row.claim}</td>
                  <td style={{ padding: "0.5rem", color: ACCENT, fontWeight: 700 }}>{row.value}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <span style={{ fontSize: "0.58rem", fontWeight: 700, color: LEVEL_COLOR[row.level] ?? "var(--text-muted)" }}>{row.level}</span>
                  </td>
                  <td style={{ padding: "0.5rem", color: "var(--text-secondary)" }}>{row.source}</td>
                  <td style={{ padding: "0.5rem", color: "var(--text-muted)" }}>{row.asOf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentCard>

      <ContentCard title="Proof & links">
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {CMN_POKEMON_PROOF.map(p => (
            <Link key={p.label} href={p.href} style={{ textDecoration: "none" }}>
              <div style={{
                padding: "0.75rem 1rem", borderRadius: 12,
                background: "var(--surface)", border: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem",
              }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>{p.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{p.desc}</div>
                </div>
                <span style={{ color: ACCENT, fontSize: "1rem" }}>→</span>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Btn href={CMN_POKEMON_ASSET.verifyPath} variant="primary">View verify record</Btn>
          <Btn href="/verify" variant="ghost">All registry assets</Btn>
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
