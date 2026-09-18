"use client";
// FILE: components/partner/launchpad/PartnerSandboxReadinessPanel.tsx
// Integration Readiness card. Score and blockers come only from server evidence.

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface StageRow {
  id: string;
  label: string;
  status: "pass" | "fail" | "blocked" | "not_run";
  code: string;
  detail: string;
  runnable: boolean;
  last_run_at: string | null;
}

interface ReadinessReport {
  overall: "pass" | "fail" | "blocked" | "not_run";
  score: { passed: number; total: number };
  next_action: string;
  last_run_at: string | null;
  production_activation_eligible: boolean;
  sandbox_pass_is_not_production_authorization: boolean;
  blockers: Array<{ code: string; detail: string }>;
  stages: StageRow[];
  evidence: Array<{ id: string; label: string; status: string; code: string; detail: string }>;
  manifest: Record<string, unknown>;
}

function statusColor(status: string): string {
  if (status === "pass") return "#10B981";
  if (status === "action_required" || status === "not_run") return "#f59e0b";
  return "#ef4444";
}

export function PartnerSandboxReadinessPanel({
  applicationId,
  onChanged,
}: {
  applicationId: string;
  onChanged?: () => void;
}) {
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/sandbox-readiness`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? data.code ?? "Could not load readiness"));
      return;
    }
    setError("");
    setReport(data as ReadinessReport);
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runStage(stage: string) {
    setBusy(true);
    setError("");
    setNotice("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/sandbox-readiness`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stage,
        idempotency_key: `ui-${stage}-${Date.now()}`,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(String(data.error ?? data.code ?? "Could not run sandbox test"));
      return;
    }
    setReport(data as ReadinessReport);
    setNotice(String(data.run?.detail ?? "Sandbox test recorded. This is not production authorization."));
    onChanged?.();
  }

  async function copyManifest() {
    if (!report?.manifest) return;
    await navigator.clipboard.writeText(JSON.stringify(report.manifest, null, 2));
    setCopyFeedback("Copied sandbox manifest");
    setTimeout(() => setCopyFeedback(""), 2000);
  }

  function downloadManifest() {
    if (!report?.manifest) return;
    const blob = new Blob([JSON.stringify(report.manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `abraxas-sandbox-manifest-${applicationId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ContentCard title="Integration Readiness">
      <p style={bodyText}>
        Server-derived sandbox checklist. A sandbox pass is never production authorization and never issues a production receipt.
      </p>
      {error && <p style={{ ...bodyText, color: "#ef4444" }}>{error}</p>}
      {notice && <p style={{ ...bodyText, color: "#10B981" }}>{notice}</p>}
      {report && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.82rem" }}>
                Score {report.score.passed}/{report.score.total}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: statusColor(report.overall) }}>
                {report.overall.replace(/_/g, " ")}
              </div>
            </div>
            <div style={{ textAlign: "right", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              Last run {report.last_run_at ? new Date(report.last_run_at).toLocaleString() : "not run"}
            </div>
          </div>
          <p style={bodyText}>Next safe action: {report.next_action}</p>
          <p style={bodyText}>
            Production activation eligible: {report.production_activation_eligible ? "yes (not activated here)" : "no"}.
            {" "}Sandbox pass is not production authorization.
          </p>
          <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.75rem" }}>
            {report.stages.map((stage) => (
              <div key={stage.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.65rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700 }}>
                  <span>{stage.label}</span>
                  <span style={{ color: statusColor(stage.status) }}>{stage.status.replace(/_/g, " ")}</span>
                </div>
                <p style={{ ...bodyText, margin: "0.3rem 0" }}>{stage.detail}</p>
                <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>{stage.code}</code>
                {stage.runnable && (
                  <div style={{ marginTop: "0.45rem" }}>
                    <Btn size="sm" variant="secondary" disabled={busy} onClick={() => void runStage(stage.id)}>
                      Rerun {stage.label}
                    </Btn>
                  </div>
                )}
              </div>
            ))}
          </div>
          {report.blockers.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              <p style={{ ...bodyText, fontWeight: 700 }}>Exact blockers</p>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem" }}>
                {report.blockers.map((blocker) => (
                  <li key={`${blocker.code}-${blocker.detail}`}>{blocker.code}: {blocker.detail}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            <Btn size="sm" variant="secondary" onClick={() => void load()}>Refresh evidence</Btn>
            <Btn size="sm" variant="secondary" onClick={() => void copyManifest()}>Copy sandbox manifest</Btn>
            <Btn size="sm" variant="ghost" onClick={() => downloadManifest()}>Download manifest</Btn>
          </div>
          {copyFeedback && <p style={{ ...bodyText, marginTop: "0.45rem" }} role="status">{copyFeedback}</p>}
        </>
      )}
    </ContentCard>
  );
}

const bodyText: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: "0 0 0.75rem",
};
