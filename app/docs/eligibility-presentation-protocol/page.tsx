// FILE: app/docs/eligibility-presentation-protocol/page.tsx

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  ELIGIBILITY_PRESENTATION_MEDIA_TYPE,
  ELIGIBILITY_PRESENTATION_NOTICE,
  ELIGIBILITY_PRESENTATION_UTILA_NOTICE,
  ELIGIBILITY_PRESENTATION_CHECKLIST,
} from "@/lib/eligibilityPresentation/contract";
import { eligibilityPresentationServerExample } from "@/lib/eligibilityPresentation/examples";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function EligibilityPresentationProtocolDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Protocol · Eligibility presentation"
        title="Abraxas Eligibility Presentation Protocol"
        subtitle={ELIGIBILITY_PRESENTATION_NOTICE}
      />
      <ContentCard title="What this is">
        <p style={body}>
          Any protocol can request one narrow KYC, KYB, authorized-signer, jurisdiction, age,
          membership, or policy result from Abraxas without collecting the holder’s underlying
          evidence or inventing its own verification stack. The envelope media type is{" "}
          <code>{ELIGIBILITY_PRESENTATION_MEDIA_TYPE}</code>. This is a server-to-server
          presentation standard. It is not a transferable identity passport, generic KYC form,
          raw credential wallet, browser-authoritative flow, or reusable bearer token.
        </p>
      </ContentCard>
      <ContentCard title="Verification sequence">
        <ol style={{ ...body, paddingLeft: 18 }}>
          {ELIGIBILITY_PRESENTATION_CHECKLIST.map((item) => (
            <li key={item} style={{ marginBottom: 8 }}>{item}</li>
          ))}
        </ol>
        <p style={body}>
          Discover envelope versions and endpoints at{" "}
          <Link href="/.well-known/abraxas-eligibility">/.well-known/abraxas-eligibility</Link>.
          Signatures reuse the existing Ed25519 receipt verification-key lifecycle. There is no
          parallel signing trust.
        </p>
      </ContentCard>
      <ContentCard title="KYC/KYB planning posture">
        <p style={body}>{ELIGIBILITY_PRESENTATION_UTILA_NOTICE}</p>
        <p style={body}>
          <code>organization_eligible</code>, <code>authorized_signer</code>,{" "}
          <code>jurisdiction_eligible</code>, and{" "}
          <code>institutional_counterparty_eligible</code> are planning categories only. They
          flow through Policy Proposals → Release Candidates → a reviewed catalog change. A browser
          or partner cannot self-publish them as a live policy.
        </p>
      </ContentCard>
      <ContentCard title="Server example">
        <pre style={{ ...body, whiteSpace: "pre-wrap", fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem" }}>
          {eligibilityPresentationServerExample()}
        </pre>
      </ContentCard>
      <ContentCard title="Where this connects">
        <p style={body}>
          <Link href="/docs/hosted-partner-flow-handoff">Hosted Partner Flow</Link>
          {" · "}
          <Link href="/docs/selective-disclosure">Selective disclosure</Link>
          {" · "}
          <Link href="/docs/receipt-key-lifecycle">Receipt key lifecycle</Link>
          {" · "}
          <Link href="/docs/policy-proposals">Policy proposals</Link>
          {" · "}
          <Link href="/developers/integration-studio">Integration Studio</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
