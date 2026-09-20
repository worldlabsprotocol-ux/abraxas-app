// FILE: app/docs/production-credentials/page.tsx
// Operator Production credential issuance. Not Mainnet activation.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PRODUCTION_CREDENTIAL_NOTICE } from "@/lib/partner/launchpad/productionCredentials/contract";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function ProductionCredentialsDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Operators · Production credentials"
        title="Issue one live partner API credential after review"
        subtitle={PRODUCTION_CREDENTIAL_NOTICE}
      />
      <ContentCard title="Four separate steps">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          <li>Review approval — the app is approved for the reviewed Production integration path. No key is created.</li>
          <li>Live key issuance — an operator explicitly confirms and receives one `abx_live_` credential once.</li>
          <li>Partner production configuration — the partner stores the key and configures their own backend.</li>
          <li>Explicit Mainnet execution — still a later, separate operator and partner action. Issuance does not activate Mainnet.</li>
        </ol>
      </ContentCard>
      <ContentCard title="Boundaries">
        <p style={body}>
          Sandbox keys stay `abx_test_`. Production keys are `abx_live_`. The raw secret is never written to
          activity, GET responses, errors, webhooks, or app objects. Rotation revokes the previous live key
          and shows a new raw secret once. Revocation marks the live key unusable without minting another.
        </p>
      </ContentCard>
      <ContentCard title="Where this lives">
        <p style={body}>
          Issuance is operator-only inside the Production-review control plane, not Partner Launchpad.
          {" "}
          <Link href="/admin/production-review">Operator queue</Link>
          {" · "}
          <Link href="/docs/production-review">Production review</Link>
          {" · "}
          <Link href="/docs/multichain-mainnet-readiness">Mainnet readiness</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
