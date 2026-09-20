// FILE: app/docs/multichain-mainnet-readiness/page.tsx
// Multi-chain Mainnet readiness. Verify and preflight only. Never execute.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { NETWORK_CAPABILITY_NOTICE, publicNetworkMatrix } from "@/lib/partner/networkCapability";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function MultichainMainnetReadinessDocsPage() {
  const matrix = publicNetworkMatrix();
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Networks"
        title="Mainnet multi-chain readiness"
        subtitle={NETWORK_CAPABILITY_NOTICE}
      />

      <ContentCard title="Canonical integration">
        <p style={body}>
          The universal partner backend remains HTTPS: hosted verification, server-side public
          receipt checks, and signed webhooks. Partners run their own chain or venue execution.
          Abraxas verifies policy-bound results and preflights one named action. It is not a
          custodian, exchange, broker, wallet, order router, token issuer, or automatic executor.
        </p>
      </ContentCard>

      <ContentCard title="Status matrix">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {matrix.map((row) => (
            <div key={row.network_id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem" }}>
              <strong style={{ fontFamily: FONT }}>{row.display_label}</strong>
              <p style={{ ...body, marginTop: "0.35rem", fontFamily: MONO, fontSize: "0.75rem" }}>
                {row.network_id} · {row.ecosystem} · {row.environment} · {row.status.replace(/_/g, " ")} · live: never
              </p>
              <p style={{ ...body, marginTop: "0.35rem" }}>{row.posture}</p>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="What must exist before a Mainnet action">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          <li>Reviewed Production access for the Launchpad app (request is not approval, keys, or activation).</li>
          <li>The network registry entry must be configured and not disabled. Operators must supply any chain credentials outside this product.</li>
          <li>The named action must be supported on that network.</li>
          <li>A current public receipt and durable nonce/replay controls.</li>
          <li>A partner-controlled execution integration. Abraxas never holds RPC URLs, API keys, wallet IDs, entity secrets, or transaction payloads in this registry.</li>
        </ul>
      </ContentCard>

      <ContentCard title="Related">
        <p style={body}>
          <Link href="/docs/portable-action-contract">Portable action contract</Link>
          {" · "}
          <Link href="/docs/starter-kit">Starter kits</Link>
          {" · "}
          <Link href="/developers/integration-studio">Integration Studio</Link>
          {" · "}
          <Link href="/docs/circle-arc-testnet">Arc / Circle testnet</Link>
          {" · "}
          <Link href="/docs/solana">Solana</Link>
          {" · "}
          <Link href="/docs/evm-partner-adapter">EVM partner adapter</Link>
          {" · "}
          <Link href="/docs/trading-venue">Trading venue</Link>
          {" · "}
          <Link href="/docs/payment-authorization">Payment authorization</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}
