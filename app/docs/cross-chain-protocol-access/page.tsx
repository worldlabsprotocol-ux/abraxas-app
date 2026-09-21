// FILE: app/docs/cross-chain-protocol-access/page.tsx
// Local/sandbox reference. No live Arc, EVM, Solana, Mainnet, USDC, or Utila claims.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  CROSS_CHAIN_PROTOCOL_ACTION,
  CROSS_CHAIN_PROTOCOL_EVM_INTERFACE,
  CROSS_CHAIN_PROTOCOL_NO_FUNDS,
  CROSS_CHAIN_PROTOCOL_NOTICE,
  CROSS_CHAIN_PROTOCOL_SOLANA_INTERFACE,
} from "@/lib/partner/crossChainProtocolAccess/contract";
import { crossChainProtocolAccessServerExample } from "@/lib/partner/crossChainProtocolAccess/examples";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function CrossChainProtocolAccessDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Cross-chain"
        title="Cross-chain protocol access"
        subtitle={CROSS_CHAIN_PROTOCOL_NOTICE}
      />
      <ContentCard title="Plain language">
        <p style={body}>
          private proof → fresh consent → audience-bound receipt → server re-check → one-time chain
          authorization → partner-owned action
        </p>
        <pre style={{ ...body, fontFamily: MONO, fontSize: "0.78rem", whiteSpace: "pre-wrap" }}>
{`holder (private proof)
        |
        v
Hosted Partner Flow + fresh consent
        |
        v
audience-bound receipt
        |
        v
server GET /api/receipts/{id}/public
        |
        v
one-time chain authorization
        |
        v
activate_protocol_access (partner-owned)`}
        </pre>
      </ContentCard>
      <ContentCard title="Named action">
        <p style={body}>
          Both chains use the same named action: <code>{CROSS_CHAIN_PROTOCOL_ACTION}</code>. A partner
          protocol records that one subject may access one named feature. It does not transfer tokens,
          mint assets, approve spending, route orders, settle payments, custody funds, or call arbitrary
          contracts or programs.
        </p>
        <p style={body}>{CROSS_CHAIN_PROTOCOL_NO_FUNDS}</p>
      </ContentCard>
      <ContentCard title="EVM interface">
        <p style={body}>
          Contract <code>{CROSS_CHAIN_PROTOCOL_EVM_INTERFACE.contract}</code>, method{" "}
          <code>{CROSS_CHAIN_PROTOCOL_EVM_INTERFACE.method}</code>. It accepts only a valid consumed
          authorization from <code>AbraxasPartnerEligibilityGate</code>. Local Foundry tests only.
        </p>
      </ContentCard>
      <ContentCard title="Solana interface">
        <p style={body}>
          Program <code>{CROSS_CHAIN_PROTOCOL_SOLANA_INTERFACE.program}</code>, instruction{" "}
          <code>{CROSS_CHAIN_PROTOCOL_SOLANA_INTERFACE.instruction}</code>. It consumes only a valid
          Authorization PDA from <code>abraxas_eligibility_gate</code>. Local ProgramTest only. The
          reference program id is not a live deployment.
        </p>
      </ContentCard>
      <ContentCard title="Presentation is not enough">
        <p style={body}>
          Reference server flows start with an audience-bound Eligibility Presentation request, Hosted
          Partner Flow, fresh consent, a partner-bound receipt, a mandatory public-receipt re-fetch,
          and then chain-attestation issuance bound to a verified <code>deployment_ref</code>. Browser
          input cannot select chain, contract, program, receipt, policy, action, signer, nonce, expiry,
          or entitlement.
        </p>
      </ContentCard>
      <ContentCard title="Local commands">
        <pre style={{ ...body, fontFamily: MONO, fontSize: "0.75rem", whiteSpace: "pre-wrap" }}>
{`# EVM (local Foundry)
cd contracts/evm-eligibility-verifier && forge test --match-contract AbraxasProtocolAccessTest

# Solana (local ProgramTest)
cargo test --manifest-path solana/abraxas-eligibility-gate/Cargo.toml --test protocol_access -- --nocapture

# TypeScript
npx vitest run lib/partner/crossChainProtocolAccess/crossChainProtocolAccess.test.ts`}
        </pre>
      </ContentCard>
      <ContentCard title="Server example">
        <pre style={{ ...body, fontFamily: MONO, fontSize: "0.72rem", whiteSpace: "pre-wrap" }}>
          {crossChainProtocolAccessServerExample()}
        </pre>
      </ContentCard>
      <ContentCard title="Where this connects">
        <p style={body}>
          <Link href="/docs/eligibility-presentation-protocol">Eligibility presentations</Link>
          {" · "}
          <Link href="/docs/hosted-partner-flow-handoff">Hosted Partner Flow</Link>
          {" · "}
          <Link href="/docs/portable-action-contract">Portable action contract</Link>
          {" · "}
          <Link href="/docs/evm-onchain-eligibility-gate">EVM gate</Link>
          {" · "}
          <Link href="/docs/solana-onchain-eligibility-gate">Solana gate</Link>
          {" · "}
          <Link href="/docs/onchain-gate-deployments">Verified deployments</Link>
          {" · "}
          <Link href="/docs/chain-attestation-signer-lifecycle">Signer lifecycle</Link>
          {" · "}
          <Link href="/docs/selective-disclosure">Selective disclosure</Link>
          {" · "}
          <Link href="/developers/integration-studio">Integration Studio</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
