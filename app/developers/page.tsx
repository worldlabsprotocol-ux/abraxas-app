"use client";
// FILE: app/developers/page.tsx
// Developer hub — routes to integrate, partner portal, API docs.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { INTEGRATION_SDK_SNIPPET } from "@/lib/protocolIntegrations";
import { PRODUCTION_INTEGRATION_PATH } from "@/lib/relyingPartyProgram";
import { ConceptDemoVideo } from "@/components/home/ConceptDemoVideo";
import { BuildIntegrateCinematicDemo } from "@/components/home/cinematic/BuildIntegrateCinematicDemo";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export default function DevelopersPage() {
  return (
    <RedesignPage maxWidth={880}>
      <PageHeader
        eyebrow="Developers"
        title="Build on Abraxas verification"
        subtitle="Server-side credential verify, registry lookup, and asset monitoring webhooks — passport-grade trust without rebuilding KYC."
      />

      <ConceptDemoVideo demo={BuildIntegrateCinematicDemo} id="developers-demo" />

      <ContentCard title="Start here">
        <BulletList items={PRODUCTION_INTEGRATION_PATH.map((s, i) => `${i + 1}. ${s}`)} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/docs/relying-party-verify" size="sm">External RP guide →</Btn>
          <Btn href="/design-partner" size="sm">Request API key →</Btn>
          <Btn href="/developers/partner" variant="secondary" size="sm">Partner portal →</Btn>
          <Btn href="/integrate" variant="ghost" size="sm">Full integrate guide →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Quick integration">
        <pre style={{
          fontFamily: MONO, fontSize: "0.62rem", lineHeight: 1.55,
          padding: "1rem", borderRadius: 12, overflow: "auto",
          background: "var(--surface-inset)", border: "1px solid var(--border)",
          color: "var(--text-secondary)", margin: 0,
        }}>
          {INTEGRATION_SDK_SNIPPET}
        </pre>
      </ContentCard>

      <ContentCard title="API reference">
        <div style={{ display: "grid", gap: "0.45rem", fontFamily: FONT, fontSize: "0.78rem" }}>
          {[
            { label: "External RP verify + proof", href: "/docs/relying-party-verify" },
            { label: "JSON integration guide", href: "/api/docs/relying-party" },
            { label: "Consent verification requests", href: "/docs/partner-verification-requests" },
            { label: "Record verifier", href: "/verify" },
            { label: "Sui deployment status", href: "/api/sui/status" },
            { label: "Mainnet readiness", href: "/api/mainnet/readiness" },
            { label: "Positioning loop", href: "/api/positioning/loop" },
            { label: "Asset signals webhook", href: "/integrations/relying-parties" },
            { label: "MLS lot status push", href: "/integrations/relying-parties" },
            { label: "Trust layer docs", href: "/trust-framework" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
              {item.label} →
            </Link>
          ))}
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
