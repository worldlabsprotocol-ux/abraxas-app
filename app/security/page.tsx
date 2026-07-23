"use client";
// FILE: app/security/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { SECURITY_ITEMS } from "@/lib/protocolContent";
import { AUDIT_TRACKER, AUDIT_STATUS_COLOR, SECURITY_PROGRAM_LINKS } from "@/lib/securityProgram";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const EMERGENCY_POLICY = [
  "Passport issuer and credential signing keys rotatable via env update + redeploy",
  "Veriff sessions revocable; credentials support revocation timestamp",
  "Disputed assets can be flagged in pipeline before MARKETPLACE_LIVE",
  "Payment verification requires matching settlement address + memo + amount on Sui",
  "Progressive decentralization. central committee today, documented in litepaper",
];

export default function SecurityPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Security"
        title="Security and trust practices"
        subtitle="What Abraxas does today, audit status, and the path to institutional-grade assurance."
      />

      <ContentCard title="Audit tracker">
        {AUDIT_TRACKER.slice(0, 3).map(audit => (
          <div key={audit.id} style={{ padding: "0.65rem 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {audit.name}
              </span>
              <span style={{
                fontFamily: FONT, fontSize: "0.55rem", fontWeight: 700,
                padding: "0.12rem 0.4rem", borderRadius: 6,
                color: AUDIT_STATUS_COLOR[audit.status],
                background: `${AUDIT_STATUS_COLOR[audit.status]}18`,
              }}>
                {audit.statusLabel}
              </span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: "0.25rem 0 0", lineHeight: 1.6 }}>
              {audit.notes}
            </p>
          </div>
        ))}
        <div style={{ marginTop: "0.75rem" }}>
          <Btn href="/security/bounty" size="sm">Full audit tracker + bug bounty →</Btn>
        </div>
      </ContentCard>

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
          attestations, hashes, and revocation state. never raw document images on-chain. User controls consent
          for credential sharing via presentation proofs.
        </p>
      </ContentCard>

      <ContentCard title="Security program links">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {SECURITY_PROGRAM_LINKS.map(link => (
            <Link key={link.href} href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              style={linkStyle}>
              {link.label}
            </Link>
          ))}
        </div>
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
        <Btn href="/security/bounty" size="lg">Bug bounty program →</Btn>
        <Btn href="/investors/strategy" variant="secondary" size="lg">Strategic roadmap</Btn>
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
