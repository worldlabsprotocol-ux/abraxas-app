// FILE: app/docs/VERIFY_WITH_ABRAXAS_QUICKSTART/page.tsx
// Canonical Verify-with-Abraxas quickstart — matches docs/VERIFY_WITH_ABRAXAS_QUICKSTART.md

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { PARTNER_INTEGRATION_SOURCE_LEVEL } from "@/lib/partner/integrationKit";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function VerifyWithAbraxasQuickstartPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers"
        title="Verify with Abraxas — quickstart"
        subtitle="One policy-agnostic integration primitive. Abraxas owns proof; your application owns the customer experience."
      />
      <ContentCard title="Source-level PartnerKit">
        <p style={body}>{PARTNER_INTEGRATION_SOURCE_LEVEL}</p>
        <p style={{ ...body, marginTop: "0.65rem" }}>
          External fixture:{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.78rem" }}>examples/verify-with-abraxas-external/</code>
        </p>
      </ContentCard>
      <ContentCard title="Canonical sandbox path">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          <li>
            Create a sandbox via{" "}
            <Link href="/developers/integration-studio?outcome=reuse_across_app&path=verify_with_abraxas&pack=identity_liveness" style={{ color: "var(--accent)", fontWeight: 700 }}>
              Integration Studio
            </Link>
            ,{" "}
            <Link href="/evaluation/two-app" style={{ color: "var(--accent)", fontWeight: 700 }}>
              two-app evaluation
            </Link>
            , or{" "}
            <Link href="/developers/launchpad" style={{ color: "var(--accent)", fontWeight: 700 }}>
              Launchpad
            </Link>
            . Store the <code style={{ fontFamily: MONO }}>abx_test_*</code> key server-side — shown once.
          </li>
          <li>Allowlist your HTTPS callback. Callback query params are not authorization.</li>
          <li>
            Server-side:{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.78rem" }}>POST /api/v1/partner-handoff</code>
            {" "}or Integration Kit{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.78rem" }}>createVerificationRequest</code>
            {" "}with API key + application ID.
          </li>
          <li>Redirect holder to <code style={{ fontFamily: MONO, fontSize: "0.78rem" }}>verification_url</code>. Never expose API keys in the browser.</li>
          <li>
            On callback:{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.78rem" }}>verifyCallbackWithNarrowResult</code>
            {" "}— re-fetch{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.78rem" }}>GET /api/receipts/{"{id}"}/public</code>
            {" "}before granting access.
          </li>
          <li>Use <code style={{ fontFamily: MONO, fontSize: "0.78rem" }}>verified.narrow</code> only — policy-authorized facts, not raw KYC.</li>
          <li>For App B reuse: initiate a second request; compatible evidence may satisfy policy without a second provider verification.</li>
          <li>Sandbox success does not activate production. Request production review in Launchpad when ready.</li>
        </ol>
      </ContentCard>
      <ContentCard title="Environment variables (server only)">
        <pre style={{ fontFamily: MONO, fontSize: "0.72rem", overflow: "auto", margin: 0 }}>
{`ABRAXAS_SANDBOX_API_KEY=abx_test_…
ABRAXAS_APP_ID=app_…
ABRAXAS_PARTNER_ID=partner-…
ABRAXAS_POLICY_ID=partner-…-identity_liveness-v1
ABRAXAS_BASE_URL=https://abraxasworld.xyz`}
        </pre>
      </ContentCard>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/docs/integration-kit" size="sm">Integration Kit docs</Btn>
        <Btn href="/docs/partner-flow" size="sm" variant="secondary">Partner Flow</Btn>
        <Btn href="/docs/partner-flow-api" size="sm" variant="ghost">Partner Flow API</Btn>
      </div>
    </RedesignPage>
  );
}
