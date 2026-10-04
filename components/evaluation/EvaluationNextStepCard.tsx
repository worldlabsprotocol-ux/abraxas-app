"use client";
// FILE: components/evaluation/EvaluationNextStepCard.tsx
// Single obvious next action for the evaluation checklist.

import { useState } from "react";
import { Btn } from "@/components/redesign/ui";
import type { EvaluationNextStep } from "@/lib/partner/twoAppEvaluation/evaluationUx";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
};

export function EvaluationNextStepCard({
  next,
  evaluationId,
  onRefresh,
}: {
  next: EvaluationNextStep;
  evaluationId: string;
  onRefresh?: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function downloadEvidence() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/evaluation/two-app/${evaluationId}?export=evidence`);
      const json = await res.json() as { ok?: boolean; packet?: unknown; error?: string };
      if (!res.ok || !json.packet) throw new Error(json.error ?? "export_failed");
      const blob = new Blob([JSON.stringify(json.packet, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `abx-two-app-evidence-${evaluationId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const isComplete = next.title === "Evaluation complete";

  return (
    <div
      style={{
        padding: "0.85rem 0.95rem",
        borderRadius: 12,
        border: "1px solid rgba(45,212,191,0.35)",
        background: "rgba(45,212,191,0.06)",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#2DD4BF",
          marginBottom: "0.35rem",
        }}
      >
        What to do next
      </div>
      <h3 style={{ margin: "0 0 0.45rem", fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
        {next.title}
      </h3>
      <p style={body}>{next.body}</p>
      {exportError && (
        <p style={{ ...body, color: "#FBBF24", marginTop: "0.5rem" }}>{exportError}</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
        {isComplete ? (
          <Btn size="sm" onClick={() => void downloadEvidence()} disabled={exporting}>
            {exporting ? "Preparing export…" : "Download evidence packet"}
          </Btn>
        ) : next.primaryHref ? (
          next.primaryLabel?.toLowerCase().includes("refresh") ? (
            <Btn size="sm" onClick={onRefresh}>{next.primaryLabel}</Btn>
          ) : (
            <Btn href={next.primaryHref} size="sm">{next.primaryLabel}</Btn>
          )
        ) : null}
        {next.secondaryHref && next.secondaryLabel && (
          <Btn href={next.secondaryHref} size="sm" variant="secondary">{next.secondaryLabel}</Btn>
        )}
      </div>
    </div>
  );
}
