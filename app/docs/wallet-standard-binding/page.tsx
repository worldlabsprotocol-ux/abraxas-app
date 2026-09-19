// FILE: app/docs/wallet-standard-binding/page.tsx
// Optional Wallet Standard binding. Not a wallet product. Not identity.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  WALLET_STANDARD_CONNECTOR_NOTICE,
  WALLET_STANDARD_NOT_IDENTITY,
  WALLET_STANDARD_NO_WALLET_PRODUCT,
  walletStandardBindingExample,
} from "@/lib/partner/walletStandard";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function WalletStandardBindingDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Wallet Standard binding"
        title="Optionally bind a wallet to one action contract"
        subtitle={`${WALLET_STANDARD_NOT_IDENTITY} ${WALLET_STANDARD_NO_WALLET_PRODUCT}`}
      />

      <ContentCard title="When to use it">
        <p style={body}>
          Use binding when a trading venue, payment, or membership check needs to know that the same
          self-custodial wallet still controls a later action. Do not use it as login, KYC, or a
          substitute for a signed eligibility receipt.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>{WALLET_STANDARD_CONNECTOR_NOTICE}</p>
      </ContentCard>

      <ContentCard title="Partner implementation">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {walletStandardBindingExample()}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Studio: <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          Venue adapter: <Link href="/docs/trading-venue">Trading venue adapter</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
