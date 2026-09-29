"use client";
// FILE: components/partner/launchpad/PartnerPilotProgressPanel.tsx

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { PilotCriteriaList, NextActionCard, MetricWithProvenance } from "@/components/product";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

interface PilotProgress {
  enrolled: boolean;
  program_status: string | null;
  effective_status: string | null;
  success_criteria: Array<{ criterion_type: string; status: string; measured_value: unknown; quality?: string }>;
  integration_status: string;
  measured_results: {
    successful_verifications: number;
    verification_success_rate: number | null;
    evidence_reuse_count: number;
  };
  next_action: string | null;
  notice: string;
}

export function PartnerPilotProgressPanel({ applicationId }: { applicationId: string }) {
  const [progress, setProgress] = useState<PilotProgress | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/pilot-progress`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? data.code ?? "Could not load pilot progress"));
      return;
    }
    setError("");
    setProgress((data as { progress: PilotProgress }).progress);
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  if (!progress && !error) {
    return (
      <ContentCard title="Pilot progress">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }} role="status">Loading pilot progress…</p>
      </ContentCard>
    );
  }

  if (!progress?.enrolled) {
    return null;
  }

  return (
    <ContentCard title="Pilot progress">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
        {progress.notice}
      </p>
      {error && <p style={{ fontFamily: FONT, color: "#ef4444" }} role="alert">{error}</p>}

      <div style={{ display: "grid", gap: "0.65rem", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", margin: "0.75rem 0" }}>
        <MetricWithProvenance label="Successful verifications" value={progress.measured_results.successful_verifications} provenance="measured" />
        <MetricWithProvenance label="Evidence reuse" value={progress.measured_results.evidence_reuse_count} provenance="measured" unavailableReason={progress.measured_results.evidence_reuse_count === 0 ? "Reuse appears when eligible requests use existing evidence." : undefined} />
        <MetricWithProvenance
          label="Success rate"
          value={progress.measured_results.verification_success_rate != null ? `${(progress.measured_results.verification_success_rate * 100).toFixed(1)}%` : null}
          provenance="measured"
          unavailableReason="Requires sufficient verification volume."
        />
      </div>

      <p style={{ fontFamily: FONT, fontSize: "0.76rem", margin: "0 0 0.65rem" }}>
        Pilot status <strong>{progress.effective_status ?? progress.program_status ?? "unknown"}</strong>
      </p>

      {progress.success_criteria.length > 0 && (
        <>
          <h3 style={{ fontFamily: FONT, fontSize: "0.85rem", margin: "0.65rem 0 0.45rem" }}>Pilot success criteria</h3>
          <PilotCriteriaList criteria={progress.success_criteria} />
        </>
      )}

      {progress.next_action && (
        <div style={{ marginTop: "0.85rem" }}>
          <NextActionCard action={progress.next_action.replace(/_/g, " ")} detail="From your enrolled design partner program." />
        </div>
      )}
    </ContentCard>
  );
}
