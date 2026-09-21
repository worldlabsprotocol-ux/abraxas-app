// FILE: app/docs/onchain-gate-deployments/page.tsx
// Verified partner-owned gate registration. Not a deployment service.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { EVM_DEPLOYMENT_MANIFEST_FIELDS, SOLANA_DEPLOYMENT_MANIFEST_FIELDS, ONCHAIN_GATE_SAFE_STATES } from "@/lib/partner/onchainGateDeployments/contract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function OnchainGateDeploymentsDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Onchain"
        title="Verified onchain gate deployments"
        subtitle="You deploy and own the gate. Abraxas verifies that exact configuration, then issues chain-verifiable eligibility attestations bound only to the approved deployment ref."
      />

      <ContentCard title="What this is not">
        <p style={body}>
          Abraxas does not deploy, upgrade, call, fund, or broadcast to your contract or program.
          Browser values are untrusted. RPC URLs, keys, receipts, claims, and transaction payloads are never stored or returned.
        </p>
      </ContentCard>

      <ContentCard title="EVM registration">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          <li>Deploy AbraxasPartnerEligibilityGate yourself (local Anvil or your operator RPC — never through Abraxas).</li>
          <li>Compute runtime bytecode hash and the public config digest (chain id, gate address, partner/policy/action/environment/signer/subject hashes).</li>
          <li>Submit the exact EVM manifest from Partner Launchpad while signed in. Fields: {EVM_DEPLOYMENT_MANIFEST_FIELDS.join(", ")}.</li>
          <li>The server checks tenant/app ownership, pinned policy/version/action, approved network posture, and supported gate type.</li>
          <li>A server-only RPC adapter reads code hash and config digest. No adapter means deployment_verification_unavailable. Unverified manifests are never accepted.</li>
          <li>Chain attestation issuance must send the opaque deployment_ref. EIP-712 verifyingContract comes only from the verified record.</li>
        </ol>
      </ContentCard>

      <ContentCard title="Solana registration">
        <ol style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.45rem" }}>
          <li>Deploy your copy of the eligibility gate program yourself. Abraxas does not deploy it.</li>
          <li>Submit program ID, GateConfig PDA, program digest, and config digest with the Solana manifest. Fields: {SOLANA_DEPLOYMENT_MANIFEST_FIELDS.join(", ")}.</li>
          <li>A server-only RPC adapter checks program ID, PDA, and digest. Local ProgramTest fixtures are for tests only.</li>
          <li>Issuance binds the Solana program/config from the verified deployment ref, never from a partner request field.</li>
        </ol>
      </ContentCard>

      <ContentCard title="Lifecycle and issuance">
        <p style={body}>
          Submitted → verified sandbox → needs correction → production review required → revoked.
          Only verified sandbox deployments receive sandbox chain attestations.
          Only a separately reviewed production deployment receives production chain attestations.
          Changed code hash, config digest, network, partner, policy, action, signer key, or a revoked row blocks issuance.
        </p>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Launchpad safe states: {ONCHAIN_GATE_SAFE_STATES.join(", ")}.
        </p>
      </ContentCard>

      <ContentCard title="Network posture">
        <p style={body}>
          evm_sandbox (31337) and solana_devnet follow the network registry. evm_mainnet and solana_mainnet stay on Production review.
          arc_circle_testnet may be registered only after an approved network configuration and a server RPC adapter exist.
          arc_circle_mainnet remains disabled. This path does not add Circle wallet, USDC, settlement, or execution.
        </p>
      </ContentCard>

      <ContentCard title="Related">
        <p style={body}>
          <Link href="/docs/evm-onchain-eligibility-gate">EVM gate</Link>
          {" · "}
          <Link href="/docs/solana-onchain-eligibility-gate">Solana gate</Link>
          {" · "}
          <Link href="/docs/chain-verifiable-attestations">Chain attestations</Link>
          {" · "}
          <Link href="/developers/launchpad">Partner Launchpad</Link>
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
