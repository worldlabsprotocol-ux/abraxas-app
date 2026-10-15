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
import {
  INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF,
  INSTITUTIONAL_RECEIPT_VERIFY_HREF,
  INSTITUTIONAL_SANDBOX_HANDOFF_HREF,
} from "@/lib/partner/launchpad/institutionalActivationEntry";
import {
  currentActivationStageLabel,
  deriveInstitutionalCardEvidenceState,
  formatTimeToFirstIndependentVerify,
  independentVerificationObserved,
  integrationHealthErrorMessage,
  parseOperationalHealthPayload,
  resolveInstitutionalCardNextAction,
  type IntegrationHealthLoadState,
  type OperationalHealthPayload,
} from "@/lib/partner/launchpad/institutionalSandboxFirstVerificationCardState";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const summaryLabel: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  margin: 0,
};

const summaryValue: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.92rem",
  fontWeight: 700,
  color: "var(--text-primary)",
  margin: "0.2rem 0 0",
  lineHeight: 1.35,
};

function milestoneColor(status: string): string {
  if (status === "complete") return "#10B981";
  if (status === "failed") return "#F87171";
  if (status === "current") return "var(--accent)";
  if (status === "unavailable") return "var(--text-muted)";
  return "var(--text-secondary)";
}

export async function fetchInstitutionalIntegrationHealth(
  applicationId: string,
): Promise<IntegrationHealthLoadState> {
  try {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/integration-health`, {
      credentials: "include",
      cache: "no-store",
    });
    const body: unknown = await res.json().catch(() => null);
    const parsed = parseOperationalHealthPayload(body);
    if (!res.ok || !parsed) {
      const err = integrationHealthErrorMessage({
        httpStatus: res.ok ? null : res.status,
        body,
        networkError: false,
      });
      if (err.sessionExpired) {
        return { kind: "session_expired", message: err.message };
      }
      return {
        kind: "error",
        message: err.message,
        httpStatus: res.ok ? null : res.status,
        retryable: err.retryable,
      };
    }
    return { kind: "ready", health: parsed };
  } catch {
    const err = integrationHealthErrorMessage({ httpStatus: null, body: null, networkError: true });
    return {
      kind: "error",
      message: err.message,
      httpStatus: null,
      retryable: err.retryable,
    };
  }
}

export function InstitutionalSandboxFirstVerificationCard(input: {
  applicationId: string;
  journey: LaunchpadJourneyResolution | null;
  onNavigate: (stage: MerchantJourneyStageId) => void;
}) {
  const { applicationId, journey, onNavigate } = input;
  const [loadState, setLoadState] = useState<IntegrationHealthLoadState>({ kind: "idle" });

  const loadHealth = useCallback(async () => {
    setLoadState({ kind: "loading" });
    setLoadState(await fetchInstitutionalIntegrationHealth(applicationId));
  }, [applicationId]);

  useEffect(() => {
    setLoadState({ kind: "idle" });
    void loadHealth();
  }, [applicationId, loadHealth]);

  const health: OperationalHealthPayload | null = loadState.kind === "ready" ? loadState.health : null;
  const activation = health?.institutional_activation;
  const evidenceState = deriveInstitutionalCardEvidenceState(loadState);
  const verified = independentVerificationObserved(health);
  const nextAction = resolveInstitutionalCardNextAction({ journey, activation });
  const stageLabel = currentActivationStageLabel(activation, journey);
  const ttfv = formatTimeToFirstIndependentVerify(activation);
  const policyPinned = SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID;
  const loading = evidenceState === "loading";

  return (
    <ContentCard title="Institutional sandbox activation">
      <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.65, marginTop: 0 }}>
        Verify organization protocol eligibility in sandbox. You receive scoped decision receipts, not identity evidence.
        Production issuer signing stays unavailable until founder authorization.
      </p>

      {(loadState.kind === "error" || loadState.kind === "session_expired") && (
        <div
          role="alert"
          style={{
            marginTop: "0.85rem",
            padding: "0.75rem 0.85rem",
            borderRadius: 10,
            border: "1px solid rgba(248,113,113,0.45)",
            background: "rgba(248,113,113,0.08)",
          }}
        >
          <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "#FCA5A5", margin: "0 0 0.5rem", lineHeight: 1.5 }}>
            {loadState.message}
          </p>
          <Btn size="sm" variant="secondary" onClick={() => void loadHealth()}>
            Retry loading evidence
          </Btn>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.75rem",
          marginTop: "0.85rem",
          padding: "0.85rem",
          borderRadius: 12,
          border: "1px solid rgba(45,212,191,0.25)",
          background: "rgba(45,212,191,0.05)",
        }}
      >
        <div>
          <p style={summaryLabel}>Current stage</p>
          <p style={summaryValue}>{stageLabel}</p>
        </div>
        <div>
          <p style={summaryLabel}>Independent verify</p>
          <p style={{ ...summaryValue, color: verified ? "#10B981" : "var(--text-primary)" }}>
            {verified ? "Observed" : "Not yet recorded"}
          </p>
        </div>
        <div>
          <p style={summaryLabel}>Time to first verify</p>
          <p style={{ ...summaryValue, fontSize: "0.82rem", fontWeight: 600 }}>{ttfv}</p>
        </div>
        <div>
          <p style={summaryLabel}>Environment</p>
          <p style={summaryValue}>Sandbox</p>
        </div>
      </div>

      <div style={{ marginTop: "0.65rem", fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)" }}>
        Policy <code style={{ fontFamily: MONO, color: "var(--text-primary)" }}>{policyPinned}</code>
        {" · "}
        Journey status {journey?.statusLine ?? "Not started"}
      </div>

      {evidenceState === "ready" && activation?.milestones?.length ? (
        <ol style={{ margin: "0.85rem 0 0", paddingLeft: "1.15rem", fontFamily: FONT, fontSize: "0.78rem" }}>
          {activation.milestones.map((milestone) => (
            <li key={milestone.id} style={{ marginBottom: "0.4rem", color: milestoneColor(milestone.status) }}>
              <strong>{milestone.label}</strong>
              <span style={{ color: "var(--text-muted)" }}> · {milestone.status}</span>
              <div style={{ color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.45 }}>{milestone.detail}</div>
            </li>
          ))}
        </ol>
      ) : loading ? (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.85rem" }}>
          Loading activation evidence…
        </p>
      ) : evidenceState === "unavailable" ? (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.85rem" }}>
          Activation milestones unavailable. Complete a hosted verification attempt, then refresh.
        </p>
      ) : evidenceState === "error" || evidenceState === "session_expired" ? (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.85rem" }}>
          Evidence not loaded. Fix the session or network issue above before trusting status fields.
        </p>
      ) : (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.85rem" }}>
          No activation evidence yet for this application.
        </p>
      )}

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.75rem", lineHeight: 1.5 }}>
        {SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE}
      </p>

      <div
        style={{
          marginTop: "0.85rem",
          padding: "0.9rem",
          border: "1px solid rgba(45,212,191,0.35)",
          borderRadius: 12,
          background: "var(--surface-inset)",
        }}
      >
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 0.35rem" }}>
          Next action
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-primary)", margin: "0 0 0.75rem", lineHeight: 1.55 }}>
          {nextAction.detail}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", alignItems: "center" }}>
          <Btn size="sm" onClick={() => onNavigate(nextAction.stage)}>
            {nextAction.label}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => void loadHealth()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh evidence"}
          </Btn>
        </div>
        <details style={{ marginTop: "0.75rem" }}>
          <summary style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", cursor: "pointer" }}>
            Reference links
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.45rem" }}>
            <Link href={INSTITUTIONAL_SANDBOX_HANDOFF_HREF} style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--accent)" }}>
              Customer engineering handoff
            </Link>
            <Link href={INSTITUTIONAL_INDEPENDENT_VERIFIER_HREF} style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--accent)" }}>
              Independent verifier guide
            </Link>
            <Link href={INSTITUTIONAL_RECEIPT_VERIFY_HREF} style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--accent)" }}>
              Public receipt check
            </Link>
          </div>
        </details>
      </div>
    </ContentCard>
  );
}
