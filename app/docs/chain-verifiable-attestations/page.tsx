// FILE: app/docs/chain-verifiable-attestations/page.tsx
// Public chain-verifiable eligibility attestation docs. No live deployment claims.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  CHAIN_ATTESTATION_BOUNDARY,
  CHAIN_ATTESTATION_FLOW,
  CHAIN_ATTESTATION_NOT_EXECUTION,
  CHAIN_ATTESTATION_PRIVACY,
  EIP712_ATTESTATION_TYPE,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_TYPE,
  EIP712_DOMAIN_VERSION,
  EIP712_PRIMARY_TYPE,
  SOLANA_ATTESTATION_MESSAGE_PREFIX,
} from "@/lib/partner/chainAttestation/contract";
import { CHAIN_ATTESTATION_ARCHITECTURE, chainAttestationServerExample } from "@/lib/partner/chainAttestation/examples";
import { SOLANA_PARTNER_PROGRAM_INTERFACE } from "@/lib/partner/chainAttestation/solanaMessage";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function ChainVerifiableAttestationsDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Chain-verifiable attestations"
        title="Onchain protocol gate"
        subtitle={`${CHAIN_ATTESTATION_BOUNDARY} ${CHAIN_ATTESTATION_NOT_EXECUTION}`}
      />

      <ContentCard title="How it works">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {CHAIN_ATTESTATION_ARCHITECTURE}
        </pre>
        <p style={{ ...body, marginTop: "0.85rem" }}>{CHAIN_ATTESTATION_FLOW}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          The partner deploys and owns its AbraxasEligibilityVerifier. Abraxas does not deploy a shared execution contract
          and does not claim any live Arc, Ethereum, Solana, or Mainnet contract.
        </p>
      </ContentCard>

      <ContentCard title="EIP-712 domain">
        <p style={body}>
          Name <span style={{ fontFamily: MONO }}>{EIP712_DOMAIN_NAME}</span>, version{" "}
          <span style={{ fontFamily: MONO }}>{EIP712_DOMAIN_VERSION}</span>, plus chainId, verifyingContract,
          and partnerHash. Primary type <span style={{ fontFamily: MONO }}>{EIP712_PRIMARY_TYPE}</span>.
        </p>
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: "0.75rem 0 0" }}>
{`domain: ${JSON.stringify({ name: EIP712_DOMAIN_NAME, version: EIP712_DOMAIN_VERSION, fields: EIP712_DOMAIN_TYPE.map((f) => f.name) }, null, 2)}
message: ${JSON.stringify(EIP712_ATTESTATION_TYPE.map((f) => f.name), null, 2)}`}
        </pre>
      </ContentCard>

      <ContentCard title="Solana message">
        <p style={body}>
          Prefix <span style={{ fontFamily: MONO }}>{SOLANA_ATTESTATION_MESSAGE_PREFIX}</span> then the same
          canonical hashes and timestamps. Partners build an Ed25519 verify instruction; Abraxas does not
          submit SOL transfers or deploy a program.
        </p>
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: "0.75rem 0 0", whiteSpace: "pre-wrap" }}>
          {SOLANA_PARTNER_PROGRAM_INTERFACE}
        </pre>
      </ContentCard>

      <ContentCard title="Privacy">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {CHAIN_ATTESTATION_PRIVACY.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="Network posture">
        <p style={body}>
          The EVM verifier is network-agnostic for later Arc/Circle EVM, Ethereum, and other approved EVM
          networks. Arc Circle Mainnet stays disabled until separately configured and reviewed. EVM Mainnet
          remains Production-review-required. Circle settlement is a separate explicit-confirmation path and
          is never imported here.
        </p>
      </ContentCard>

      <ContentCard title="Partner backend example">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {chainAttestationServerExample()}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          <Link href="/developers/integration-studio">Integration Studio · Onchain protocol gate</Link>
          {" · "}
          <Link href="/docs/evm-partner-adapter">EVM adapter</Link>
          {" · "}
          <Link href="/docs/solana">Solana adapter</Link>
          {" · "}
          <Link href="/docs/portable-action-contract">Portable action contract</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
