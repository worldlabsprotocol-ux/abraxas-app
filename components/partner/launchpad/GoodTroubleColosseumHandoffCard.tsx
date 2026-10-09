"use client";
// FILE: components/partner/launchpad/GoodTroubleColosseumHandoffCard.tsx
// Colosseum path: real hosted handoff on the guided Test step (not buried in developer details).

import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_SANDBOX_APPLICATION_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { HostedHandoffControls } from "@/components/partner/launchpad/HostedHandoffControls";

const FONT = ABRAXAS_FONT_SANS;

export function isGoodTroubleColosseumSandboxApp(input: {
  applicationId: string;
  partnerId: string;
  environment: string;
}): boolean {
  return input.partnerId === GOOD_TROUBLE_CANONICAL_PARTNER_ID
    && input.applicationId === GOOD_TROUBLE_SANDBOX_APPLICATION_ID
    && input.environment === "sandbox";
}

export function GoodTroubleColosseumHandoffCard({
  applicationId,
  partnerId,
}: {
  applicationId: string;
  partnerId: string;
}) {
  return (
    <ContentCard title="Good Trouble sandbox — physical device test">
      <p style={{
        fontFamily: FONT,
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
        lineHeight: 1.65,
        margin: "0 0 0.75rem",
      }}>
        Create a secure handoff, open the hosted URL on your Solana Seeker, complete self-attested age,
        consent, and Share, then return to Good Trouble. Partner verification must re-fetch the public receipt —
        callback query params never grant access.
      </p>
      <HostedHandoffControls applicationId={applicationId} partnerId={partnerId} />
    </ContentCard>
  );
}
