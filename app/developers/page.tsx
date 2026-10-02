"use client";
// FILE: app/developers/page.tsx
// Developer hub. routes to integrate, partner portal, API docs.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { NextActionCard } from "@/components/product/NextActionCard";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { INTEGRATION_SDK_SNIPPET } from "@/lib/protocolIntegrations";
import { PARTNER_ONBOARDING_HEADLINE, PARTNER_ONBOARDING_DOC_LINKS } from "@/lib/partner/partnerOnboardingPositioning";
import { PRODUCTION_INTEGRATION_PATH } from "@/lib/relyingPartyProgram";
import { ConceptDemoVideo } from "@/components/home/ConceptDemoVideo";
import { BuildIntegrateCinematicDemo } from "@/components/home/cinematic/BuildIntegrateCinematicDemo";

import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export default function DevelopersPage() {
  return (
    <RedesignPage accent="developer" maxWidth={880}>
      <PageHeader
        eyebrow="Developers"
        title="Create a sandbox integration"
        subtitle={`${PARTNER_ONBOARDING_HEADLINE} Partner Flow, Passport, and signed receipts are available in beta. Consented passwordless partner accounts and optional email/newsletter scopes are in development, not live.`}
      />

      <ConceptDemoVideo demo={BuildIntegrateCinematicDemo} id="developers-demo" />

      <div style={{ marginBottom: "1rem" }}>
        <NextActionCard
          title="Start here"
          action="Integrate Abraxas"
          detail="Integration Studio is the canonical self-serve path: choose a policy, create a sandbox, copy Verify with Abraxas server code, and run your first sandbox verification — no operator required."
          href="/developers/integration-studio"
          buttonLabel="Open Integration Studio"
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <NextActionCard
          title="Verify with Abraxas"
          action="Copy the canonical quickstart"
          detail="One server-side integration primitive: createVerificationRequest → hosted handoff → verifyCallbackWithNarrowResult → resume your native action."
          href="/docs/VERIFY_WITH_ABRAXAS_QUICKSTART"
          buttonLabel="Read quickstart"
        />
      </div>

      <ContentCard title="Partner journey">
        <BulletList items={PRODUCTION_INTEGRATION_PATH.map((s, i) => `${i + 1}. ${s}`)} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/developers/launchpad" size="sm" variant="secondary">Partner Launchpad</Btn>
          <Btn href="/docs/partner-flow" size="sm" variant="ghost">Partner Flow docs</Btn>
          <Btn href="/docs/VERIFY_WITH_ABRAXAS_QUICKSTART" size="sm" variant="ghost">Verify with Abraxas</Btn>
          <Btn href="/design-partner" size="sm" variant="ghost">Request production access</Btn>
        </div>
        <details style={{ marginTop: "0.85rem" }}>
          <summary style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: "var(--accent)", cursor: "pointer" }}>
            Advanced integration paths
          </summary>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
            <Btn href="/docs/solana" size="sm" variant="ghost">Solana</Btn>
            <Btn href="/docs/trading-venue" size="sm" variant="ghost">Trading venue</Btn>
            <Btn href="/docs/wallet-standard-binding" size="sm" variant="ghost">Wallet binding</Btn>
            <Btn href="/docs/payment-authorization" size="sm" variant="ghost">Payment authorization</Btn>
            <Btn href="/docs/relying-party-verify" size="sm" variant="ghost">External RP guide</Btn>
            <Btn href="/docs/starter-kit" size="sm" variant="ghost">Starter kit</Btn>
            <Btn href={PARTNER_ONBOARDING_DOC_LINKS.developersPartner} size="sm" variant="ghost">Partner portal</Btn>
            <Btn href="/integrate" size="sm" variant="ghost">Full integrate guide</Btn>
          </div>
        </details>
      </ContentCard>

      <ContentCard title="Quick integration">
        <pre className="abx-code-scroll" style={{
          fontFamily: MONO, fontSize: "0.62rem", lineHeight: 1.55,
          padding: "1rem", borderRadius: 12, overflowX: "auto",
          background: "var(--surface-inset)", border: "1px solid var(--border)",
          color: "var(--text-secondary)", margin: 0,
        }}>
          {INTEGRATION_SDK_SNIPPET}
        </pre>
        <PublicJourneyNextSteps title="Use this snippet" />
      </ContentCard>

      <ContentCard title="API reference">
        <div style={{ display: "grid", gap: "0.45rem", fontFamily: FONT, fontSize: "0.78rem" }}>
          {[
            { label: "Integration Studio", href: "/developers/integration-studio" },
            { label: "External RP verify + proof", href: "/docs/relying-party-verify" },
            { label: "JSON integration guide (API)", href: "/docs/relying-party-verify" },
            { label: "Consent verification requests", href: "/docs/partner-verification-requests" },
            { label: "Record verifier", href: "/verify" },
            { label: "Solana integration", href: "/docs/solana" },
            { label: "Solana claim access example", href: "/examples/solana-partner" },
            { label: "Trading venue preflight example", href: "/examples/trading-venue" },
            { label: "Payment authorization example", href: "/examples/payment-authorization" },
            { label: "Sui deployment status (JSON API)", href: "/docs/sui" },
            { label: "Mainnet readiness docs", href: "/docs" },
            { label: "Positioning", href: "/docs/why-verification" },
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
