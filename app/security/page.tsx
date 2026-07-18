"use client";
// FILE: app/security/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { SECURITY_ITEMS } from "@/lib/protocolContent";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export default function SecurityPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Security"
        title="Security and trust practices"
        subtitle="Core verification runs in production today. These are the security practices behind credentials and payments — plus the focused audits completing before full open mainnet."
      />
      {SECURITY_ITEMS.map(section => (
        <ContentCard key={section.title} title={section.title}>
          <BulletList items={section.items} />
        </ContentCard>
      ))}
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
