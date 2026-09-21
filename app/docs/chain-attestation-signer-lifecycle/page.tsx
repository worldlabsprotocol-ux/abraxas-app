// FILE: app/docs/chain-attestation-signer-lifecycle/page.tsx
// Chain attestation signer rotation. Public verifier material only. Not a deployer.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  CHAIN_ATTESTATION_SIGNER_NOTICE,
  CHAIN_ATTESTATION_SIGNER_OPERATOR_STEPS,
} from "@/lib/partner/chainAttestationSignerLifecycle";
import {
  CHAIN_ATTESTATION_SIGNER_LIFECYCLE_ARCHITECTURE,
  chainAttestationSignerPublicExample,
} from "@/lib/partner/chainAttestationSignerLifecycle/examples";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function ChainAttestationSignerLifecycleDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Chain attestation signers"
        title="Rotate and revoke chain attestation signers"
        subtitle={CHAIN_ATTESTATION_SIGNER_NOTICE}
      />

      <ContentCard title="What this is">
        <p style={body}>
          Abraxas issues EVM secp256k1 and Solana Ed25519 chain attestations only to verified
          partner-owned deployments. Dedicated environment keys sign those attestations. Receipt
          private keys are never reused. Partners keep ownership of their gate contract or program.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>
          Abraxas stops issuance when a signer is retiring or revoked. You update your own gate.
          Nobody can recover a compromised private key. Verifying a signature is not a grant.
        </p>
      </ContentCard>

      <ContentCard title="Architecture">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {CHAIN_ATTESTATION_SIGNER_LIFECYCLE_ARCHITECTURE}
        </pre>
      </ContentCard>

      <ContentCard title="Operator steps">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {CHAIN_ATTESTATION_SIGNER_OPERATOR_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </ContentCard>

      <ContentCard title="Public verifier material">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {chainAttestationSignerPublicExample()}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Owner-only EVM entry points are addTrustedSigner, retireTrustedSigner, and revokeTrustedSigner.
          Solana uses add_trusted_signer, retire_trusted_signer, and revoke_trusted_signer on GateConfig
          authority. Abraxas never broadcasts those transactions.
        </p>
      </ContentCard>

      <ContentCard title="Related">
        <p style={body}>
          <Link href="/docs/evm-onchain-eligibility-gate">EVM gate</Link>
          {" · "}
          <Link href="/docs/solana-onchain-eligibility-gate">Solana gate</Link>
          {" · "}
          <Link href="/docs/onchain-gate-deployments">Verified deployments</Link>
          {" · "}
          <Link href="/docs/receipt-key-lifecycle">Receipt key lifecycle</Link>
        </p>
      </ContentCard>

      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
