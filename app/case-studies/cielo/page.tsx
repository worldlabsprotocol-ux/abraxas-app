"use client";
// FILE: app/case-studies/cielo/page.tsx
// VC-grade case study — dated sources, conflicts, on-chain proof.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, KeyValueTable, BulletList } from "@/components/redesign/RedesignContent";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import {
  CIELO_CONFLICTS,
  CIELO_SOURCES,
  CIELO_ONCHAIN_PROOF,
  CIELO_TIMELINE,
  CIELO_PHOTOS,
  CIELO_WHAT_THIS_PROVES,
} from "@/lib/cieloCaseStudy";
import { CaseStudyGallery, CaseStudyPhotoHero } from "@/components/case-studies/CaseStudyGallery";
import { Btn } from "@/components/redesign/ui";
import { CIELO_HERO_IMAGE } from "@/lib/data/cieloMedia";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const D = FLAGSHIP_PROPERTY;

const LEVEL_COLOR: Record<string, string> = {
  "L1 Reference": "#F59E0B",
  "L2 Review": "#3B82F6",
  "L3 Attested": "#10B981",
  "L4 Monitored": "#8B5CF6",
};

export default function CieloCaseStudyPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Case study · Genesis asset"
        title="Cielo Sunrise (ABX-RE-HOSP-001)"
        subtitle="Institutional diligence pack: dated sources, conflict disclosures, assurance levels, and on-chain proof links. Eat-your-own-dogfood — not a mockup."
      />

      <CaseStudyPhotoHero
        src={CIELO_HERO_IMAGE.src}
        alt={CIELO_HERO_IMAGE.alt}
        objectPosition={CIELO_HERO_IMAGE.objectPosition}
        badge="Genesis asset · AAS-1 Verified"
        title="Cielo Sunrise"
        subtitle="Mineral Bluff, GA · $1.1M appraised · Live STR + Abraxas booking"
      />

      <div style={{ marginBottom: "1.25rem" }}>
        <CaseStudyGallery images={CIELO_PHOTOS} altPrefix="Cielo Sunrise" variant="mosaic" />
        <p style={{ ...body, marginTop: "0.5rem", marginBottom: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Wellness dome, ridgeline decks, and hot tub — cross-check the{" "}
          <Link href={D.airbnbUrl} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontWeight: 600 }}>
            public Airbnb listing
          </Link>{" "}
          for more angles and guest reviews.
        </p>
      </div>

      <ContentCard title="Asset snapshot">
        <KeyValueTable rows={[
          { k: "Designation", v: D.designation },
          { k: "Certificate", v: D.verification.certificateId },
          { k: "Appraised value", v: `$${(D.financials.estimatedValue / 1_000_000).toFixed(1)}M` },
          { k: "Location", v: D.location.address },
          { k: "Registry ID", v: D.id, mono: true },
          { k: "Payment rail", v: "USDC on Sui (live booking)" },
        ]} />
      </ContentCard>

      <ContentCard title="What this proves">
        <BulletList items={[...CIELO_WHAT_THIS_PROVES]} />
        <p style={{ ...body, marginTop: "0.75rem", marginBottom: 0 }}>
          Read the full article:{" "}
          <Link href="/blog/cielo-sunrise-proof-model-works" style={{ color: ACCENT }}>Cielo Sunrise — proof the model works →</Link>
        </p>
      </ContentCard>

      <ContentCard title={CIELO_CONFLICTS.headline}>
        {CIELO_CONFLICTS.items.map(item => (
          <div key={item.topic} style={{ marginBottom: "1rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
              {item.topic}
            </div>
            <p style={body}>{item.disclosure}</p>
            <p style={{ ...body, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
              Implication: {item.implication}
            </p>
          </div>
        ))}
      </ContentCard>

      <ContentCard title="Sourced metrics (with dates & assurance levels)">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Claim", "Value", "Level", "Source", "As of", "Method", "Refresh"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CIELO_SOURCES.map(row => (
                <tr key={row.claim} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem", color: "var(--text-primary)", fontWeight: 600 }}>{row.claim}</td>
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
                  <td style={{ padding: "0.5rem", color: "var(--text-secondary)", maxWidth: 140 }}>{row.source}</td>
                  <td style={{ padding: "0.5rem", fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-muted)" }}>{row.asOf}</td>
                  <td style={{ padding: "0.5rem", color: "var(--text-secondary)", maxWidth: 160 }}>{row.method}</td>
                  <td style={{ padding: "0.5rem", fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>{row.expires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...body, marginTop: "0.75rem", marginBottom: 0 }}>
          Interactive methodology drawers also live on the asset page and in{" "}
          <Link href={`/verify/${encodeURIComponent(D.id)}`} style={{ color: ACCENT }}>/verify</Link>.
        </p>
      </ContentCard>

      <ContentCard title="On-chain & operational proof">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {CIELO_ONCHAIN_PROOF.map(proof => (
            <Link key={proof.label} href={proof.href}
              target={proof.href.startsWith("http") ? "_blank" : undefined}
              rel={proof.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem",
                padding: "0.75rem", borderRadius: 10, background: "var(--surface)",
                border: "1px solid var(--border)", textDecoration: "none", color: "inherit",
              }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {proof.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {proof.desc}
                </div>
                {"txDigest" in proof && proof.txDigest && (
                  <code style={{ fontFamily: MONO, fontSize: "0.58rem", color: ACCENT, display: "block", marginTop: 4, wordBreak: "break-all" }}>
                    {proof.txDigest.slice(0, 20)}… · {proof.asOf}
                  </code>
                )}
              </div>
              <span style={{ color: ACCENT, alignSelf: "center" }}>→</span>
            </Link>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Provenance timeline">
        <div style={{ display: "grid", gap: "0.35rem" }}>
          {CIELO_TIMELINE.map(event => (
            <div key={event.date + event.event} style={{
              display: "grid", gridTemplateColumns: "100px 1fr auto", gap: "0.65rem",
              padding: "0.45rem 0", borderBottom: "1px solid var(--border)", alignItems: "start",
            }}>
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>{event.date}</span>
              <span style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)" }}>{event.event}</span>
              <span style={{
                fontFamily: FONT, fontSize: "0.55rem", fontWeight: 700, color: ACCENT,
                padding: "0.1rem 0.35rem", borderRadius: 4, background: `${ACCENT}12`,
              }}>
                {event.status}
              </span>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Booking & payment flow">
        <ol style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.85, margin: 0, paddingLeft: "1.25rem" }}>
          <li>Guest selects dates on /apps/cielo-sunrise or /flagship calendar</li>
          <li>Booking stored in Supabase · Protocol Calendar blocks dates</li>
          <li>Operator confirms · payment instructions to asset settlement container on Sui</li>
          <li>Guest signs in with Google (zkLogin) · one-click USDC pay</li>
          <li>Tx verified · receipt at /cielo/receipt · digests in /transparency</li>
        </ol>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
          <Btn href="/apps/cielo-sunrise" size="sm">Cielo app →</Btn>
          <Btn href="/flagship" variant="secondary" size="sm">Full dossier</Btn>
          <Btn href={D.airbnbUrl} newTab variant="ghost" size="sm">Airbnb (independent)</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Evidence checklist">
        <BulletList items={[
          "Every metric in the sourced table has a date, level, and refresh window",
          "Conflict of interest disclosed — founding team owns the genesis asset",
          "Airbnb listing bookable without Abraxas",
          "Payment digests in /transparency when captured",
          "Public verifier returns L1–L4 assurance taxonomy",
          "E2E health check at /ops/cielo-e2e before investor demos",
        ]} />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/investors/strategy" size="lg">Strategic roadmap →</Btn>
        <Btn href="/verify/ABX-RE-HOSP-001" variant="secondary" size="lg">Verify asset</Btn>
        <Link href="/investors" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          Data room →
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
