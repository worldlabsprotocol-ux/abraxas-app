"use client";
// FILE: app/security/page.tsx

import Link from "next/link";
import { ProtocolPage } from "@/components/ProtocolPage";
import { PageHeader, ContentCard, BulletList } from "@/components/content/ProtocolSection";
import { SECURITY_ITEMS } from "@/lib/protocolContent";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const G = "#10B981";

export default function SecurityPage() {
  return (
    <ProtocolPage maxWidth={820}>
      <PageHeader
        eyebrow="Security"
        title="Security and trust practices"
        subtitle="What Abraxas does today to protect credentials and payments, and what is planned before institutional-scale integrations go live."
      />

      {SECURITY_ITEMS.map(section => (
        <ContentCard key={section.title} title={section.title}>
          <BulletList items={section.items} />
        </ContentCard>
      ))}

      <ContentCard title="Risk disclosures">
        <p style={{
          fontFamily: S,
          fontSize: "0.84rem",
          color: "var(--text-secondary)",
          lineHeight: 1.75,
          margin: "0 0 0.75rem",
        }}>
          Real-world assets may be securities. Yield projections on asset pages are not guarantees.
          Accredited investor offerings follow Reg D 506(c) where applicable. Read the full legal framework
          and privacy policy before investing or submitting assets.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Link href="/legal/terms" style={linkStyle}>Terms of Service</Link>
          <Link href="/legal/privacy" style={linkStyle}>Privacy Policy</Link>
          <Link href="/legal" style={linkStyle}>Legal frameworks</Link>
        </div>
      </ContentCard>

      <ContentCard title="Report a vulnerability">
        <p style={{
          fontFamily: S,
          fontSize: "0.84rem",
          color: "var(--text-secondary)",
          lineHeight: 1.75,
          margin: 0,
        }}>
          Responsible disclosure: contact the team via GitHub issues on the public repository or
          the Discord linked in the footer. A formal bug bounty with published scope and rewards
          launches after the first smart contract audit is complete.
        </p>
      </ContentCard>
    </ProtocolPage>
  );
}

const linkStyle: React.CSSProperties = {
  padding: "0.45rem 0.9rem",
  borderRadius: 999,
  border: "1px solid var(--border)",
  color: G,
  fontFamily: S,
  fontSize: "0.76rem",
  fontWeight: 600,
  textDecoration: "none",
};
