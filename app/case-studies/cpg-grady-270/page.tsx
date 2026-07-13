"use client";
// FILE: app/case-studies/cpg-grady-270/page.tsx
// CPG Land Sales · Grady County 270 — active Oklahoma land partner case study.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, KeyValueTable, BulletList } from "@/components/redesign/RedesignContent";
import { CaseStudyPhotoHero, CaseStudyVideoHero } from "@/components/case-studies/CaseStudyGallery";
import {
  CPG_ASSET,
  CPG_PARTNER,
  CPG_CONFLICTS,
  CPG_SOURCES,
  CPG_PROOF,
  CPG_DILIGENCE,
  CPG_LOTS,
  CPG_PRICING,
  CPG_REGISTRY_VALUE,
  CPG_SURVEY_FILES,
  CPG_WHAT_THIS_PROVES,
  formatUsd,
  abraxasRegistryReference,
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
        eyebrow="Case study · Active land partner"
        title={`${CPG_ASSET.name} (${CPG_ASSET.id})`}
        subtitle="CPG Land Sales / Gabriel Corrales — ~270 acres, 11 surveyed lots, active on the Abraxas registry. Drone footage, surveys, and pricing below."
      />

      <CaseStudyVideoHero
        src={CPG_ASSET.heroVideo}
        poster={CPG_ASSET.heroVideoPoster}
        alt="Drone footage · Grady County 270 Oklahoma land"
        badge={CPG_ASSET.designation}
        title={CPG_ASSET.name}
        subtitle={CPG_ASSET.subtitle}
      />

      <ContentCard title="Asset snapshot">
        <KeyValueTable rows={[
          { k: "Registry ID", v: CPG_ASSET.id, mono: true },
          { k: "Partner", v: `${CPG_PARTNER.name} · ${CPG_PARTNER.contact}` },
          { k: "Location", v: CPG_ASSET.location },
          { k: "Parent parcel", v: `~${CPG_ASSET.parentAcres} acres · 11 surveyed lots` },
          { k: "Seller ask (aggregate)", v: formatUsd(CPG_PRICING.fullProjectSellerAsk) },
          { k: "Abraxas registry reference", v: formatUsd(CPG_REGISTRY_VALUE.fullProjectReference) },
          { k: "Assurance", v: "L2 review in progress · surveys + Phase I on file" },
          { k: "Title / closing", v: CPG_PARTNER.titleCompany },
        ]} />
      </ContentCard>

      <ContentCard title="What this proves">
        <BulletList items={[...CPG_WHAT_THIS_PROVES]} />
      </ContentCard>

      <ContentCard title="Pricing · seller ask vs Abraxas registry reference">
        <p style={body}>
          Seller ask figures come from CPG Land Sales (L1 partner reference). Abraxas registry reference
          applies a <strong>20% platform band</strong> (within the 10–40% policy range) for verification-scope
          economics — <em>not</em> the price at closing.
        </p>
        <KeyValueTable rows={[
          { k: "Full project (11 lots)", v: `${formatUsd(CPG_PRICING.fullProjectSellerAsk)} ask → ${formatUsd(CPG_REGISTRY_VALUE.fullProjectReference)} ref` },
          { k: "Bulk convenience (partner)", v: `${formatUsd(CPG_PRICING.bulkFullProjectSellerAsk)} ask → ${formatUsd(CPG_REGISTRY_VALUE.bulkReference)} ref` },
          { k: "Remaining 9 lots (2–4, 6–11)", v: `${formatUsd(CPG_PRICING.remaining9LotsSellerAsk)} ask → ${formatUsd(CPG_REGISTRY_VALUE.remaining9Reference)} ref` },
          { k: "Seller approval threshold (9 lots)", v: `≥ ${formatUsd(CPG_PRICING.remaining9LotsApprovalThreshold)} per partner` },
          { k: "Lots 2–4 bundle (81.74 ac)", v: `${formatUsd(CPG_PRICING.lots234BundleSellerAsk)} ask → ${formatUsd(CPG_REGISTRY_VALUE.lots234BundleReference)} ref` },
          { k: "10 lots / ~235 ac (if Lot 1 open)", v: `${formatUsd(CPG_PRICING.tenLot235AcresSellerAsk)} ask → ${formatUsd(abraxasRegistryReference(CPG_PRICING.tenLot235AcresSellerAsk))} ref` },
        ]} />
      </ContentCard>

      <ContentCard title="Lot schedule (partner-provided)">
        <p style={{ ...body, marginTop: 0 }}>{CPG_ASSET.availableLotsNote}</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Lot", "Acres", "Seller ask", "Abraxas ref (+20%)", "Status", "Notes"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CPG_LOTS.map(row => (
                <tr key={row.lot} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem", fontWeight: 700 }}>{row.lot}</td>
                  <td style={{ padding: "0.5rem" }}>{row.acres}</td>
                  <td style={{ padding: "0.5rem" }}>{row.sellerAskUsd > 0 ? formatUsd(row.sellerAskUsd) : "Per schedule"}</td>
                  <td style={{ padding: "0.5rem", color: ACCENT, fontWeight: 600 }}>
                    {row.sellerAskUsd > 0 ? formatUsd(abraxasRegistryReference(row.sellerAskUsd)) : "—"}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{STATUS_LABEL[row.status] ?? row.status}</td>
                  <td style={{ padding: "0.5rem", color: "var(--text-muted)", maxWidth: 200 }}>{row.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentCard>

      <ContentCard title="Due diligence completed (partner attestation)">
        <BulletList items={[...CPG_DILIGENCE]} />
      </ContentCard>

      <ContentCard title={CPG_CONFLICTS.headline}>
        {CPG_CONFLICTS.items.map(item => (
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

      <ContentCard title="Survey & title evidence (PDF)">
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
        <p style={{ ...body, marginTop: "0.75rem", marginBottom: 0, fontSize: "0.74rem" }}>
          Drone walkthrough plays above (owner-captured). Additional clips can be appended as partner supplies assets.
        </p>
      </ContentCard>

      <ContentCard title="Sourced metrics">
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

      <ContentCard title="Proof links">
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
        <Btn href={`/verify/${encodeURIComponent(CPG_ASSET.id)}`} size="lg">Public verify record →</Btn>
        <Btn href={CPG_PARTNER.website} newTab variant="secondary" size="lg">CPG Land Sales →</Btn>
        <Btn href="/portal/apply" variant="ghost" size="sm">Owner portal →</Btn>
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
