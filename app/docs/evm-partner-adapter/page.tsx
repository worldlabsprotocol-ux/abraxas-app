// FILE: app/docs/evm-partner-adapter/page.tsx
// Public EVM partner eligibility adapter docs. Preflight only. Never executes.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  EVM_FLOW,
  EVM_LIVE_INTEGRATION_REQUIREMENTS,
  EVM_NO_EXECUTION_BOUNDARY,
  EVM_NOT_A_CHAIN_PRODUCT,
  EVM_PARTNER_ACTION_TYPES,
  EVM_PARTNER_ARCHITECTURE_DIAGRAM,
  EVM_PARTNER_TYPE_SCOPES,
  EVM_PRIVACY_CONTRACT,
  EVM_VERIFICATION_REUSE,
  EVM_WALLET_BINDING_OUT_OF_SCOPE,
  evmPartnerServerExample,
} from "@/lib/partner/evm";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function EvmPartnerAdapterDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · EVM partner adapter"
        title="Ask Abraxas whether one named protocol action may proceed"
        subtitle={`${EVM_NOT_A_CHAIN_PRODUCT} ${EVM_NO_EXECUTION_BOUNDARY}`}
      />

      <ContentCard title="Architecture">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {EVM_PARTNER_ARCHITECTURE_DIAGRAM}
        </pre>
        <p style={{ ...body, marginTop: "0.85rem" }}>{EVM_FLOW}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{EVM_VERIFICATION_REUSE}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{EVM_WALLET_BINDING_OUT_OF_SCOPE}</p>
      </ContentCard>

      <ContentCard title="Supported actions">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {EVM_PARTNER_ACTION_TYPES.map((action) => (
            <li key={action}>
              <strong style={{ fontFamily: MONO }}>{action}</strong>
              {" in "}
              <span style={{ fontFamily: MONO }}>{EVM_PARTNER_TYPE_SCOPES[action]}</span>
            </li>
          ))}
        </ul>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Arbitrary contract methods, calldata, chain IDs, recipient addresses, token amounts,
          transaction payloads, and wallet fields are rejected.
        </p>
      </ContentCard>

      <ContentCard title="What allowed means">
        <p style={body}>
          The client result is only allowed, reason, action_binding, and expires_at. Allowed means
          the partner backend may perform its own named action. It is never a transaction approval,
          signature, gas authorization, transfer, or execution. No specific EVM chain, RPC, wallet,
          protocol, or Mainnet deployment is live from this adapter.
        </p>
      </ContentCard>

      <ContentCard title="Privacy contract">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {EVM_PRIVACY_CONTRACT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Canonical disclosure: <Link href="/docs/selective-disclosure">Selective disclosure</Link>
        </p>
      </ContentCard>

      <ContentCard title="Server side preflight">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {evmPartnerServerExample()}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Studio: <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          Kit: <Link href="/docs/integration-kit">Partner Integration Kit</Link>
          {" · "}
          Portable contract: <Link href="/docs/portable-action-contract">Portable action contract</Link>
          {" · "}
          Wallet control: <Link href="/docs/evm-wallet-binding">EVM wallet-control binding</Link>
        </p>
      </ContentCard>

      <ContentCard title="Remaining Mainnet requirements">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {EVM_LIVE_INTEGRATION_REQUIREMENTS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </ContentCard>
    </RedesignPage>
  );
}
