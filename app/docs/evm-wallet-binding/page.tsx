// FILE: app/docs/evm-wallet-binding/page.tsx
// Optional EVM wallet-control proof. Message only. Not login or custody.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  EVM_WALLET_BINDING_ARCHITECTURE,
  EVM_WALLET_MIGRATION_PLAN,
  EVM_WALLET_MESSAGE_PROOF_ONLY,
  EVM_WALLET_NOT_IDENTITY,
  EVM_WALLET_NO_TRANSACTION,
  EVM_WALLET_SIGNING_LIBRARY,
  EVM_WALLET_SIGNING_STANDARD,
  evmWalletBindingExample,
} from "@/lib/partner/evmWalletBinding";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function EvmWalletBindingDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · EVM wallet-control binding"
        title="Prove control of one EVM address for one action"
        subtitle={`${EVM_WALLET_NOT_IDENTITY} ${EVM_WALLET_NO_TRANSACTION}`}
      />

      <ContentCard title="When to use it">
        <p style={body}>
          Add this step only when an EVM partner action sets wallet binding to optional or required.
          Absence does not deny a valid optional action. Required fails closed without a current matching
          binding. Do not reuse Solana Wallet Standard assumptions.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>{EVM_WALLET_MESSAGE_PROOF_ONLY}</p>
        <p style={{ ...body, marginTop: "0.6rem" }}>
          Signing standard: <code>{EVM_WALLET_SIGNING_STANDARD}</code>
          {" · "}
          Library: <code>{EVM_WALLET_SIGNING_LIBRARY}</code>
        </p>
      </ContentCard>

      <ContentCard title="Architecture">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {EVM_WALLET_BINDING_ARCHITECTURE}
        </pre>
      </ContentCard>

      <ContentCard title="Durable store migration">
        <p style={body}>
          This public feature requires <code>{EVM_WALLET_MIGRATION_PLAN.file}</code> on both DEMO
          and Production before challenge or bind can succeed. Missing schema fails closed with
          {" "}<code>store_unavailable</code>. There is no in-process fallback.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>
          Apply DEMO first, then Production, as separate operator steps. Do not auto-apply from Vercel.
          {EVM_WALLET_MIGRATION_PLAN.stores_only}
        </p>
      </ContentCard>

      <ContentCard title="Partner implementation">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", maxWidth: "100%", boxSizing: "border-box", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {evmWalletBindingExample()}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Studio: <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          EVM adapter: <Link href="/docs/evm-partner-adapter">EVM partner adapter</Link>
        </p>
        <PublicJourneyNextSteps />
      </ContentCard>
    </RedesignPage>
  );
}
