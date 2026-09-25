// FILE: app/docs/testnet-gate-deployment/page.tsx
// Human-operated testnet gate kit. Not a hosted deployer.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  TESTNET_GATE_COMMANDS,
  INSTITUTIONAL_TESTNET_GATE_COMMANDS,
  TESTNET_GATE_NOTICE,
  INSTITUTIONAL_TESTNET_GATE_NOTICE,
  TESTNET_GATE_NO_FUNDS,
  TESTNET_GATE_ENV_NAMES,
  APPROVED_EVM_TESTNET_CHAIN_ID,
} from "@/lib/partner/testnetGateDeploymentKit/contract";
import { EVM_TESTNET_TEST_PLAN, SOLANA_DEVNET_TEST_PLAN, INSTITUTIONAL_TESTNET_TEST_PLAN } from "@/lib/partner/testnetGateDeploymentKit/testPlans";
import { SOLANA_GATE_V2_RELEASE } from "@/lib/partner/onchainGateDeployments/solanaV2Release";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function TestnetGateDeploymentDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Testnet"
        title="Human-operated testnet gate deployment"
        subtitle={TESTNET_GATE_NOTICE}
      />
      <ContentCard title="Reviewed Solana V2 artifact">
        <p style={body}>
          The reference gate artifact <code>{SOLANA_GATE_V2_RELEASE.artifact_id}</code> was deployed to Solana devnet at{" "}
          <code>{SOLANA_GATE_V2_RELEASE.program_id}</code>. Its on-chain ELF matches reviewed keccak{" "}
          <code>{SOLANA_GATE_V2_RELEASE.program_data_digest}</code> and SHA-256{" "}
          <code>{SOLANA_GATE_V2_RELEASE.elf_sha256}</code>. The reviewed devnet GateConfig and protocol-access consumer
          configuration passed exact postchecks, and the institutional sandbox deployment is registered. A completed
          authorize-and-consume transaction has not yet been demonstrated. Independent operators
          must still follow <code>solana/abraxas-eligibility-gate/REPRODUCIBLE_RELEASE.md</code> and verify their own deployment.
        </p>
      </ContentCard>
      <ContentCard title="Boundary">
        <p style={body}>{TESTNET_GATE_NO_FUNDS}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          No wallet private key, RPC URL, raw transaction, or account data is stored in the repo, Vercel, browser, logs, Studio, or these docs. Environment names only.
        </p>
      </ContentCard>
      <ContentCard title="CLI">
        <pre style={{ ...body, fontFamily: MONO, fontSize: "0.78rem", whiteSpace: "pre-wrap" }}>
          {[...TESTNET_GATE_COMMANDS, ...INSTITUTIONAL_TESTNET_GATE_COMMANDS].map((row) => `npx tsx scripts/abraxas-gate.ts ${row}`).join("\n")}
        </pre>
        <p style={{ ...body, marginTop: "0.5rem" }}>
          Plan is a planning envelope only. Use <code>validate-plan</code> before a human deploy. Deploy requires <code>--confirm</code> and never broadcasts. The operator deploys with a local Solana toolchain, then verify/register a post-deploy registry manifest against chain observation. A reusable institutional gate is not bound to one organization or actor.
        </p>
      </ContentCard>
      <ContentCard title="Approved networks">
        <p style={body}>
          Solana devnet and EVM Sepolia (published chain ID {APPROVED_EVM_TESTNET_CHAIN_ID}). Arc/Circle testnet stays unselected until the reviewed registry publishes a chain ID. Arc/Circle Mainnet remains disabled. Production/Mainnet networks are rejected.
        </p>
      </ContentCard>
      <ContentCard title="Environment names">
        <p style={{ ...body, fontFamily: MONO, fontSize: "0.78rem" }}>
          {Object.values(TESTNET_GATE_ENV_NAMES).join(" · ")}
        </p>
      </ContentCard>
      <ContentCard title="Solana human test plan">
        <ol style={{ ...body, paddingLeft: "1.2rem" }}>
          {SOLANA_DEVNET_TEST_PLAN.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <p style={{ ...body, marginTop: "0.5rem" }}>Expected: {SOLANA_DEVNET_TEST_PLAN.expected_safe_outputs.join("; ")}.</p>
      </ContentCard>
      <ContentCard title="Institutional V2 testnet">
        <p style={body}>{INSTITUTIONAL_TESTNET_GATE_NOTICE}</p>
        <ol style={{ ...body, paddingLeft: "1.2rem" }}>
          {INSTITUTIONAL_TESTNET_TEST_PLAN.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </ContentCard>
      <ContentCard title="EVM human test plan">
        <ol style={{ ...body, paddingLeft: "1.2rem" }}>
          {EVM_TESTNET_TEST_PLAN.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <p style={{ ...body, marginTop: "0.5rem" }}>Expected: {EVM_TESTNET_TEST_PLAN.expected_safe_outputs.join("; ")}.</p>
      </ContentCard>
      <ContentCard title="Related">
        <p style={body}>
          <Link href="/docs/onchain-gate-deployments">Verified deployments</Link>
          {" · "}
          <Link href="/docs/cross-chain-protocol-access">Protocol access</Link>
          {" · "}
          <Link href="/docs/chain-attestation-signer-lifecycle">Signer lifecycle</Link>
        </p>
      </ContentCard>
      <PublicJourneyNextSteps />
    </RedesignPage>
  );
}

