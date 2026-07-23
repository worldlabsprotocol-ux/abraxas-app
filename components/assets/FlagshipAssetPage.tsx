"use client";
// FILE: components/assets/FlagshipAssetPage.tsx
// Cielo Sunrise genesis asset dossier — institutional redesign UX.

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PageHeader, ContentCard, KeyValueTable, BulletList } from "@/components/redesign/RedesignContent";
import { Btn, StatTile } from "@/components/redesign/ui";
import { AssetVerificationScopePanel } from "@/components/redesign/AssetVerificationScopePanel";
import { CaseStudyGallery, CaseStudyPhotoHero } from "@/components/case-studies/CaseStudyGallery";
import { CieloFlagshipActions } from "@/components/cielo/CieloFlagshipActions";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { CIELO_PHOTOS } from "@/lib/cieloCaseStudy";
import { CIELO_HERO_IMAGE } from "@/lib/data/cieloMedia";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const D = FLAGSHIP_PROPERTY;
const F = D.financials;
const V = D.verification;
const C = D.collateral;

const SECTIONS = [
  { id: "book", label: "Book" },
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "verification", label: "Verification" },
  { id: "collateral", label: "Collateral" },
] as const;

function formatUsd(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${n.toLocaleString()}`;
}

function HashRow({ label, value, link }: { label: string; value: string; link?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
      <motion.div
        style={{
          fontFamily: MONO,
          fontSize: "0.58rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "0.35rem",
        }}
      >
        {label}
      </motion.div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <code style={{
          fontFamily: MONO,
          fontSize: "0.72rem",
          color: ACCENT,
          wordBreak: "break-all",
          flex: 1,
          lineHeight: 1.5,
        }}>
          {value}
        </code>
        <Btn
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Btn>
        {link && (
          <Btn href={link} newTab size="sm" variant="secondary">
            Explorer →
          </Btn>
        )}
      </div>
    </div>
  );
}

export function FlagshipAssetPage() {
  const reduce = useReducedMotion();
  const maxRev = Math.max(...F.monthlyRevenue.map(m => m.rev));

  return (
    <>
      <PageHeader
        eyebrow={`${D.designation} · ${D.id}`}
        title={D.title}
        subtitle={`${D.subtitle} · ${D.location.city}, ${D.location.state}. Live short-term rental with USDC booking on Sui — not a mock asset.`}
      />

      <CaseStudyPhotoHero
        src={CIELO_HERO_IMAGE.src}
        alt={CIELO_HERO_IMAGE.alt}
        objectPosition={CIELO_HERO_IMAGE.objectPosition}
        badge="Genesis asset · AAS-1 Verified"
        title="Cielo Sunrise"
        subtitle={`${D.location.city}, GA · ${formatUsd(F.estimatedValue)} appraised · Live STR + Abraxas booking`}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem" }}>
        {["AAS-1 Verified", "Collateral eligible", "Live on Airbnb", "USDC on Sui"].map(label => (
          <span
            key={label}
            style={{
              fontFamily: MONO,
              fontSize: "0.58rem",
              fontWeight: 700,
              padding: "0.25rem 0.55rem",
              borderRadius: 999,
              color: ACCENT,
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.28)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        ))}
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.65rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatTile value={formatUsd(F.estimatedValue)} label="Appraised value" sub="May 2025" />
        <StatTile value={formatUsd(F.annualNOI)} label="Annual NOI" sub="Owner-managed" accent />
        <StatTile value={`${(F.cashYield * 100).toFixed(1)}%`} label="Cash yield" sub="On purchase price" accent />
        <StatTile value={`${(F.occupancyRate * 100).toFixed(0)}%`} label="Avg occupancy" sub="Annual average" />
        <StatTile value={formatUsd(C.maxBorrow)} label="Max borrow" sub={`${C.ltv}% LTV`} accent accentVariant="violet" />
        <StatTile value={`${C.collateralScore}/100`} label="Collateral score" sub="Institutional" accent />
      </motion.div>

      <nav aria-label="Dossier sections" style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.4rem",
        marginBottom: "1.5rem",
      }}>
        {SECTIONS.map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            style={{
              fontFamily: FONT,
              fontSize: "0.76rem",
              fontWeight: 600,
              padding: "0.4rem 0.85rem",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            {s.label}
          </a>
        ))}
      </nav>

      <ContentCard title="Book Cielo Sunrise" id="book">
        <p style={body}>
          Protocol Calendar + reservation flow below. Select open dates on the calendar, request a verified rate with Passport, or pay in USDC after operator confirmation.
        </p>
        <CieloFlagshipActions />
      </ContentCard>

      <ContentCard title="Property evidence" id="overview">
        <CaseStudyGallery images={CIELO_PHOTOS} altPrefix="Cielo Sunrise" />
        <div style={{ marginTop: "1rem" }}>
          <KeyValueTable rows={[
            { k: "Type", v: D.property.type },
            { k: "Location", v: D.location.address },
            { k: "Bedrooms", v: String(D.property.bedrooms) },
            { k: "Beds", v: String(D.property.beds) },
            { k: "Bathrooms", v: String(D.property.bathrooms) },
            { k: "Max guests", v: `${D.property.guestCapacity} (${D.property.totalSleepCapacity} total capacity)` },
            { k: "Check-in", v: D.property.checkInMethod },
            { k: "EV charging", v: D.property.evCharger },
            { k: "WiFi", v: "1 Gig fiber" },
            { k: "Parking", v: "6+ vehicles, free" },
          ]} />
        </div>
      </ContentCard>

      <ContentCard title="Signature experience">
        <p style={body}>{D.property.signatureFeature}</p>
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{
            fontFamily: FONT,
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "0.5rem",
          }}>
            Wellness circuit
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            {D.property.amenities.wellness.map(a => (
              <span key={a} style={tagStyle}>{a}</span>
            ))}
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Sleeping arrangements">
        {D.property.rooms.map(r => (
          <div key={r.name} style={{ padding: "0.85rem 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginBottom: "0.25rem",
            }}>
              <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {r.name}
              </span>
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                {r.guests} guests · {r.beds}
              </span>
            </div>
            <p style={{ ...body, margin: 0 }}>{r.desc}</p>
          </div>
        ))}
      </ContentCard>

      <ContentCard title="Guest intelligence">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: "2.5rem",
            fontWeight: 800,
            color: ACCENT,
            lineHeight: 1,
          }}>
            {D.guestProfile.avgRating.toFixed(1)}
          </div>
          <div>
            <motion.div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {D.guestProfile.totalReviews} reviews
            </motion.div>
            <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--accent)", fontWeight: 600 }}>
              Superhost · Response {D.guestProfile.responseTime}
            </div>
          </div>
        </div>
        {D.guestProfile.reviews.map((r, i) => (
          <div key={i} style={{
            padding: "0.85rem",
            marginBottom: "0.5rem",
            borderRadius: 12,
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {r.name}
              </span>
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                {r.when} · ★★★★★
              </span>
            </div>
            <p style={{ ...body, margin: 0, fontStyle: "italic" }}>&ldquo;{r.highlight}&rdquo;</p>
          </div>
        ))}
      </ContentCard>

      <ContentCard title="Ownership structure">
        <KeyValueTable rows={[
          { k: "Entity", v: D.ownership.entityName },
          { k: "Type", v: D.ownership.entityType },
          { k: "State", v: D.ownership.state },
          { k: "Host", v: `${D.ownership.host} + ${D.ownership.coHost}` },
          { k: "Title status", v: D.ownership.titleStatus },
          { k: "Insurance", v: D.ownership.insurance },
          { k: "Management", v: D.ownership.propertyMgmt },
        ]} />
      </ContentCard>

      <ContentCard title="Financial performance" id="financials">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.65rem",
          marginBottom: "1.25rem",
        }}>
          <StatTile value={formatUsd(F.annualGrossRevenue)} label="Gross revenue (TTM)" accent />
          <StatTile value={formatUsd(F.annualNOI)} label="Net operating income" accent />
          <StatTile value={`${(F.capRate * 100).toFixed(2)}%`} label="Cap rate" />
          <StatTile value={`$${F.nightlyRateAvg}`} label="Avg nightly rate" />
          <StatTile value={`$${F.nightlyRatePeak}`} label="Peak season rate" />
          <StatTile value={`${C.debtServiceCoverage}x`} label="Debt service coverage" accent accentVariant="violet" />
        </div>

        <h3 style={subheading}>Monthly revenue — trailing 12 months</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.35rem", height: 120, padding: "0.5rem 0 1.5rem" }}>
          {F.monthlyRevenue.map((m, i) => {
            const h = Math.round((m.rev / maxRev) * 100);
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                <motion.div style={{ fontFamily: MONO, fontSize: "0.55rem", color: ACCENT }}>
                  ${(m.rev / 1000).toFixed(0)}k
                </motion.div>
                <motion.div
                  initial={reduce ? false : { height: "0%" }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                  style={{ width: "100%", minHeight: 4, background: ACCENT, borderRadius: "3px 3px 0 0" }}
                />
                <div style={{
                  fontFamily: MONO,
                  fontSize: "0.5rem",
                  color: "var(--text-muted)",
                  transform: "rotate(-45deg)",
                  whiteSpace: "nowrap",
                  marginTop: "0.35rem",
                }}>
                  {m.month.slice(0, 3)}
                </div>
              </div>
            );
          })}
        </div>

        <KeyValueTable rows={[
          { k: "Gross booking revenue", v: formatUsd(F.annualGrossRevenue) },
          { k: "Platform fees", v: "$0 (owner-managed)" },
          { k: "Operating expenses", v: `-${formatUsd(F.operatingExpenses)}` },
          { k: "Net operating income", v: formatUsd(F.annualNOI) },
        ]} />
      </ContentCard>

      <ContentCard title="Verification" id="verification">
        <AssetVerificationScopePanel id="verification-scope" />

        <div style={{
          marginTop: "1.25rem",
          padding: "1rem",
          borderRadius: 12,
          background: "rgba(16,185,129,0.06)",
          border: "1px solid rgba(16,185,129,0.22)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ color: ACCENT, fontSize: "1rem" }}>✓</span>
            <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: ACCENT }}>
              Verified — {V.standard} standard
            </span>
          </div>
          <p style={{ ...body, margin: 0 }}>
            Certificate {V.certificateId} · Issued {new Date(V.issuedAt).toLocaleDateString()} · Valid until {new Date(V.validUntil).toLocaleDateString()} · {V.verifier}
          </p>
        </div>

        <HashRow label="Document SHA-256" value={V.documentHash} />
        <HashRow label="Metadata hash" value={V.metaHash} />
        <HashRow
          label="Anchored transaction"
          value={V.anchoredTx}
          link={`https://suiscan.xyz/devnet/object/${V.anchoredTx}`}
        />

        <h3 style={{ ...subheading, marginTop: "1.25rem" }}>Provenance timeline</h3>
        <div style={{ display: "grid", gap: "0.35rem" }}>
          {V.provenanceTimeline.map(ev => (
            <div key={ev.date + ev.event} style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr auto",
              gap: "0.65rem",
              padding: "0.45rem 0",
              borderBottom: "1px solid var(--border)",
              alignItems: "start",
            }}>
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>{ev.date}</span>
              <span style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)" }}>{ev.event}</span>
              <span style={{
                fontFamily: MONO,
                fontSize: "0.55rem",
                fontWeight: 700,
                color: ACCENT,
                padding: "0.1rem 0.35rem",
                borderRadius: 4,
                background: "rgba(16,185,129,0.1)",
              }}>
                {ev.status}
              </span>
            </div>
          ))}
        </div>

        <h3 style={{ ...subheading, marginTop: "1.25rem" }}>Custody ledger</h3>
        <KeyValueTable rows={[
          { k: "Custodian", v: V.custodyLedger.custodian },
          { k: "Vault type", v: V.custodyLedger.vaultType },
          { k: "Jurisdiction", v: V.custodyLedger.jurisdiction },
          { k: "Audit cadence", v: V.custodyLedger.auditCadence },
        ]} />
        <div style={{ marginTop: "0.75rem" }}>
          {V.custodyLedger.signatories.map(s => (
            <div key={s.id} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.4rem",
              padding: "0.5rem 0.75rem",
              borderRadius: 10,
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                flexShrink: 0,
                background: s.status === "ACTIVE" ? ACCENT : "#F59E0B",
              }} />
              <span style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", flex: 1 }}>
                {s.role}
              </span>
              <code style={{ fontFamily: MONO, fontSize: "0.62rem", color: ACCENT }}>{s.hash}</code>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Collateral profile" id="collateral">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.65rem",
          marginBottom: "1rem",
        }}>
          <StatTile value={formatUsd(C.appraisalValue)} label="Appraised value" />
          <StatTile value={`${C.ltv}%`} label="Max LTV" accent />
          <StatTile value={formatUsd(C.maxBorrow)} label="Max borrow" sub="USDC" accent />
          <StatTile value={`${C.liquidityScore}/100`} label="Liquidity score" />
          <StatTile value={`${C.fraudRisk}/100`} label="Fraud risk" sub="Lower is better" />
          <StatTile value={C.lenderConfidence} label="Lender confidence" accent accentVariant="violet" />
        </div>

        <h3 style={subheading}>Risk score breakdown</h3>
        {[
          { label: "Custody — digital title escrow", pts: 15, ok: true },
          { label: "Legal — LLC + clear title (GA)", pts: 20, ok: true },
          { label: "Revenue telemetry — TTM verified", pts: 10, ok: true },
          { label: "Provenance — anchored on-chain", pts: 25, ok: true },
          { label: "Appraisal — under 6 months", pts: 10, ok: true },
          { label: "Secondary market liquidity", pts: -5, ok: false },
          { label: "Hospitality sector risk", pts: -8, ok: false },
        ].map((r, i) => (
          <motion.div key={i} style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 50px",
            gap: "0.5rem",
            alignItems: "center",
            padding: "0.5rem 0",
            borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>{r.label}</span>
            <span style={{
              fontFamily: MONO,
              fontSize: "0.55rem",
              fontWeight: 700,
              color: r.ok ? ACCENT : "#EF4444",
              textTransform: "uppercase",
            }}>
              {r.ok ? "Verified" : "Risk"}
            </span>
            <span style={{
              fontFamily: MONO,
              fontSize: "0.82rem",
              fontWeight: 800,
              color: r.pts > 0 ? ACCENT : "#EF4444",
              textAlign: "right",
            }}>
              {r.pts > 0 ? `+${r.pts}` : r.pts}
            </span>
          </motion.div>
        ))}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "0.75rem 0",
          borderTop: "1px solid var(--border)",
          marginTop: "0.25rem",
        }}>
          <span style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
            Total collateral health
          </span>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.1rem", fontWeight: 800, color: ACCENT }}>
            {C.collateralScore}/100
          </span>
        </div>
      </ContentCard>

      <ContentCard title="Tokenization">
        <KeyValueTable rows={[
          { k: "Token standard", v: D.tokenization.tokenStandard },
          { k: "Chain", v: D.tokenization.chain },
          { k: "Mint cost", v: `${D.tokenization.mintCostAbra} ABRA` },
          { k: "Supply", v: String(D.tokenization.totalSupply) },
          { k: "Status", v: D.tokenization.status },
          { k: "Stablecoin", v: "USDC on Sui · LIVE" },
        ]} />
        <BulletList items={[
          "Fractionalization not enabled — single genesis asset passport",
          "Metadata anchored with on-chain verification certificate",
          "Booking rail live — see calendar above",
        ]} />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href={`/verify/${encodeURIComponent(D.id)}`} size="lg">Verify asset →</Btn>
        <Btn href="/case-studies/cielo" variant="secondary" size="lg">Institutional case study</Btn>
        <Link href="/#registry" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          ← Back to registry
        </Link>
      </div>
    </>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: "0 0 0.75rem",
};

const subheading: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.88rem",
  fontWeight: 700,
  color: "var(--text-primary)",
  margin: "0 0 0.75rem",
};

const tagStyle: React.CSSProperties = {
  padding: "0.25rem 0.55rem",
  borderRadius: 999,
  background: "rgba(16,185,129,0.08)",
  border: "1px solid rgba(16,185,129,0.2)",
  fontFamily: FONT,
  fontSize: "0.72rem",
  color: "var(--text-secondary)",
};
