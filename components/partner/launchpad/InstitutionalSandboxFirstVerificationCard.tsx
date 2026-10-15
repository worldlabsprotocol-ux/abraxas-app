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
import type { InstitutionalActivationEvidence } from "@/lib/partner/launchpad/institutionalActivationMilestones";
import {
  INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF,
  INSTITUTIONAL_RECEIPT_VERIFY_HREF,
  INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
  INSTITUTIONAL_SANDBOX_STUDIO_HREF,
} from "@/lib/partner/launchpad/institutionalActivationEntry";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type OperationalHealth = {
  status: string;
  verification_successes: number;
  last_receipt_verified_at: string | null;
  technical_proof?: Array<{ stage: string; status: string }>;
  institutional_activation?: InstitutionalActivationEvidence;
};

function milestoneColor(status: string): string {
  if (status === "complete") return "#10B981";
  if (status === "failed") return "#F87171";
  if (status === "current") return "var(--accent)";
  if (status === "unavailable") return "var(--text-muted)";
  return "var(--text-secondary)";
}

export function InstitutionalSandboxFirstVerificationCard(input: {
  applicationId: string;
  journey: LaunchpadJourneyResolution | null;
  onNavigate: (stage: MerchantJourneyStageId) => void;
}) {
  const { applicationId, journey, onNavigate } = input;
  const [health, setHealth] = useState<OperationalHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/integration-health`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      setHealth((await res.json()) as OperationalHealth);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const activation = health?.institutional_activation;
  const verified = (health?.verification_successes ?? 0) > 0;
  const policyPinned = SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID;

  let nextLabel = "Create sandbox application";
  let nextDetail = "Provision a Launchpad application pinned to organization protocol eligibility.";
  let nextStage: MerchantJourneyStageId = "verify";

  if (activation?.needs_attention_reason) {
    nextLabel = "Review integration status";
    nextDetail = activation.needs_attention_reason;
    nextStage = journey?.primaryAction.stage ?? "test";
  } else if (journey?.connectComplete && journey.testAvailable) {
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

  const ttfv = activation?.time_to_first_independent_verify_quality === "measured"
    && activation.time_to_first_independent_verify_ms != null
    ? `${Math.round(activation.time_to_first_independent_verify_ms / 1000)}s from application create to first verified receipt`
    : "Unavailable until independent verification is recorded for this application.";

  return (
    <ContentCard title="Institutional sandbox activation">
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
          Integration status <strong>{journey?.statusLine ?? "Not started"}</strong>
        </div>
        <div>
          Time to first independent verify <strong>{ttfv}</strong>
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
      </div>

      {activation?.milestones?.length ? (
        <ol style={{ margin: "0.85rem 0 0", paddingLeft: "1.15rem", fontFamily: FONT, fontSize: "0.72rem" }}>
          {activation.milestones.map((milestone) => (
            <li key={milestone.id} style={{ marginBottom: "0.35rem", color: milestoneColor(milestone.status) }}>
              <strong>{milestone.label}</strong>
              <span style={{ color: "var(--text-muted)" }}> · {milestone.status}</span>
              <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>{milestone.detail}</div>
            </li>
          ))}
        </ol>
      ) : loading ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
          Loading activation evidence…
        </p>
      ) : (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
          Activation milestones unavailable. Refresh after completing a hosted verification attempt.
        </p>
      )}

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
        {SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE}
      </p>

      <div style={{ marginTop: "0.85rem", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: 10 }}>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, margin: "0 0 0.35rem" }}>Next action</p>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.65rem" }}>
          {nextDetail}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn size="sm" onClick={() => onNavigate(nextStage)}>
            {nextLabel}
          </Btn>
          <Link href={INSTITUTIONAL_SANDBOX_STUDIO_HREF} style={{ alignSelf: "center", fontFamily: FONT, fontSize: "0.72rem" }}>
            Policy fit planner
          </Link>
          <Link href={INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF} style={{ alignSelf: "center", fontFamily: FONT, fontSize: "0.72rem" }}>
            Independent verifier guide
          </Link>
          <Link href={INSTITUTIONAL_RECEIPT_VERIFY_HREF} style={{ alignSelf: "center", fontFamily: FONT, fontSize: "0.72rem" }}>
            Verify a receipt
          </Link>
          <Link href={INSTITUTIONAL_SANDBOX_HANDOFF_HREF} style={{ alignSelf: "center", fontFamily: FONT, fontSize: "0.72rem" }}>
            Customer handoff
          </Link>
          <Btn size="sm" variant="ghost" onClick={() => void loadHealth()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh evidence"}
          </Btn>
        </div>
      </div>
    </ContentCard>
  );
}
