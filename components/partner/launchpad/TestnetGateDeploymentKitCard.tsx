"use client";

import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { TESTNET_GATE_SAFE_STATES, TESTNET_GATE_DOCS } from "@/lib/partner/testnetGateDeploymentKit/contract";
import { testnetKitLaunchpadCard, testnetKitSafeState } from "@/lib/partner/testnetGateDeploymentKit/readiness";

const FONT = ABRAXAS_FONT_SANS;

export function TestnetGateDeploymentKitCard({
  planned,
  verified,
}: {
  planned?: boolean;
  verified?: boolean;
}) {
  const state = testnetKitSafeState({ planned, verified });
  const card = testnetKitLaunchpadCard(state);
  return (
    <ContentCard title="Testnet gate deployment kit">
      <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
        Human-operated CLI for Solana devnet and EVM Sepolia, including the V2 institutional gate. Status is safe copy only. There is no deploy button in the browser. Not Utila, live KYB, Arc, or Mainnet.
      </p>
      <ol style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, paddingLeft: "1.2rem" }}>
        {card.sequence.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <p role="status" style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, margin: "0.7rem 0" }}>
        {card.safe_state.replace(/_/g, " ")}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
        States: {TESTNET_GATE_SAFE_STATES.join(", ")}.
      </p>
      <Link href={TESTNET_GATE_DOCS} style={{ fontFamily: FONT, fontSize: "0.78rem" }}>
        Testnet deployment docs
      </Link>
    </ContentCard>
  );
}
