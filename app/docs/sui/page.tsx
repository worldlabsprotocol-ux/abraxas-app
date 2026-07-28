"use client";
// FILE: app/docs/sui/page.tsx
// Sui-native verification hub. zkLogin, Passport, sponsored tx, intent messaging.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { SuiIntegrationsPanel } from "@/components/sui/SuiIntegrationsPanel";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { SuiDevnetPassportPanel } from "@/components/passport/SuiDevnetPassportPanel";
import { SUI_FEATURES } from "@/lib/protocolSui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

function SuiDocsInner() {
  return (
    <RedesignPage maxWidth={960}>
      <PageHeader
        eyebrow="Sui verification"
        title="Everything Abraxas does on Sui"
        subtitle="zkLogin sign-in, on-chain Passport stamps, sponsored transactions for verified tiers, and intent message proofs. one place to learn and operate."
      />

      <ContentCard title="Try it now">
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <ZkLoginSignIn />
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
            <p style={{ margin: "0 0 0.5rem" }}>After sign-in, earn stamps on the Passport wizard. Each stamp can mirror to Sui devnet.</p>
            <Link href="/passport" style={{ color: ACCENT, fontWeight: 600 }}>Open Passport →</Link>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Feature map">
        <SuiIntegrationsPanel showSetup />
      </ContentCard>

      <ContentCard title="Live devnet Passport">
        <SuiDevnetPassportPanel />
      </ContentCard>

      <ContentCard title="Intent messaging (how it will work)">
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          {SUI_FEATURES.find(f => f.id === "intent-messaging")?.summary}
        </p>
        <ol style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.8, margin: 0, paddingLeft: "1.25rem" }}>
          {SUI_FEATURES.find(f => f.id === "intent-messaging")?.userSteps.map(s => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
          No gas. signing a personal message is off-chain. Verifiers use the same Ed25519 domain as Passport Type 0 proofs.
        </p>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {[
          { label: "zkLogin setup (operators)", href: "/docs/zklogin-setup" },
          { label: "Passport spec", href: "/docs/passport-spec" },
          { label: "Architecture", href: "/docs/architecture" },
          { label: "GET /api/passport/spec", href: "/api/passport/spec" },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{
            padding: "0.5rem 1rem", borderRadius: 999, border: "1px solid var(--border)",
            color: ACCENT, fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none",
          }}>
            {l.label} →
          </Link>
        ))}
      </div>
    </RedesignPage>
  );
}

export default function SuiDocsPage() {
  return <SuiDocsInner />;
}
