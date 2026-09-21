"use client";

import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { ONCHAIN_VERIFIER_CONFORMANCE_DOCS } from "@/lib/partner/onchainVerifierConformance/contract";
import { onchainVerifierLaunchpadCard, onchainVerifierSafeState } from "@/lib/partner/onchainVerifierConformance/readiness";

const FONT = ABRAXAS_FONT_SANS;

export function OnchainVerifierConformanceCard({
  verifiedSandbox,
}: {
  verifiedSandbox?: boolean;
}) {
  const card = onchainVerifierLaunchpadCard(onchainVerifierSafeState({
    verifiedSandbox,
    vectorsReady: true,
  }));
  return (
    <ContentCard title="Verify your gate integration">
      <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
        After a verified sandbox deployment, prove the gate uses the exact Abraxas schema and bindings. Local CLI only. No browser deploy, register, or approve.
      </p>
      <ol style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, paddingLeft: "1.2rem" }}>
        {card.sequence.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <p role="status" style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700, margin: "0.7rem 0" }}>
        {card.safe_state.replace(/_/g, " ")}
      </p>
      <Link href={ONCHAIN_VERIFIER_CONFORMANCE_DOCS} style={{ fontFamily: FONT, fontSize: "0.78rem" }}>
        Verifier conformance docs
      </Link>
    </ContentCard>
  );
}
