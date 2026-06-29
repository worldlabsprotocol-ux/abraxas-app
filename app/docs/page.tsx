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
        subtitle="Litepaper-style reference for credentials, asset verification, and integration. Full SDK docs ship with the first external integration."
      />
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
          "POST /api/credentials/issue",
          "POST /api/identity/veriff/create-session",
          "POST /api/reclaim/start",
          "POST /api/reclaim/callback",
          "POST /api/purchase/submit",
          "POST /api/waitlist/join",
        ]} />
      </ContentCard>
      <ContentCard title="Related">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {[
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
