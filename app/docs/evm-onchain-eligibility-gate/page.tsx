// FILE: app/docs/evm-onchain-eligibility-gate/page.tsx
// Partner-owned EVM eligibility gate. No live, Arc, or Circle deployment claims.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION } from "@/lib/partner/chainAttestation/contract";
import { evmOnchainEligibilityGateExample, EVM_GATE_LOCAL_COMMANDS } from "@/lib/partner/evmGate/examples";
import { EVM_GATE_ENTRY_POINTS } from "@/lib/partner/evmGate/abi";
import { EVM_GATE_MANIFEST_FIELDS } from "@/lib/partner/evmGate/manifest";
import { EVM_GATE_READINESS_STATES } from "@/lib/partner/evmGate/readiness";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function EvmOnchainEligibilityGateDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · EVM"
        title="EVM onchain eligibility gate"
        subtitle="You deploy your own gate. Abraxas issues a short-lived EIP-712 authorization. Your contract consumes it once and decides whether a named action may proceed."
      />

      <ContentCard title="Local sequence">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          <li>Holder completes private Partner Flow verification.</li>
          <li>Your server verifies the current public receipt.</li>
          <li>Your backend calls POST /api/v1/chain-attestations with a server API key.</li>
          <li>Abraxas signs the canonical Chain Eligibility Attestation (EIP-712 name {EIP712_DOMAIN_NAME}, version {EIP712_DOMAIN_VERSION}).</li>
          <li>Your transaction calls consumeEligibility on your gate. The nonce is marked consumed onchain.</li>
          <li>Your partner consumer records that the named action may proceed. No token transfer, approval, swap, payment, or mint.</li>
        </ol>
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: "0.85rem 0 0" }}>
          {EVM_GATE_LOCAL_COMMANDS}
        </pre>
        <p style={{ ...body, marginTop: "0.75rem" }}>
          RPC URL and deployer keys are supplied by the human operator at deploy time. They are not stored in this repository or Vercel env. CREATE2 prediction is for your factory; Abraxas does not deploy the contract.
        </p>
      </ContentCard>

      <ContentCard title="ABI entry points">
        <p style={{ ...body, fontFamily: MONO }}>{EVM_GATE_ENTRY_POINTS.join(", ")}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          AuthorizationConsumed emits nonce, attestation id, and partner/policy/action hashes only.
        </p>
      </ContentCard>

      <ContentCard title="Deployment manifest">
        <p style={body}>
          Status is local_test or partner_deployed. Never live. Fields: {EVM_GATE_MANIFEST_FIELDS.join(", ")}.
        </p>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Launchpad readiness: {EVM_GATE_READINESS_STATES.join(", ")}. Browser input is not authority.
        </p>
      </ContentCard>

      <ContentCard title="Network posture">
        <p style={body}>
          evm_sandbox is the local Foundry/Anvil target. evm_mainnet stays on Production review. Arc/Circle testnet is a future compatible EVM target in the registry without a published chain ID in this kit. Arc/Circle Mainnet remains disabled. Circle settlement and USDC transfers are a separate path.
        </p>
      </ContentCard>

      <ContentCard title="Server example">
        <pre style={{ fontFamily: MONO, fontSize: "0.7rem", overflowX: "auto", padding: "1rem", borderRadius: 10, border: "1px solid var(--border)", margin: 0 }}>
          {evmOnchainEligibilityGateExample()}
        </pre>
      </ContentCard>

      <ContentCard title="Related">
        <p style={body}>
          <Link href="/docs/chain-verifiable-attestations">Chain-verifiable attestations</Link>
          {" · "}
          <Link href="/docs/evm-partner-adapter">EVM partner adapter</Link>
          {" · "}
          <Link href="/docs/circle-arc-testnet">Circle Arc testnet settlement</Link>
          {" · "}
          <Link href="/docs/chain-attestation-signer-lifecycle">Signer lifecycle</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
