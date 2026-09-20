// FILE: app/docs/sandbox-conformance/page.tsx
// Partner-facing local conformance contract. No live holder or funds.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  SANDBOX_PARTNER_CONTRACT_COMMAND,
  SANDBOX_PARTNER_CONTRACT_DOES_NOT,
  SANDBOX_PARTNER_CONTRACT_NOTICE,
  SANDBOX_PARTNER_CONTRACT_NPM,
  SANDBOX_PARTNER_CONTRACT_STAGES,
} from "@/lib/partner/sandboxPartnerContract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function SandboxConformanceDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Launchpad"
        title="End-to-end sandbox partner contract"
        subtitle={SANDBOX_PARTNER_CONTRACT_NOTICE}
      />

      <ContentCard title="What this proves locally">
        <p style={body}>
          Run the same integration contract your server will use before you test with a real holder.
          The suite reuses Launchpad provisioning, callback allowlisting, hosted Partner Flow parsing,
          receipt verification, webhook re-check, trading and payment preflight, optional Wallet
          Standard binding, the sandbox test console, and the reviewed Production request.
        </p>
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.35rem", marginTop: "0.75rem" }}>
          {SANDBOX_PARTNER_CONTRACT_STAGES.map((stage) => (
            <li key={stage}>{stage.replace(/_/g, " ")}</li>
          ))}
        </ol>
      </ContentCard>

      <ContentCard title="Repository command">
        <p style={body}>CI-safe. No network credentials.</p>
        <pre className="abx-code-scroll" style={{ fontFamily: MONO, fontSize: "0.72rem", overflowX: "auto", marginTop: "0.65rem" }}>
          {SANDBOX_PARTNER_CONTRACT_COMMAND}
        </pre>
        <p style={{ ...body, marginTop: "0.55rem" }}>
          Equivalent: <code style={{ fontFamily: MONO }}>{SANDBOX_PARTNER_CONTRACT_NPM}</code>
        </p>
      </ContentCard>

      <ContentCard title="What it does not do">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          {SANDBOX_PARTNER_CONTRACT_DOES_NOT.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </ContentCard>

      <ContentCard title="Continue">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/developers/launchpad?view=test" size="sm">Sandbox test console →</Btn>
          <Btn href="/developers/integration-studio" variant="secondary" size="sm">Integration Studio →</Btn>
          <Link href="/docs/partner-flow" style={{ alignSelf: "center", color: "var(--accent)", fontWeight: 700 }}>
            Partner Flow docs
          </Link>
        </div>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
