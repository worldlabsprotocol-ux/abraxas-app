"use client";
// FILE: components/assets/FlagshipAssetPage.tsx
// Cielo Sunrise genesis dossier — streamlined institutional UX.

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PageHeader, ContentCard, KeyValueTable, BulletList } from "@/components/redesign/RedesignContent";
import { Btn, StatTile } from "@/components/redesign/ui";
import { AssetVerificationScopePanel } from "@/components/redesign/AssetVerificationScopePanel";
import { CaseStudyGallery, CaseStudyPhotoHero } from "@/components/case-studies/CaseStudyGallery";
import { CieloFlagshipActions } from "@/components/cielo/CieloFlagshipActions";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { CIELO_GALLERY_IMAGES, CIELO_HERO_IMAGE } from "@/lib/data/cieloMedia";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const ACCENT = "var(--accent, #E8C547)";
const VERIFY = "#10B981";

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
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${n.toLocaleString()}`;
}

function HashRow({ label, value, link }: { label: string; value: string; link?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <code style={{ fontFamily: MONO, fontSize: "0.72rem", color: VERIFY, wordBreak: "break-all", flex: 1, lineHeight: 1.5 }}>{value}</code>
        <Btn size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? "Copied" : "Copy"}
        </Btn>
        {link && <Btn href={link} newTab size="sm" variant="secondary">Explorer</Btn>}
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
        subtitle={`${D.subtitle} · ${D.location.city}, ${D.location.state}. Live short term rental with USDC settlement on Sui after operator confirmation.`}
      />

      <CaseStudyPhotoHero
        src={CIELO_HERO_IMAGE.src}
        alt={CIELO_HERO_IMAGE.alt}
        objectPosition={CIELO_HERO_IMAGE.objectPosition}
        badge="Genesis asset · AAS-1 Verified"
        title="Cielo Sunrise"
        subtitle={`${D.location.city}, GA · ${formatUsd(F.estimatedValue)} appraised · ${D.guestProfile.totalReviews} Airbnb reviews`}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem" }}>
        {["AAS-1 Verified", "Collateral eligible", "Live on Airbnb", "USDC on Sui"].map(label => (
          <span key={label} style={{
            fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, padding: "0.25rem 0.55rem", borderRadius: 999,
            color: VERIFY, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.28)",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {label}
          </span>
        ))}
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.65rem", marginBottom: "1.5rem" }}
      >
        <StatTile value={formatUsd(F.estimatedValue)} label="Appraised value" sub="May 2025" />
        <StatTile value={formatUsd(F.annualNOI)} label="Annual NOI" sub="Owner managed" accent />
        <StatTile value={`${(F.cashYield * 100).toFixed(1)}%`} label="Cash yield" sub="On purchase price" accent />
        <StatTile value={`${D.guestProfile.totalReviews}`} label="Airbnb reviews" sub={`${D.guestProfile.avgRating.toFixed(1)} Superhost`} />
        <StatTile value={formatUsd(C.maxBorrow)} label="Max borrow" sub={`${C.ltv}% LTV USDC`} accent accentVariant="violet" />
        <StatTile value={`${C.collateralScore}/100`} label="Collateral score" sub="Institutional" accent />
      </motion.div>

      <nav aria-label="Dossier sections" style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.5rem" }}>
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`} style={{
            fontFamily: FONT, fontSize: "0.76rem", fontWeight: 600, padding: "0.4rem 0.85rem", borderRadius: 999,
            border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", textDecoration: "none",
          }}>
            {s.label}
          </a>
        ))}
      </nav>

      <ContentCard title="Book on Abraxas" id="book">
        <p style={body}>
          Abraxas bookings settle in <strong style={{ color: "var(--text-primary)" }}>USDC on Sui</strong> after operator confirmation.
          Apple Pay and card checkout convert at payment time. Select open dates on the Protocol Calendar or use the form.
        </p>
        <CieloFlagshipActions />
      </ContentCard>

      <ContentCard title="Property evidence" id="overview">
        <CaseStudyGallery images={CIELO_GALLERY_IMAGES} altPrefix="Cielo Sunrise" variant="grid" />
        <p style={{ ...body, marginTop: "0.85rem" }}>
          Cross check the{" "}
          <Link href={D.airbnbUrl} target="_blank" rel="noopener noreferrer" style={{ color: VERIFY }}>public Airbnb listing</Link>
          {" "}for additional photos and all {D.guestProfile.totalReviews} guest reviews.
        </p>
        <KeyValueTable rows={[
          { k: "Type", v: D.property.type },
          { k: "Location", v: D.location.address },
          { k: "Bedrooms / beds / baths", v: `${D.property.bedrooms} / ${D.property.beds} / ${D.property.bathrooms}` },
          { k: "Max guests", v: `${D.property.guestCapacity} (${D.property.totalSleepCapacity} total capacity)` },
          { k: "Signature", v: D.property.signatureFeature },
          { k: "Check in", v: D.property.checkInMethod },
          { k: "Entity", v: D.ownership.entityName },
          { k: "Title", v: D.ownership.titleStatus },
        ]} />
      </ContentCard>

      <ContentCard title="Sleeping arrangements">
        {D.property.rooms.map(r => (
          <div key={r.name} style={{ padding: "0.85rem 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{
                  fontFamily: MONO, fontSize: "0.52rem", fontWeight: 800, color: ACCENT,
                  padding: "0.15rem 0.4rem", borderRadius: 4, border: "1px solid var(--accent-border, rgba(232,197,71,0.35))",
                  letterSpacing: "0.08em",
                }}>
                  {r.tag}
                </span>
                <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{r.name}</span>
              </div>
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                {r.guests} guests · {r.beds}
              </span>
            </div>
            <p style={{ ...body, margin: 0 }}>{r.desc}</p>
          </div>
        ))}
      </ContentCard>

      <ContentCard title="Guest record">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "2.5rem", fontWeight: 800, color: VERIFY, lineHeight: 1 }}>
            {D.guestProfile.avgRating.toFixed(1)}
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {D.guestProfile.totalReviews} reviews on Airbnb
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--accent)", fontWeight: 600 }}>
              Superhost · Response {D.guestProfile.responseTime}
            </div>
            <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginTop: 4 }}>
              {D.guestProfile.reviewSource}
            </div>
          </div>
        </div>
        <p style={{ ...body, marginBottom: "0.75rem" }}>Featured quotes below. Full review history on the live listing.</p>
        {D.guestProfile.reviews.slice(0, 3).map((r, i) => (
          <div key={i} style={{ padding: "0.85rem", marginBottom: "0.5rem", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>{r.name}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>{r.when}</span>
            </div>
            <p style={{ ...body, margin: 0, fontStyle: "italic" }}>&ldquo;{r.highlight}&rdquo;</p>
          </div>
        ))}
        <Btn href={D.airbnbUrl} newTab variant="secondary" size="sm">Read all {D.guestProfile.totalReviews} reviews on Airbnb</Btn>
      </ContentCard>

      <ContentCard title="Financial performance" id="financials">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.65rem", marginBottom: "1.25rem" }}>
          <StatTile value={formatUsd(F.annualGrossRevenue)} label="Gross revenue TTM" accent />
          <StatTile value={formatUsd(F.annualNOI)} label="Net operating income" accent />
          <StatTile value={`${(F.capRate * 100).toFixed(2)}%`} label="Cap rate" />
          <StatTile value={`$${F.nightlyRateAvg}`} label="Avg nightly rate" />
          <StatTile value={`${C.debtServiceCoverage}x`} label="Debt service coverage" accent accentVariant="violet" />
        </div>
        <h3 style={subheading}>Monthly revenue · trailing 12 months</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.35rem", height: 120, padding: "0.5rem 0 1.5rem" }}>
          {F.monthlyRevenue.map((m, i) => {
            const h = Math.round((m.rev / maxRev) * 100);
            return (
              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: VERIFY }}>${(m.rev / 1000).toFixed(0)}k</div>
                <motion.div
                  initial={reduce ? false : { height: "0%" }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                  style={{ width: "100%", minHeight: 4, background: VERIFY, borderRadius: "3px 3px 0 0" }}
                />
                <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)", transform: "rotate(-45deg)", whiteSpace: "nowrap", marginTop: "0.35rem" }}>
                  {m.month.slice(0, 3)}
                </div>
              </div>
            );
          })}
        </div>
        <KeyValueTable rows={[
          { k: "Gross booking revenue", v: formatUsd(F.annualGrossRevenue) },
          { k: "Platform fees", v: "$0 owner managed" },
          { k: "Operating expenses", v: `-${formatUsd(F.operatingExpenses)}` },
          { k: "Net operating income", v: formatUsd(F.annualNOI) },
        ]} />
        <p style={{ ...body, margin: "0.75rem 0 0", fontSize: "0.78rem" }}>
          Full sourced metrics and conflict disclosures in the{" "}
          <Link href="/case-studies/cielo" style={{ color: VERIFY }}>institutional case study</Link>.
        </p>
      </ContentCard>

      <ContentCard title="Verification" id="verification">
        <AssetVerificationScopePanel id="verification-scope" />
        <div style={{ marginTop: "1.25rem", padding: "1rem", borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.22)" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: VERIFY, marginBottom: "0.35rem" }}>
            Verified · {V.standard} standard
          </div>
          <p style={{ ...body, margin: 0 }}>
            Certificate {V.certificateId} · Issued {new Date(V.issuedAt).toLocaleDateString()} · Valid until {new Date(V.validUntil).toLocaleDateString()}
          </p>
        </div>
        <HashRow label="Document SHA-256" value={V.documentHash} />
        <HashRow label="Metadata hash" value={V.metaHash} />
        <HashRow label="Anchored transaction" value={V.anchoredTx} link={`https://suiscan.xyz/devnet/object/${V.anchoredTx}`} />
        <div style={{ marginTop: "1rem" }}>
          <Btn href="/case-studies/cielo" variant="secondary" size="sm">Full diligence pack · timeline & sources</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Collateral profile" id="collateral">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.65rem", marginBottom: "1rem" }}>
          <StatTile value={formatUsd(C.appraisalValue)} label="Appraised value" />
          <StatTile value={`${C.ltv}%`} label="Max LTV" accent />
          <StatTile value={formatUsd(C.maxBorrow)} label="Max borrow USDC" accent />
          <StatTile value={`${C.collateralScore}/100`} label="Collateral health" accent accentVariant="violet" />
        </div>
        <KeyValueTable rows={[
          { k: "Liquidity score", v: `${C.liquidityScore}/100` },
          { k: "Fraud risk", v: `${C.fraudRisk}/100 (lower is better)` },
          { k: "Lender confidence", v: C.lenderConfidence },
          { k: "Token standard", v: D.tokenization.tokenStandard },
          { k: "Chain", v: D.tokenization.chain },
          { k: "Settlement", v: "USDC on Sui · LIVE" },
        ]} />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href={`/verify/${encodeURIComponent(D.id)}`} size="lg">Verify asset</Btn>
        <Btn href="/case-studies/cielo" variant="secondary" size="lg">Institutional case study</Btn>
        <Btn href={D.airbnbUrl} newTab variant="ghost" size="lg">Airbnb listing</Btn>
        <Link href="/#registry" style={{ fontFamily: FONT, fontSize: "0.82rem", color: VERIFY, alignSelf: "center", textDecoration: "none" }}>
          Back to registry
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
