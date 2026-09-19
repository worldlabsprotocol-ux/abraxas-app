// FILE: app/docs/solana/page.tsx
// Public Solana integration docs. Adapter wraps the Partner Integration Kit.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  SOLANA_ARCHITECTURE_DIAGRAM,
  SOLANA_NO_FUNDS_BOUNDARY,
  SOLANA_PRIVACY_CONTRACT,
  SOLANA_VERIFICATION_REUSE,
  solanaServerVerifyExample,
} from "@/lib/partner/solana";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function SolanaIntegrationDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Solana integration"
        title="Verify eligibility, then bind a Solana partner action"
        subtitle="A Solana partner starts an Abraxas policy request, verifies the signed receipt on the server, and receives only allow or deny. This is not a token, wallet, or trading product."
      />

      <ContentCard title="Architecture">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {SOLANA_ARCHITECTURE_DIAGRAM}
        </pre>
        <p style={{ ...body, marginTop: "0.85rem" }}>{SOLANA_VERIFICATION_REUSE}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{SOLANA_NO_FUNDS_BOUNDARY}</p>
      </ContentCard>

      <ContentCard title="Privacy contract">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          {SOLANA_PRIVACY_CONTRACT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="Server side verification">
        <pre style={{ fontFamily: MONO, fontSize: "0.67rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)" }}>
          {solanaServerVerifyExample()}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          Kit docs: <Link href="/docs/integration-kit">Partner Integration Kit</Link>
          {" · "}
          Reference: <Link href="/examples/solana-partner">Solana claim access example</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
