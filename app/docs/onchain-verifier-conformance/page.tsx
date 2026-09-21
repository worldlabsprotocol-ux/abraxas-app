import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  ONCHAIN_VERIFIER_CONFORMANCE_COMMANDS,
  ONCHAIN_VERIFIER_CONFORMANCE_NOTICE,
  ONCHAIN_VERIFIER_CONFORMANCE_SEQUENCE,
  ONCHAIN_VERIFIER_CONFORMANCE_ABRAXAS_VERIFIES,
  ONCHAIN_VERIFIER_CONFORMANCE_PROTOCOL_OWNS,
  ONCHAIN_VERIFIER_CONFORMANCE_BOUNDARY,
} from "@/lib/partner/onchainVerifierConformance/contract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function OnchainVerifierConformanceDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Verifier"
        title="Versioned onchain verifier and conformance"
        subtitle={ONCHAIN_VERIFIER_CONFORMANCE_NOTICE}
      />
      <ContentCard title="Boundary">
        <p style={body}>{ONCHAIN_VERIFIER_CONFORMANCE_BOUNDARY}</p>
      </ContentCard>
      <ContentCard title="Integration sequence">
        <pre style={{ ...body, fontFamily: MONO, fontSize: "0.78rem", whiteSpace: "pre-wrap" }}>
{`private eligibility
  → presentation + consent
  → public receipt re-fetch
  → chain attestation
  → partner-owned gate consume
  → local conformance report`}
        </pre>
        <ol style={{ ...body, paddingLeft: "1.2rem" }}>
          {ONCHAIN_VERIFIER_CONFORMANCE_SEQUENCE.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </ContentCard>
      <ContentCard title="CLI">
        <pre style={{ ...body, fontFamily: MONO, fontSize: "0.78rem", whiteSpace: "pre-wrap" }}>
          {ONCHAIN_VERIFIER_CONFORMANCE_COMMANDS.map((row) => `npm run abraxas-conformance -- ${row}`).join("\n")}
        </pre>
      </ContentCard>
      <ContentCard title="EVM quickstart">
        <p style={body}>
          Use schema 2, EIP-712 name AbraxasEligibilityVerifier, version 2, and the published typehash.
          Your gate consumes the nonce once. Local Foundry vectors must match the TypeScript digest.
        </p>
      </ContentCard>
      <ContentCard title="Solana quickstart">
        <p style={body}>
          Use prefix ABRAXAS_CHAIN_ELIGIBILITY_V2 and a 468-byte message. Institutional configs reject 372-byte V1.
          Local ProgramTest vectors must match the TypeScript canonical bytes.
        </p>
      </ContentCard>
      <ContentCard title="V1 vs V2 institutional compatibility">
        <p style={{ ...body, fontFamily: MONO, fontSize: "0.78rem" }}>
          V1 372-byte / EIP-712 v1: allowed only on existing non-institutional deployments.
          {"\n"}V2 468-byte / EIP-712 v2: required when institutional_required is true.
          {"\n"}V1 against an institutional GateConfig: rejected.
          {"\n"}V2 never silently parses as V1.
        </p>
      </ContentCard>
      <ContentCard title="What Abraxas verifies">
        <ul style={{ ...body, paddingLeft: "1.2rem" }}>
          {ONCHAIN_VERIFIER_CONFORMANCE_ABRAXAS_VERIFIES.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </ContentCard>
      <ContentCard title="What your protocol still owns">
        <ul style={{ ...body, paddingLeft: "1.2rem" }}>
          {ONCHAIN_VERIFIER_CONFORMANCE_PROTOCOL_OWNS.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </ContentCard>
      <ContentCard title="Related">
        <p style={body}>
          <Link href="/docs/onchain-gate-deployments">Verified deployments</Link>
          {" · "}
          <Link href="/docs/testnet-gate-deployment">Testnet kit</Link>
          {" · "}
          <Link href="/docs/chain-attestation-signer-lifecycle">Signer lifecycle</Link>
          {" · "}
          <Link href="/docs/eligibility-presentation-protocol">Presentation</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
