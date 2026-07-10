"use client";
// FILE: app/docs/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { DOCS_SECTIONS } from "@/lib/protocolContent";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export default function DocsPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Documentation"
        title="Technical overview"
        subtitle="Abraxas Identity Layer (AIL). trust orchestration, not KYC. Licensed providers verify; Abraxas distributes cryptographic proof."
      />
      <ContentCard title="Start here">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          Read the full product specification:{" "}
          <Link href="/docs/ail" style={{ color: ACCENT, fontWeight: 600 }}>Abraxas Identity Layer (AIL) →</Link>
        </p>
      </ContentCard>
      {DOCS_SECTIONS.map(section => (
        <ContentCard key={section.title} title={section.title}>
          <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
                       lineHeight: 1.75, margin: 0 }}>
            {section.body}
          </p>
        </ContentCard>
      ))}
      <ContentCard title="API endpoints (live today)">
        <BulletList items={[
          "POST /api/credentials/verify",
          "GET /api/credentials/public-key",
          "POST /api/auth/zklogin/register",
          "GET /api/sui/passport",
          "POST /api/idv/create-session",
          "POST /api/purchase/submit",
          "POST /api/waitlist/join",
        ]} />
      </ContentCard>
      <ContentCard title="Related">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {[
            { label: "Why verification", href: "/docs/why-verification" },
            { label: "Credential portability", href: "/docs/credential-portability" },
            { label: "Litepaper", href: "/docs/litepaper" },
            { label: "Chain architecture", href: "/docs/chain" },
            { label: "AIL specification", href: "/docs/ail" },
            { label: "Sui integration", href: "/docs/sui" },
            { label: "Passport spec", href: "/docs/passport-spec" },
            { label: "Documentation hub", href: "/docs" },
            { label: "Live metrics", href: "/metrics" },
            { label: "Architecture", href: "/docs/architecture" },
            { label: "Roadmap", href: "/roadmap" },
            { label: "Security", href: "/security" },
            { label: "Tokenomics", href: "/tokenomics" },
            { label: "GitHub", href: "https://github.com/worldlabsprotocol-ux/abraxas-app" },
          ].map(link => (
            <Link key={link.href} href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              style={{
                padding: "0.5rem 1rem", borderRadius: 999,
                border: "1px solid var(--border)", color: ACCENT,
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none",
              }}>
              {link.label} →
            </Link>
          ))}
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
