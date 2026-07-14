// FILE: components/assets/FlagshipAssetPage.tsx
// Cielo Sunrise — institutional asset dossier (matches Abraxas shell).
"use client";

import { useState } from "react";
import Link from "next/link";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { CIELO_GALLERY_IMAGES, CIELO_HERO_IMAGE } from "@/lib/data/cieloMedia";
import { CieloFlagshipBookSection } from "@/components/cielo/CieloFlagshipBookSection";
import { CieloGuestReviews } from "@/components/cielo/CieloGuestReviews";
import { AssetVerificationScopePanel } from "@/components/redesign/AssetVerificationScopePanel";
import { CaseStudyGallery, CaseStudyPhotoHero } from "@/components/case-studies/CaseStudyGallery";
import { ContentCard, KeyValueTable } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const D = FLAGSHIP_PROPERTY;
const F = D.financials;
const V = D.verification;
const C = D.collateral;

type Tab = "overview" | "financials" | "verification" | "collateral";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "verification", label: "Verification" },
  { id: "collateral", label: "Collateral" },
];

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="abx-glass-panel" style={{ padding: "0.85rem 0.95rem", borderRadius: 14 }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        color: "var(--text-muted)", textTransform: "uppercase",
        letterSpacing: "0.08em", marginBottom: "0.35rem",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: "clamp(1.05rem, 2.5vw, 1.35rem)",
        fontWeight: 800, color: accent ?? "var(--text-primary)", lineHeight: 1.1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function FlagshipAssetPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const maxRev = Math.max(...F.monthlyRevenue.map(m => m.rev));

  return (
    <div style={{ color: "var(--text-primary)", paddingBottom: "4rem" }}>
      {/* Hero imagery */}
      <div style={{
        maxWidth: 1180, margin: "0 auto",
        padding: "0 clamp(1rem, 3vw, 2rem) 1.25rem",
      }}>
        <CaseStudyPhotoHero
          src={CIELO_HERO_IMAGE.src}
          alt={CIELO_HERO_IMAGE.alt}
          objectPosition={CIELO_HERO_IMAGE.objectPosition}
          badge="Genesis asset · AAS-1 Verified"
          title={D.title}
          subtitle={`${D.location.city}, ${D.location.state} · $${(F.estimatedValue / 1_000_000).toFixed(1)}M appraised · Live STR`}
        />
        <CaseStudyGallery images={CIELO_GALLERY_IMAGES.slice(1)} altPrefix="Cielo Sunrise" variant="grid" />
      </div>

      {/* Header + key stats */}
      <div style={{
        maxWidth: 1180, margin: "0 auto",
        padding: "0 clamp(1rem, 3vw, 2rem) 1.5rem",
        borderBottom: "1px solid var(--border-strong)",
      }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          {D.designation}
        </div>
        <p style={{
          fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 640, margin: "0 0 1.25rem",
        }}>
          {D.tagline}. Real Superhost listing · book on Abraxas (USDC on Sui) or Airbnb.
        </p>

        <div style={{
          display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem",
        }}>
          {["AAS-1 Verified", "Collateral eligible", "Live on Airbnb", "USDC on Sui"].map(label => (
            <span key={label} style={{
              padding: "0.3rem 0.65rem", borderRadius: 999,
              fontFamily: MONO, fontSize: "0.58rem", fontWeight: 800,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "var(--accent)", border: "1px solid var(--accent-border)",
              background: "var(--accent-faint)",
            }}>
              {label}
            </span>
          ))}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.65rem",
          marginBottom: "1.25rem",
        }}>
          <StatTile label="Appraised" value="$1.1M" sub="May 2025" />
          <StatTile label="Annual NOI" value="$109,500" sub="Owner-managed" accent="var(--accent-verify)" />
          <StatTile label="Two nights" value={`$${F.twoNightsAllIn.toLocaleString()}`} sub="All fees included" accent="var(--accent)" />
          <StatTile label="Guest rating" value={`${D.guestProfile.avgRating} ★`} sub={`${D.guestProfile.totalReviews} reviews · Superhost`} />
          <StatTile label="Collateral score" value={`${C.collateralScore}/100`} sub="Institutional grade" />
          <StatTile label="Max borrow" value="$660K USDC" sub="60% LTV" />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "0.5rem" }}>
          <Btn href={D.airbnbUrl} newTab size="sm">Airbnb listing →</Btn>
          <Btn href="/case-studies/cielo" variant="secondary" size="sm">Case study →</Btn>
          <Btn href={`/verify/${encodeURIComponent(D.id)}`} variant="ghost" size="sm">Verify record →</Btn>
          <Link href={D.instagramUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-2)", alignSelf: "center", textDecoration: "none" }}>
            @cielosunrise ↗
          </Link>
        </div>
      </div>

      {/* Booking */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(1rem, 3vw, 2rem)" }}>
        <CieloFlagshipBookSection />
      </div>

      {/* Tabs */}
      <div style={{
        maxWidth: 1180, margin: "2rem auto 0",
        padding: "0 clamp(1rem, 3vw, 2rem)",
      }}>
        <div style={{
          display: "flex", gap: "0.25rem", flexWrap: "wrap",
          marginBottom: "1.25rem", borderBottom: "1px solid var(--border)",
          paddingBottom: "0.35rem",
        }} role="tablist" aria-label="Asset sections">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "0.45rem 0.85rem", borderRadius: 8, border: "none",
                background: "transparent", cursor: "pointer",
                fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
                color: tab === t.id ? "var(--accent-verify)" : "var(--text-muted)",
                borderBottom: tab === t.id ? "2px solid var(--accent-verify)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <ContentCard title="Property snapshot">
              <KeyValueTable rows={[
                { k: "Type", v: "Entire cabin · private wellness retreat" },
                { k: "Location", v: D.location.address },
                { k: "Capacity", v: `${D.property.guestCapacity} guests (${D.property.totalSleepCapacity} max)` },
                { k: "Layout", v: `${D.property.bedrooms} bed · ${D.property.beds} beds · ${D.property.bathrooms} baths` },
                { k: "Check-in", v: `${D.property.checkIn} · ${D.property.checkInMethod}` },
                { k: "Check-out", v: D.property.checkOut },
                { k: "WiFi", v: "1 Gig fiber" },
                { k: "Parking", v: "6+ vehicles · EV Level 2" },
              ]} />
            </ContentCard>

            <ContentCard title="Signature experience">
              <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.85rem" }}>
                {D.property.signatureFeature}. The mirrored geodesic wellness dome sits on its own elevated deck with lay-down infrared sauna, red light therapy, and tri-state ridgeline views.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {D.property.amenities.wellness.map(a => (
                  <span key={a} style={{
                    padding: "0.35rem 0.65rem", borderRadius: 999,
                    fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)", background: "var(--surface)",
                  }}>
                    {a}
                  </span>
                ))}
              </div>
            </ContentCard>

            <ContentCard title="Sleeping arrangements">
              {D.property.rooms.map(r => (
                <div key={r.name} style={{
                  padding: "0.75rem 0", borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700 }}>{r.name}</span>
                    <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {r.guests} guests · {r.beds}
                    </span>
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0.35rem 0 0" }}>
                    {r.desc}
                  </p>
                </div>
              ))}
            </ContentCard>

            <ContentCard title="Guest reviews">
              <CieloGuestReviews />
            </ContentCard>

            <ContentCard title="Ownership">
              <KeyValueTable rows={[
                { k: "Entity", v: D.ownership.entityName },
                { k: "Title", v: D.ownership.titleStatus },
                { k: "Insurance", v: D.ownership.insurance },
                { k: "Hosts", v: `${D.ownership.host} + ${D.ownership.coHost}` },
                { k: "Management", v: D.ownership.propertyMgmt },
              ]} />
            </ContentCard>
          </div>
        )}

        {tab === "financials" && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "0.65rem",
            }}>
              <StatTile label="Gross revenue (TTM)" value="$138,000" accent="var(--accent-verify)" />
              <StatTile label="Net operating income" value="$109,500" accent="var(--accent-verify)" />
              <StatTile label="Cap rate" value="9.95%" />
              <StatTile label="Cash yield" value="14.6%" accent="var(--accent-verify)" />
              <StatTile label="Avg nightly" value={`$${F.nightlyRateAvg}`} />
              <StatTile label="Occupancy" value="75%" />
            </div>

            <ContentCard title="Monthly revenue · trailing 12 months">
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.35rem", height: 140, paddingTop: "0.5rem" }}>
                {F.monthlyRevenue.map(m => {
                  const h = Math.round((m.rev / maxRev) * 100);
                  return (
                    <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                      <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--accent-verify)" }}>
                        ${(m.rev / 1000).toFixed(0)}k
                      </div>
                      <div style={{
                        width: "100%", height: `${Math.max(h, 4)}%`, minHeight: 4,
                        background: "var(--accent-verify)", borderRadius: "4px 4px 0 0",
                      }} />
                      <div style={{ fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)" }}>
                        {m.month.slice(0, 3)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ContentCard>

            <ContentCard title="Income summary">
              <KeyValueTable rows={[
                { k: "Gross booking revenue", v: "$138,000" },
                { k: "Platform fees", v: "$0 (owner-managed)" },
                { k: "Operating expenses", v: "($28,500)" },
                { k: "Net operating income", v: "$109,500" },
              ]} />
            </ContentCard>
          </div>
        )}

        {tab === "verification" && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <AssetVerificationScopePanel id="verification-scope" />
            <ContentCard title="AAS-1 certificate">
              <KeyValueTable rows={[
                { k: "Status", v: "Verified · AAS-1" },
                { k: "Certificate", v: V.certificateId, mono: true },
                { k: "Issued", v: new Date(V.issuedAt).toLocaleDateString() },
                { k: "Valid until", v: new Date(V.validUntil).toLocaleDateString() },
                { k: "Issuer", v: V.verifier },
                { k: "Document hash", v: V.documentHash, mono: true },
                { k: "On-chain anchor", v: V.anchoredTx, mono: true },
              ]} />
              <div style={{ marginTop: "0.85rem" }}>
                <Btn href={`https://suiscan.xyz/devnet/object/${V.anchoredTx}`} newTab variant="secondary" size="sm">
                  View on explorer →
                </Btn>
              </div>
            </ContentCard>
            <ContentCard title="Provenance timeline">
              {V.provenanceTimeline.map(ev => (
                <div key={ev.date + ev.event} style={{
                  display: "grid", gridTemplateColumns: "100px 1fr", gap: "0.75rem",
                  padding: "0.65rem 0", borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-muted)" }}>{ev.date}</span>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700 }}>{ev.event}</div>
                    <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)" }}>{ev.actor}</div>
                  </div>
                </div>
              ))}
            </ContentCard>
          </div>
        )}

        {tab === "collateral" && (
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "0.65rem",
            }}>
              <StatTile label="Appraised value" value="$1,100,000" />
              <StatTile label="Max LTV" value="60%" accent="var(--accent-verify)" />
              <StatTile label="Max borrow" value="$660K USDC" accent="var(--accent-verify)" />
              <StatTile label="Liquidity score" value="75/100" />
              <StatTile label="Fraud risk" value="2/100" accent="var(--accent-verify)" />
              <StatTile label="DSCR" value="2.4x" />
            </div>

            <ContentCard title="Collateral health">
              <KeyValueTable rows={[
                { k: "Collateral score", v: `${C.collateralScore}/100` },
                { k: "Lender confidence", v: C.lenderConfidence },
                { k: "Volatility", v: C.volatilityProfile },
                { k: "Insurance coverage", v: `$${C.insuranceCoverage.toLocaleString()}` },
                { k: "Token status", v: D.tokenization.status },
                { k: "Settlement rail", v: "USDC on Sui · live" },
              ]} />
            </ContentCard>

            <ContentCard title="Risk factors">
              <BulletList items={[
                "Digital title custody + STR escrow attested",
                "Clear GA title · LLC ownership verified",
                "Trailing twelve-month revenue on file",
                "Independent appraisal under six months",
                "Hospitality sector liquidity discount applied",
              ]} />
            </ContentCard>
          </div>
        )}
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
      {items.map(item => (
        <li key={item} style={{
          fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.7,
          marginBottom: "0.35rem", color: "var(--text-secondary)",
        }}>
          {item}
        </li>
      ))}
    </ul>
  );
}
