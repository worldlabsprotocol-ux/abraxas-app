"use client";
// FILE: components/partner/launchpad/InstitutionalSandboxFirstVerificationCard.tsx

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess/contract";
import type { LaunchpadJourneyResolution, MerchantJourneyStageId } from "@/lib/partner/launchpad/journeyState";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type OperationalHealth = {
  status: string;
  verification_successes: number;
  last_receipt_verified_at: string | null;
  technical_proof?: Array<{ stage: string; status: string }>;
};

export function InstitutionalSandboxFirstVerificationCard(input: {
  applicationId: string;
  journey: LaunchpadJourneyResolution | null;
  onNavigate: (stage: MerchantJourneyStageId) => void;
}) {
  const { applicationId, journey, onNavigate } = input;
  const [health, setHealth] = useState<OperationalHealth | null>(null);

  const loadHealth = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/integration-health`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return;
    setHealth((await res.json()) as OperationalHealth);
  }, [applicationId]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const verified = (health?.verification_successes ?? 0) > 0;
  const policyPinned = SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID;

  let nextLabel = "Choose verification policy";
  let nextDetail = "Create a sandbox app pinned to organization protocol eligibility.";
  let nextStage: MerchantJourneyStageId = "verify";

  if (journey?.connectComplete && journey.testAvailable) {
    nextLabel = "Run hosted verification test";
    nextDetail = "Send a synthetic holder through hosted authorization, then verify the signed decision receipt on your server.";
    nextStage = "test";
  } else if (journey?.connectComplete) {
    nextLabel = "Finish integration files";
    nextDetail = "Generate starter kit files and deploy them before the first verification attempt.";
    nextStage = "connect";
  } else if (journey && journey.state !== "policy_selected") {
    nextLabel = journey.primaryAction.label;
    nextDetail = journey.primaryAction.detail;
    nextStage = journey.primaryAction.stage;
  }

  const consentObserved = health?.technical_proof?.some(
    (row) => row.stage === "Holder consented" && row.status === "observed",
  );

  return (
    <ContentCard title="Institutional first verification (sandbox)">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Self-service path for engineering teams verifying narrow eligibility without receiving identity evidence.
        Production issuer signing stays unavailable until founder authorization.
      </p>

      <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.75rem", fontFamily: FONT, fontSize: "0.74rem" }}>
        <div>
          Environment <strong>Sandbox</strong> (test only)
        </div>
        <div>
          Supported policy <code style={{ fontFamily: MONO }}>{policyPinned}</code>
        </div>
        <div>
          Integration status <strong>{journey?.statusLine ?? "Select a policy to begin"}</strong>
        </div>
        <div>
          First independent verify{" "}
          <strong style={{ color: verified ? "#10B981" : "var(--text-primary)" }}>
            {verified ? "Observed" : "Not yet recorded"}
          </strong>
          {health?.last_receipt_verified_at && (
            <span style={{ color: "var(--text-muted)" }}>
              {" "}
              (last at {new Date(health.last_receipt_verified_at).toLocaleString()})
            </span>
          )}
        </div>
        <div>
          Holder consent event{" "}
          <strong>{consentObserved ? "Observed" : "Unavailable until first hosted flow completes"}</strong>
        </div>
      </div>

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
        {SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE}
      </p>

      <div style={{ marginTop: "0.85rem", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: 10 }}>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, margin: "0 0 0.35rem" }}>Next action</p>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.65rem" }}>
          {nextDetail}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn size="sm" onClick={() => onNavigate(nextStage)} disabled={!journey && nextStage !== "verify"}>
            {nextLabel}
          </Btn>
          <Link href="/developers/integration-studio?action=org_protocol_access&category=institutional_eligibility&environment=sandbox" style={{ alignSelf: "center", fontFamily: FONT, fontSize: "0.72rem" }}>
            Open policy fit planner
          </Link>
          <Btn size="sm" variant="ghost" onClick={() => void loadHealth()}>Refresh evidence</Btn>
        </div>
      </div>
    </ContentCard>
  );
}
