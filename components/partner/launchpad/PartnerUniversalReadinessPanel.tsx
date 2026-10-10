"use client";
// FILE: components/partner/launchpad/PartnerUniversalReadinessPanel.tsx

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import type { UniversalReadinessDiagnostic } from "@/lib/partner/universalIntegration/readinessDiagnostic";
import {
  READINESS_EVIDENCE_SOURCE,
  describeReadinessPhase,
  readinessLiveExecutionHint,
  readinessNextActions,
} from "@/lib/partner/universalIntegration/readinessUi";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

function phaseColor(phase: string): string {
  if (phase === "production_active" || phase === "sandbox_verified") return "#10B981";
  if (phase === "blocked" || phase === "suspended_or_revoked") return "#ef4444";
  if (phase === "sandbox_testing" || phase === "production_review_required") return "#f59e0b";
  return "var(--text-secondary)";
}

export function PartnerUniversalReadinessPanel({ applicationId }: { applicationId: string }) {
  const [readiness, setReadiness] = useState<UniversalReadinessDiagnostic | null>(null);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/health`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? data.code ?? "Could not load readiness"));
      setReadiness(null);
      return;
    }
    setError("");
    setReadiness(data.universal_readiness ?? null);
    setLoadedAt(new Date().toISOString());
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  if (!readiness && !error) {
    return (
      <ContentCard title="Integration readiness">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>Loading server readiness…</p>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Integration readiness">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Canonical readiness from the server — not inferred from starter kit downloads or client flags.
        Source: {READINESS_EVIDENCE_SOURCE}.
      </p>
      {error && <p style={{ fontFamily: FONT, color: "#ef4444" }}>{error}</p>}
      {readiness && (
        <>
          <div style={{ marginTop: "0.75rem", fontFamily: FONT, fontSize: "0.85rem" }}>
            Phase{" "}
            <strong style={{ color: phaseColor(readiness.phase) }}>
              {describeReadinessPhase(readiness.phase)}
            </strong>
            <span style={{ fontFamily: MONO, fontSize: "0.72rem", marginLeft: "0.5rem", color: "var(--text-secondary)" }}>
              ({readiness.phase})
            </span>
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.5rem 0" }}>
            {readiness.summary}
          </p>
          {readiness.phase === "sandbox_verified" && !readiness.signals.live_e2e_complete && (
            <div
              style={{
                marginTop: "0.65rem",
                padding: "0.55rem 0.65rem",
                borderRadius: 8,
                border: "1px solid #f59e0b",
                background: "rgba(245, 158, 11, 0.08)",
                fontFamily: FONT,
                fontSize: "0.74rem",
                color: "var(--text-primary)",
              }}
            >
              Harness verified — live holder E2E not observed. Server signal{" "}
              <code style={{ fontFamily: MONO }}>live_e2e_complete</code> is false.
            </div>
          )}
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
            {readinessLiveExecutionHint(readiness.phase, readiness.signals)}
          </p>
          {readiness.blockers.length > 0 && (
            <ul style={{ fontFamily: FONT, fontSize: "0.76rem", color: "#ef4444", margin: "0.5rem 0 0 1rem" }}>
              {readiness.blockers.map((b) => <li key={b}>{b.replace(/_/g, " ")}</li>)}
            </ul>
          )}
          <div style={{ marginTop: "0.75rem" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700 }}>Signals</p>
            <ul style={{ fontFamily: MONO, fontSize: "0.7rem", lineHeight: 1.7, margin: "0.25rem 0 0 1rem" }}>
              {Object.entries(readiness.signals).map(([key, value]) => (
                <li key={key}>{key}: {String(value)}</li>
              ))}
            </ul>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700 }}>Next actions</p>
            <ul style={{ fontFamily: FONT, fontSize: "0.76rem", margin: "0.25rem 0 0 1rem" }}>
              {readinessNextActions(readiness).map((action) => <li key={action}>{action}</li>)}
            </ul>
          </div>
          {loadedAt && (
            <p style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>
              Loaded {loadedAt}
            </p>
          )}
          <Btn size="sm" variant="secondary" onClick={() => void load()} style={{ marginTop: "0.5rem" }}>
            Refresh readiness
          </Btn>
        </>
      )}
    </ContentCard>
  );
}
