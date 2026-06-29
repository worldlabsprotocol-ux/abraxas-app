"use client";
// FILE: app/docs/page.tsx

import Link from "next/link";
import { ProtocolPage } from "@/components/ProtocolPage";
import { PageHeader, ContentCard, BulletList } from "@/components/content/ProtocolSection";
import { DOCS_SECTIONS } from "@/lib/protocolContent";

const G = "#10B981";
const S = "'Inter',system-ui,-apple-system,sans-serif";

export default function DocsPage() {
  return (
    <ProtocolPage maxWidth={820}>
      <PageHeader
        eyebrow="Documentation"
        title="Technical overview"
        subtitle="Litepaper-style reference for how Abraxas issues credentials, verifies assets, and integrates with external protocols. Full SDK docs ship with the first external integration."
      />

      {DOCS_SECTIONS.map(section => (
        <ContentCard key={section.title} title={section.title}>
          <p style={{
            fontFamily: S,
            fontSize: "0.86rem",
            color: "var(--text-secondary)",
            lineHeight: 1.75,
            margin: 0,
          }}>
            {section.body}
          </p>
        </ContentCard>
      ))}

      <ContentCard title="API endpoints (live today)">
        <BulletList items={[
          "POST /api/credentials/verify",
          "GET /api/credentials/public-key",
          "POST /api/credentials/issue",
          "POST /api/identity/veriff/create-session",
          "POST /api/reclaim/start",
          "POST /api/reclaim/callback",
          "POST /api/purchase/submit",
          "POST /api/waitlist/join",
        ]} />
      </ContentCard>

      <ContentCard title="Related resources">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
          {[
            { label: "Roadmap", href: "/roadmap" },
            { label: "Security", href: "/security" },
            { label: "Tokenomics", href: "/tokenomics" },
            { label: "GitHub", href: "https://github.com/worldlabsprotocol-ux/abraxas-app" },
            { label: "Certificate spec", href: "https://docs.abraxas.xyz/certificates" },
          ].map(link => (
            <Link key={link.href} href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                color: G,
                fontFamily: S,
                fontSize: "0.78rem",
                fontWeight: 600,
                textDecoration: "none",
              }}>
              {link.label} →
            </Link>
          ))}
        </div>
      </ContentCard>
    </ProtocolPage>
  );
}
