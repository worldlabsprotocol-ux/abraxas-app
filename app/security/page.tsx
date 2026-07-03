"use client";
// FILE: app/security/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { SECURITY_ITEMS } from "@/lib/protocolContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const EMERGENCY_POLICY = [
  "Passport issuer and credential signing keys rotatable via env update + redeploy",
  "Veriff sessions revocable; credentials support revocation timestamp",
  "Disputed assets can be flagged in pipeline before MARKETPLACE_LIVE",
  "Payment verification requires matching treasury + memo + amount on Sui",
  "Progressive decentralization — central committee today, documented in litepaper",
];

export default function SecurityPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Security"
        title="Security and trust practices"
        subtitle="What Abraxas does today, what is planned before institutional scale, and how we handle bad-day scenarios."
      />
      {SECURITY_ITEMS.map(section => (
        <ContentCard key={section.title} title={section.title}>
          <BulletList items={section.items} />
        </ContentCard>
      ))}
      <ContentCard title="Kill-switch & recovery (policy)">
        <BulletList items={EMERGENCY_POLICY} />
      </ContentCard>
      <ContentCard title="Privacy architecture">
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
          Sensitive identity data stays with licensed providers (Veriff). Abraxas anchors only consented proofs,
          attestations, hashes, and revocation state — never raw document images on-chain. User controls consent
          for credential sharing via presentation proofs.
        </p>
      </ContentCard>
      <ContentCard title="Risk disclosures">
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)",
                     lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          Real-world assets may be securities. Yield projections on asset pages are not guarantees.
          Read the full legal framework before investing or submitting assets.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Link href="/legal/terms" style={linkStyle}>Terms of Service</Link>
          <Link href="/legal/privacy" style={linkStyle}>Privacy Policy</Link>
          <Link href="/legal" style={linkStyle}>Legal frameworks</Link>
        </div>
      </ContentCard>
      <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <Btn href="/investors" size="lg">Data room →</Btn>
        <Btn href="/docs/chain" variant="secondary" size="lg">Chain architecture</Btn>
      </div>
    </RedesignPage>
  );
}

const linkStyle: React.CSSProperties = {
  padding: "0.45rem 0.9rem",
  borderRadius: 999,
  border: "1px solid var(--border)",
  color: ACCENT,
  fontFamily: FONT,
  fontSize: "0.76rem",
  fontWeight: 600,
  textDecoration: "none",
};
