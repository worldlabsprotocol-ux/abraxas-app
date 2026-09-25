// FILE: app/docs/solana-onchain-eligibility-gate/page.tsx
// Reviewed Solana devnet gate and consumer; no Mainnet or executed access claim.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { SOLANA_ATTESTATION_MESSAGE_PREFIX } from "@/lib/partner/chainAttestation/contract";
import { solanaOnchainEligibilityGateExample } from "@/lib/partner/chainAttestation/examples";
import {
  LOCAL_SOLANA_CONSUMER_PROGRAM_ID,
  LOCAL_SOLANA_GATE_PROGRAM_ID,
  SOLANA_GATE_DEPLOYMENT_NOTICE,
  SOLANA_ONCHAIN_GATE_FLOW,
} from "@/lib/partner/chainAttestation/solanaGate";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function SolanaOnchainEligibilityGateDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Solana"
        title="Solana onchain eligibility gate"
        subtitle="A partner-owned program verifies a short-lived Abraxas authorization and consumes it once. Abraxas remains the policy layer. Your program remains the executor."
      />

      <ContentCard title="How it works">
        <p style={body}>{SOLANA_ONCHAIN_GATE_FLOW}</p>
        <p style={{ ...body, marginTop: "0.75rem" }}>{SOLANA_GATE_DEPLOYMENT_NOTICE}</p>
      </ContentCard>

      <ContentCard title="Canonical message">
        <p style={body}>
          Prefix <span style={{ fontFamily: MONO }}>{SOLANA_ATTESTATION_MESSAGE_PREFIX}</span>, then keccak of that
          prefix, schema version 2 as a big-endian u64, then network, partner, policy, action, and subject hashes,
          issued/expiry timestamps, nonce, attestation id, environment, signer key id, and opaque organization, actor,
          and institutional result-category commitments. Total 468 bytes. Legacy 372-byte V1 messages are rejected.
          The program requires an exact byte-for-byte match. It does not parse JSON and does not accept a browser{" "}
          <span style={{ fontFamily: MONO }}>allowed</span> flag.
        </p>
      </ContentCard>

      <ContentCard title="Accounts and PDA seeds">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
{`GateConfig PDA: ["gate_config", admin]
Authorization PDA: ["authorization", config, attestation_id]
Consumer authority PDA: ["consumer_authority"] (seeds::program = partner program)
Protocol config PDA: ["protocol_access_config", config]
Protocol entitlement PDA: ["protocol_access", protocol_config, subject_hash, organization_commitment]

Reviewed gate on devnet: ${LOCAL_SOLANA_GATE_PROGRAM_ID}
Protocol-access consumer on devnet: ${LOCAL_SOLANA_CONSUMER_PROGRAM_ID}
GateConfig PDA: 53wiHMzFX9GttuVFQyQTvJGw9XvQmBbTcsGbwXQyk3D6
Protocol config PDA: BPYeZySvW4k5GKoUnuXi5cPYhq8J3AcZB9tA8mLsbyYL
Reviewed config digest: 0xdccb2101a22ce8affbcde3b5923cea06ffe6225ceb72f368e83ff796cc1c6103

Stored on Authorization: hashed partner/policy/action binding, expiry, consumed/revoked, opaque attestation_ref.
Never stored: receipts, evidence, signatures, wallets beyond the required subject hash, provider payloads.`}
        </pre>
      </ContentCard>

      <ContentCard title="Local commands">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
{`cd solana/abraxas-eligibility-gate
cargo test --workspace
# Optional with a full Anchor toolchain:
# anchor build   # Anchor 0.30.1
# anchor test`}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          The reviewed reference gate ELF was deployed to devnet at slot 502739924 and dumped back from chain with matching
          keccak and SHA-256 digests. Its transaction is{" "}
          <a href="https://explorer.solana.com/tx/51Xhh2Zuj57B4C1kJmH7XVM222u7pmHoTX9YU7iwcBmdA3kTU6rAQW2Z7hkcFUSu9BEg9moLSDZLUJ4bg7CDFvSL?cluster=devnet">
            51Xhh2…CDFvSL
          </a>. The consumer is deployed, both configuration PDAs passed exact postchecks, and the sandbox gate
          is registered for institutional V2 attestations. A successful on-chain authorize, consume, and replay-denial
          sequence remains to be demonstrated. No Mainnet claim.
        </p>
      </ContentCard>

      <ContentCard title="Server example">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {solanaOnchainEligibilityGateExample()}
        </pre>
      </ContentCard>

      <ContentCard title="Related">
        <p style={body}>
          Off-chain Solana adapter (no funds):{" "}
          <Link href="/docs/solana">/docs/solana</Link>. Chain attestation encoding:{" "}
          <Link href="/docs/chain-verifiable-attestations">/docs/chain-verifiable-attestations</Link>.
          Signer rotation:{" "}
          <Link href="/docs/chain-attestation-signer-lifecycle">/docs/chain-attestation-signer-lifecycle</Link>.
        </p>
      </ContentCard>
    </RedesignPage>
  );
}

