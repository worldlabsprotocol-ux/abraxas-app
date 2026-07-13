"use client";
// FILE: app/case-studies/cpg-grady-270/page.tsx
// CPG Land Sales · Grady County 270 — bullish land partner listing.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, KeyValueTable, BulletList } from "@/components/redesign/RedesignContent";
import { CaseStudyVideoHero } from "@/components/case-studies/CaseStudyGallery";
import {
  CPG_ASSET,
  CPG_PARTNER,
  CPG_SOURCES,
  CPG_PROOF,
  CPG_DILIGENCE,
  CPG_LOTS,
  CPG_PRICING,
  CPG_SURVEY_FILES,
  CPG_WHAT_THIS_PROVES,
  CPG_HIGHLIGHTS,
  formatUsd,
} from "@/lib/cpgLandCaseStudy";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const LEVEL_COLOR: Record<string, string> = {
  "L1 Reference": "#F59E0B",
  "L2 Review": "#3B82F6",
  "L3 Attested": "#10B981",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  under_contract: "Under contract",
  contingent: "Contingent",
};

export default function CpgGradyCaseStudyPage() {
  return (
    <RedesignPage maxWidth={920}>
      <PageHeader
        eyebrow="Active land listing · Verified partner"
        title={`${CPG_ASSET.name}`}
        subtitle="~270 acres across 11 surveyed tracts in Grady County, OK — Oklahoma City growth corridor. Drone footage, completed surveys, Phase I clean, and contracts at asking before full MLS launch."
      />

      <CaseStudyVideoHero
        src={CPG_ASSET.heroVideo}
        poster={CPG_ASSET.heroVideoPoster}
        alt="Drone footage · Grady County 270 Oklahoma land"
        badge={CPG_ASSET.designation}
        title={CPG_ASSET.name}
        subtitle={CPG_ASSET.subtitle}
      />

      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem",
      }}>
        <Btn href={CPG_PARTNER.website} newTab size="lg">Inquire with CPG Land Sales →</Btn>
        <Btn href={CPG_ASSET.lot4Mls} newTab variant="secondary" size="sm">Lot 4 on MLS →</Btn>
        <Btn href={`/verify/${encodeURIComponent(CPG_ASSET.id)}`} variant="ghost" size="sm">Verify record →</Btn>
      </div>

      <ContentCard title="At a glance">
        <KeyValueTable rows={[
          { k: "Registry ID", v: CPG_ASSET.id, mono: true },
          { k: "Seller", v: `${CPG_PARTNER.name} · ${CPG_PARTNER.contact}` },
          { k: "Location", v: CPG_ASSET.location },
          { k: "Size", v: `~${CPG_ASSET.parentAcres} acres · 11 surveyed lots` },
          { k: "Full project", v: formatUsd(CPG_PRICING.fullProject) },
          { k: "Bulk package", v: `${formatUsd(CPG_PRICING.bulkFullProject)} (full project convenience)` },
          { k: "Lots 2–4 bundle", v: `${formatUsd(CPG_PRICING.lots234Bundle)} · 81.74 ac contiguous` },
          { k: "Closing", v: CPG_PARTNER.titleCompany },
        ]} />
      </ContentCard>

      <ContentCard title="Why this land">
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {CPG_HIGHLIGHTS.map(h => (
            <div key={h.title} style={{
              padding: "0.85rem 1rem", borderRadius: 12,
              border: `1px solid ${ACCENT}33`, background: `${ACCENT}08`,
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                {h.title}
              </div>
              <p style={{ ...body, margin: 0 }}>{h.body}</p>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Pricing & packages">
        <KeyValueTable rows={[
          { k: "Full project (11 lots · ~270 ac)", v: formatUsd(CPG_PRICING.fullProject) },
          { k: "Bulk acquisition (partner convenience)", v: formatUsd(CPG_PRICING.bulkFullProject) },
          { k: "Remaining 9 lots (2–4, 6–11)", v: formatUsd(CPG_PRICING.remaining9Lots) },
          { k: "Fast approval threshold (9 lots)", v: `≥ ${formatUsd(CPG_PRICING.remaining9LotsFastApproval)}` },
          { k: "Lots 2–4 contiguous bundle", v: `${formatUsd(CPG_PRICING.lots234Bundle)} (list ${formatUsd(CPG_PRICING.lots234List)})` },
          { k: "10 lots · ~235 ac (if Lot 1 available)", v: formatUsd(CPG_PRICING.tenLots235Acres) },
        ]} />
      </ContentCard>

      <ContentCard title="Lot schedule">
        <p style={{ ...body, marginTop: 0 }}>{CPG_ASSET.availableLotsNote}</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Lot", "Acres", "Price", "Status", "Notes"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CPG_LOTS.map(row => (
                <tr key={row.lot} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem", fontWeight: 700 }}>{row.lot}</td>
                  <td style={{ padding: "0.5rem" }}>{row.acres}</td>
                  <td style={{ padding: "0.5rem", color: ACCENT, fontWeight: 700 }}>
                    {row.priceUsd > 0 ? formatUsd(row.priceUsd) : "On request"}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{STATUS_LABEL[row.status] ?? row.status}</td>
                  <td style={{ padding: "0.5rem", color: "var(--text-muted)", maxWidth: 220 }}>{row.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentCard>

      <ContentCard title="Due diligence complete">
        <BulletList items={[...CPG_DILIGENCE]} />
      </ContentCard>

      <ContentCard title="What this proves for Abraxas">
        <BulletList items={[...CPG_WHAT_THIS_PROVES]} />
      </ContentCard>

      <ContentCard title="Survey & title (PDF)">
        <div style={{ display: "grid", gap: "0.45rem" }}>
          {CPG_SURVEY_FILES.map(file => (
            <Link key={file.href} href={file.href} target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", justifyContent: "space-between", gap: "0.5rem",
                padding: "0.6rem 0.75rem", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--surface)",
                textDecoration: "none", color: "inherit",
              }}>
              <span style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {file.label}
                {file.acres > 0 && file.lot > 0 ? ` · ${file.acres} ac` : file.acres === 270 ? ` · ${file.acres} ac parent` : ""}
              </span>
              <span style={{ color: ACCENT, fontSize: "0.76rem", fontWeight: 700 }}>PDF →</span>
            </Link>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Sourced facts">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Claim", "Value", "Level", "Source", "As of"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CPG_SOURCES.map(row => (
                <tr key={row.claim} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem", fontWeight: 600, color: "var(--text-primary)" }}>{row.claim}</td>
                  <td style={{ padding: "0.5rem", color: ACCENT, fontWeight: 700 }}>{row.value}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <span style={{
                      fontSize: "0.58rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: 999,
                      color: LEVEL_COLOR[row.level] ?? "#6B7280",
                      background: `${LEVEL_COLOR[row.level] ?? "#6B7280"}18`,
                    }}>
                      {row.level}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem", color: "var(--text-secondary)", maxWidth: 160 }}>{row.source}</td>
                  <td style={{ padding: "0.5rem", fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-muted)" }}>{row.asOf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentCard>

      <ContentCard title="Next steps">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {CPG_PROOF.map(proof => (
            <Link key={proof.label} href={proof.href}
              target={proof.href.startsWith("http") ? "_blank" : undefined}
              rel={proof.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem",
                padding: "0.75rem", borderRadius: 10, background: "var(--surface)",
                border: "1px solid var(--border)", textDecoration: "none", color: "inherit",
              }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{proof.label}</div>
                <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>{proof.desc}</div>
              </div>
              <span style={{ color: ACCENT, alignSelf: "center" }}>→</span>
            </Link>
          ))}
        </div>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href={CPG_PARTNER.website} newTab size="lg">Inquire · CPG Land Sales →</Btn>
        <Btn href={`/verify/${encodeURIComponent(CPG_ASSET.id)}`} variant="secondary" size="lg">Verify record</Btn>
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
