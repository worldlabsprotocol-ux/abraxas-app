// FILE: app/docs/solana-onchain-eligibility-gate/page.tsx
// Local/reference Solana eligibility gate. No live deployment claims.

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
          prefix, schema version 1 as a big-endian u64, then network, partner, policy, action, and subject hashes,
          issued/expiry timestamps, nonce, attestation id, environment, and signer key id. Total 372 bytes. The program
          requires an exact byte-for-byte match. It does not parse JSON and does not accept a browser{" "}
          <span style={{ fontFamily: MONO }}>allowed</span> flag.
        </p>
      </ContentCard>

      <ContentCard title="Accounts and PDA seeds">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
{`GateConfig PDA: ["gate_config", admin]
Authorization PDA: ["authorization", config, attestation_id]
Consumer authority PDA: ["consumer_authority"] (seeds::program = partner program)
Test result PDA (reference consumer): ["test_result", authorization]

Local/reference program IDs (not deployed):
gate ${LOCAL_SOLANA_GATE_PROGRAM_ID}
consumer ${LOCAL_SOLANA_CONSUMER_PROGRAM_ID}

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
          Devnet checklist for a human operator only: generate your own program keypair, set the dedicated attestation
          signer (not a receipt key), bind partner program ID plus policy/action hashes as admin, then deploy yourself.
          This repository does not include a deployed program ID, a devnet transaction, or a Mainnet claim.
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
