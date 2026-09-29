"use client";
// FILE: components/partner/launchpad/PartnerPilotProgressPanel.tsx

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface PilotProgress {
  enrolled: boolean;
  program_status: string | null;
  effective_status: string | null;
  success_criteria: Array<{ criterion_type: string; status: string; measured_value: unknown }>;
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
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>Loading…</p>
      </ContentCard>
    );
  }

  if (!progress?.enrolled) {
    return null;
  }

  return (
    <ContentCard title="Pilot progress">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {progress.notice}
      </p>
      {error && <p style={{ fontFamily: FONT, color: "#ef4444" }}>{error}</p>}
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", marginTop: "0.65rem" }}>
        Status <strong>{progress.effective_status ?? progress.program_status ?? "unknown"}</strong>
        {" · "}integration <code style={{ fontFamily: MONO }}>{progress.integration_status}</code>
      </p>
      {progress.next_action && (
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", marginTop: "0.35rem" }}>
          Next: <code style={{ fontFamily: MONO }}>{progress.next_action}</code>
        </p>
      )}
      {progress.success_criteria.length > 0 && (
        <>
          <h3 style={{ fontFamily: FONT, fontSize: "0.85rem", marginTop: "0.85rem" }}>Success criteria</h3>
          <ul style={{ fontFamily: MONO, fontSize: "0.72rem", margin: 0, paddingLeft: "1.2rem" }}>
            {progress.success_criteria.map((c) => (
              <li key={c.criterion_type}>{c.criterion_type}: {c.status}</li>
            ))}
          </ul>
        </>
      )}
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", marginTop: "0.65rem" }}>
        Verified {progress.measured_results.successful_verifications}
        {" · "}reuse {progress.measured_results.evidence_reuse_count}
        {progress.measured_results.verification_success_rate != null
          && ` · success ${(progress.measured_results.verification_success_rate * 100).toFixed(1)}%`}
      </p>
    </ContentCard>
  );
}
