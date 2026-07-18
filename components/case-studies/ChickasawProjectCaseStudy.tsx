"use client";
// FILE: components/case-studies/ChickasawProjectCaseStudy.tsx
// CPG Land Sales · Chickasaw Project — closed-loop Abraxas land listing.

import Link from "next/link";
import { useEffect, useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, KeyValueTable, BulletList } from "@/components/redesign/RedesignContent";
import { CaseStudyVideoHero } from "@/components/case-studies/CaseStudyGallery";
import { AssetInquirePanel } from "@/components/case-studies/AssetInquirePanel";
import { PassportGate } from "@/components/passport/PassportGate";
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
  CPG_OIL_GAS,
  formatUsd,
} from "@/lib/cpgLandCaseStudy";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const RETURN_PATH = CPG_ASSET.caseStudyPath;

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

export function ChickasawProjectCaseStudy() {
  const [lots, setLots] = useState(CPG_LOTS);
  const [lotsAsOf, setLotsAsOf] = useState<string | null>(null);
  const [lotsSource, setLotsSource] = useState<"database" | "static_fallback">("static_fallback");

  useEffect(() => {
    fetch(`/api/v1/assets/${CPG_ASSET.id}/lots`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data?.lots?.length) return;
        setLots(
          data.lots.map((row: {
            lot: number;
            acres: number;
            priceUsd: number;
            status: typeof CPG_LOTS[number]["status"];
            notes?: string;
          }) => ({
            lot: row.lot,
            acres: row.acres,
            priceUsd: row.priceUsd,
            status: row.status,
            notes: row.notes,
          })),
        );
        setLotsAsOf(data.asOf ?? null);
        setLotsSource(data.source ?? "static_fallback");
      })
      .catch(() => {
        /* static fallback */
      });
  }, []);

  return (
    <RedesignPage maxWidth={920}>
      <PageHeader
        eyebrow="Active land listing · Verified partner"
        title={`${CPG_ASSET.name}`}
        subtitle="~270 acres across 11 surveyed tracts in the Chickasha corridor, Grady County OK — Abraxas spearheads acquisition; partner updates sync here. Drone footage, Phase I clean, contracts at asking."
      />

      <CaseStudyVideoHero
        src={CPG_ASSET.heroVideo}
        poster={CPG_ASSET.heroVideoPoster}
        alt={`Drone footage · ${CPG_ASSET.name} Oklahoma land`}
        badge={CPG_ASSET.designation}
        title={CPG_ASSET.name}
        subtitle={CPG_ASSET.subtitle}
      />

      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem",
      }}>
        <Btn href="#acquire" size="lg">Acquire on Abraxas →</Btn>
        <Btn href={CPG_ASSET.verifyPath} variant="secondary" size="sm">Verify record →</Btn>
        <Btn href={`/passport?return=${encodeURIComponent(RETURN_PATH)}`} variant="ghost" size="sm">Unlock diligence →</Btn>
      </div>

      <ContentCard title="At a glance">
        <KeyValueTable rows={[
          { k: "Registry ID", v: CPG_ASSET.id, mono: true },
          { k: "Partner", v: `${CPG_PARTNER.name} · ${CPG_PARTNER.contact}` },
          { k: "Location", v: CPG_ASSET.location },
          { k: "Size", v: `~${CPG_ASSET.parentAcres} acres · 11 surveyed lots` },
          {
            k: "Lot status",
            v: `${lots.filter(l => l.status === "available").length} available · ${lots.filter(l => l.status === "under_contract").length} under contract`,
          },
          { k: "Full project", v: formatUsd(CPG_PRICING.fullProject) },
          { k: "Lots 2–4 bundle", v: `${formatUsd(CPG_PRICING.lots234Bundle)} · 81.74 ac · no active wells` },
          { k: "Closing", v: CPG_PARTNER.titleCompany },
          { k: "Flow", v: "Acquire · verify · USDC settle on Abraxas" },
        ]} />
      </ContentCard>

      <div id="acquire" style={{ scrollMarginTop: 96 }}>
        <AssetInquirePanel
          assetId={CPG_ASSET.id}
          assetName={CPG_ASSET.name}
          partnerName={CPG_PARTNER.name}
        />
      </div>

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

      <ContentCard title={CPG_OIL_GAS.headline}>
        <p style={{ ...body, marginTop: 0 }}>{CPG_OIL_GAS.summary}</p>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {CPG_OIL_GAS.items.map(item => (
            <div key={item.title} style={{
              padding: "0.75rem 0.9rem", borderRadius: 10,
              border: "1px solid var(--border)", background: "var(--surface)",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.3rem" }}>
                {item.title}
              </div>
              <p style={{ ...body, margin: 0, fontSize: "0.78rem" }}>{item.body}</p>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Pricing & packages">
        <p style={{ ...body, marginTop: 0 }}>
          Headline pricing is public for transparency. Full lot schedule and package breakdowns release through Passport — captures serious buyers inside Abraxas.
        </p>
        <KeyValueTable rows={[
          { k: "Full project (11 lots · ~270 ac)", v: formatUsd(CPG_PRICING.fullProject) },
          { k: "Lots 2–4 contiguous bundle", v: `${formatUsd(CPG_PRICING.lots234Bundle)} · clean well status` },
          { k: "Remaining 9 lots", v: formatUsd(CPG_PRICING.remaining9Lots) },
        ]} />
        <div style={{ marginTop: "1rem" }}>
          <PassportGate
            returnPath={RETURN_PATH}
            title="Full pricing & lot schedule"
            description="Line-item lot prices, fast-approval thresholds, and bundle math — sign in once, access from any device."
          >
            <KeyValueTable rows={[
              { k: "Bulk acquisition (partner convenience)", v: formatUsd(CPG_PRICING.bulkFullProject) },
              { k: "Fast approval threshold (9 lots)", v: `≥ ${formatUsd(CPG_PRICING.remaining9LotsFastApproval)}` },
              { k: "Lots 2–4 list reference", v: formatUsd(CPG_PRICING.lots234List) },
              { k: "10 lots · ~235 ac (if Lot 1 available)", v: formatUsd(CPG_PRICING.tenLots235Acres) },
            ]} />
            <p style={{ ...body, margin: "1rem 0 0.5rem" }}>{CPG_ASSET.availableLotsNote}</p>
            {lotsAsOf && (
              <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", margin: "0 0 0.65rem" }}>
                Lot status as of {new Date(lotsAsOf).toLocaleString()} · {lotsSource === "database" ? "live registry" : "static seed"}
              </p>
            )}
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
                  {lots.map(row => (
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
          </PassportGate>
        </div>
      </ContentCard>

      <ContentCard title="Due diligence complete">
        <BulletList items={[...CPG_DILIGENCE]} />
      </ContentCard>

      <ContentCard title="What this proves for Abraxas">
        <BulletList items={[...CPG_WHAT_THIS_PROVES]} />
      </ContentCard>

      <ContentCard title="Survey & title (PDF)">
        <PassportGate
          returnPath={RETURN_PATH}
          title="Diligence pack · surveys & deed"
          description="11 lot plats, parent parcel, and warranty deed — released on Abraxas after Passport sign-in. No re-forwarding to every buyer."
        >
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
        </PassportGate>
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

      <ContentCard title="Next steps · closed loop">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {CPG_PROOF.map(proof => (
            <Link key={proof.label} href={proof.href}
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
        <Btn href="#acquire" size="lg">Acquire on Abraxas →</Btn>
        <Btn href={CPG_ASSET.verifyPath} variant="secondary" size="lg">Verify record</Btn>
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
