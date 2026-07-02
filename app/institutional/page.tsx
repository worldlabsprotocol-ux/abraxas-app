"use client";
// FILE: app/institutional/page.tsx
// Institutional credibility: compliance, security, audit trail, partners.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const PILLARS = [
  {
    title: "Trust registry, not KYC vendor",
    body: "Abraxas orchestrates proof. Veriff and licensed partners perform identity. Protocols query Abraxas via AIL. users keep document custody with providers.",
  },
  {
    title: "Sui-native verification",
    body: "zkLogin wallets, W3C Verifiable Credentials, on-chain Passport stamps, and sponsored transactions for verified tiers.",
  },
  {
    title: "Live asset proof",
    body: "Cielo Sunrise (AAS-1) is a verified hospitality asset with live Airbnb revenue, mirrored availability on Abraxas, and USDC checkout on Sui.",
  },
];

const AUDIT_TRAIL = [
  { area: "Identity", provider: "Veriff", standard: "eIDAS · ISO 27001", status: "Live" },
  { area: "Credentials", provider: "Abraxas issuer", standard: "W3C VC v2 · Ed25519", status: "Live" },
  { area: "On-chain", provider: "Sui Move Passport", standard: "Stamp bitmask · devnet", status: "Live" },
  { area: "Custody", provider: "Utila", standard: "MPC custody", status: "Partner" },
  { area: "Fund structure", provider: "CV5 Capital", standard: "CIMA advisory", status: "Partner" },
];

export default function InstitutionalPage() {
  return (
    <RedesignPage>
      <PageHeader
        eyebrow="Institutional"
        title="Built for scale. honest about what is live."
        subtitle="Abraxas is universal trust infrastructure on Sui. This page is the diligence layer: what is verified today, what partners back it, and where to inspect proof."
      />

      <div style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}>
        {PILLARS.map(p => (
          <ContentCard key={p.title}>
            <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              {p.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              {p.body}
            </p>
          </ContentCard>
        ))}
      </div>

      <ContentCard>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
          Audit trail
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {AUDIT_TRAIL.map(row => (
            <div key={row.area} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", padding: "0.65rem 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>{row.area}</span>
              <span style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-secondary)" }}>{row.provider} · {row.standard}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT }}>{row.status}</span>
            </div>
          ))}
        </div>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginTop: "1.5rem" }}>
        <Btn href="/flagship" size="lg">Inspect Cielo Sunrise →</Btn>
        <Btn href="/docs/ail" variant="secondary" size="lg">AIL spec</Btn>
        <Btn href="/security" variant="ghost" size="lg">Security</Btn>
        <Btn href="/partners" variant="ghost" size="lg">Partners</Btn>
        <Btn href="/admin/cielo" variant="ghost" size="lg">Calendar ops</Btn>
      </div>
    </RedesignPage>
  );
}
