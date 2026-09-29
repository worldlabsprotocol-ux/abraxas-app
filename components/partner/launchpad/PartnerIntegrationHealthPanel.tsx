"use client";
// FILE: components/partner/launchpad/PartnerIntegrationHealthPanel.tsx

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface OperationalHealth {
  status: "healthy" | "degraded" | "blocked";
  environment: string;
  verification_attempts: number;
  verification_successes: number;
  verification_failures: number;
  verification_success_rate: number | null;
  last_receipt_verified_at: string | null;
  recent_failure_codes: string[];
  credential_status: string;
  callback_status: string;
  production_readiness_ok: boolean;
  production_readiness_blockers: string[];
  webhook_status: string;
  recent_timeline: Array<{ at: string; label: string; outcome: string | null; reason: string | null }>;
  technical_proof: Array<{ stage: string; status: string; at: string | null }>;
}

function statusColor(status: string): string {
  if (status === "healthy" || status === "observed" || status === "pass" || status === "ready" || status === "active") return "#10B981";
  if (status === "degraded" || status === "pending" || status === "localhost_only") return "#f59e0b";
  return "#ef4444";
}

export function PartnerIntegrationHealthPanel({ applicationId }: { applicationId: string }) {
  const [health, setHealth] = useState<OperationalHealth | null>(null);
  const [error, setError] = useState("");
  const [smokeMessage, setSmokeMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/integration-health`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? data.code ?? "Could not load integration health"));
      return;
    }
    setError("");
    setHealth(data as OperationalHealth);
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  async function runSmoke() {
    setSmokeMessage("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/integration-smoke`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json() as { ok?: boolean; probes?: Array<{ id: string; status: string }> };
    if (!res.ok) {
      setSmokeMessage("Smoke test unavailable.");
      return;
    }
    const failed = (data.probes ?? []).filter((probe) => probe.status === "fail").map((probe) => probe.id);
    setSmokeMessage(failed.length ? `Plumbing checks failed: ${failed.join(", ")}` : "Plumbing checks passed. No identity receipt was created.");
    await load();
  }

  async function exportAudit() {
    window.open(`/api/launchpad/applications/${applicationId}/integration-export`, "_blank", "noopener,noreferrer");
  }

  if (!health && !error) {
    return (
      <ContentCard title="Integration health">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>Loading operational health…</p>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Integration health">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Is my Abraxas integration working? This view uses privacy-safe lifecycle events only — no identity evidence or secrets.
      </p>
      {error && <p style={{ fontFamily: FONT, color: "#ef4444" }}>{error}</p>}
      {health && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.75rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem" }}>
              Status <strong style={{ color: statusColor(health.status) }}>{health.status}</strong>
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem" }}>Environment <code style={{ fontFamily: MONO }}>{health.environment}</code></div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem" }}>Credential <code style={{ fontFamily: MONO }}>{health.credential_status}</code></div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem" }}>Callback <code style={{ fontFamily: MONO }}>{health.callback_status}</code></div>
          </div>

          <p style={{ fontFamily: FONT, fontSize: "0.76rem", marginTop: "0.75rem" }}>
            Verification attempts {health.verification_attempts}
            {" · "}successes {health.verification_successes}
            {" · "}failures {health.verification_failures}
            {health.verification_success_rate != null && ` · success rate ${(health.verification_success_rate * 100).toFixed(1)}%`}
          </p>

          {health.recent_failure_codes.length > 0 && (
            <p style={{ fontFamily: MONO, fontSize: "0.72rem", color: "#f59e0b" }}>
              Recent safe failures: {health.recent_failure_codes.join(", ")}
            </p>
          )}

          {!health.production_readiness_ok && health.production_readiness_blockers.length > 0 && (
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "#f59e0b" }}>
              Production readiness blockers: {health.production_readiness_blockers.join(", ")}
            </p>
          )}

          <h3 style={{ fontFamily: FONT, fontSize: "0.85rem", marginTop: "1rem" }}>Technical proof (lifecycle)</h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.74rem" }}>
            {health.technical_proof.map((step) => (
              <li key={step.stage} style={{ marginBottom: 4, color: statusColor(step.status) }}>
                {step.stage} · {step.status}{step.at ? ` · ${new Date(step.at).toLocaleString()}` : ""}
              </li>
            ))}
          </ul>

          {health.recent_timeline.length > 0 && (
            <>
              <h3 style={{ fontFamily: FONT, fontSize: "0.85rem", marginTop: "1rem" }}>Recent safe events</h3>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                {health.recent_timeline.map((entry, index) => (
                  <li key={`${entry.at}-${index}`} style={{ marginBottom: 4 }}>
                    {new Date(entry.at).toLocaleString()} · {entry.label}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
            <Btn size="sm" variant="secondary" onClick={() => void runSmoke()}>Run plumbing smoke test</Btn>
            <Btn size="sm" variant="secondary" onClick={() => void exportAudit()}>Export audit JSON</Btn>
            <Btn size="sm" variant="secondary" onClick={() => void load()}>Refresh</Btn>
          </div>
          {smokeMessage && <p style={{ fontFamily: FONT, fontSize: "0.76rem", marginTop: "0.65rem" }}>{smokeMessage}</p>}
        </>
      )}
    </ContentCard>
  );
}
