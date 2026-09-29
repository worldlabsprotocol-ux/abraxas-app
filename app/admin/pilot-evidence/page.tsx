"use client";
// FILE: app/admin/pilot-evidence/page.tsx
// Operator pilot evidence surface for diligence and case-study prep.

import { useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export default function AdminPilotEvidencePage() {
  const [applicationId, setApplicationId] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [summaryJson, setSummaryJson] = useState("");
  const [error, setError] = useState("");

  async function loadSummary() {
    setError("");
    setSummaryJson("");
    if (!applicationId.trim()) {
      setError("Application ID required");
      return;
    }
    const params = new URLSearchParams({ application_id: applicationId.trim(), environment });
    const res = await fetch(`/api/admin/pilot-evidence?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? "Failed to load"));
      return;
    }
    setSummaryJson(JSON.stringify(data.summary, null, 2));
  }

  function exportJson() {
    if (!applicationId.trim()) return;
    const params = new URLSearchParams({ application_id: applicationId.trim(), environment });
    window.open(`/api/admin/pilot-evidence/export?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <RedesignPage accent="admin" maxWidth={960}>
      <ContentCard title="Pilot evidence">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 0 }}>
          Privacy-safe partner value metrics for diligence and case studies.
        </p>
      </ContentCard>
      <ContentCard title="Lookup">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          Select partner application and environment. Metrics are measured from integration events only — zero usage shows zero.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Application UUID"
            value={applicationId}
            onChange={(event) => setApplicationId(event.target.value)}
            style={{ fontFamily: MONO, fontSize: "0.78rem", padding: "0.35rem 0.5rem", minWidth: 280 }}
          />
          <select
            value={environment}
            onChange={(event) => setEnvironment(event.target.value as "sandbox" | "production")}
            style={{ fontFamily: FONT, fontSize: "0.78rem", padding: "0.35rem 0.5rem" }}
          >
            <option value="sandbox">sandbox</option>
            <option value="production">production</option>
          </select>
          <Btn size="sm" onClick={() => void loadSummary()}>Load summary</Btn>
          <Btn size="sm" variant="secondary" onClick={exportJson}>Export diligence JSON</Btn>
        </div>
        {error && <p style={{ fontFamily: FONT, color: "#ef4444", marginTop: "0.65rem" }}>{error}</p>}
      </ContentCard>
      {summaryJson && (
        <ContentCard title="Summary">
          <pre style={{ fontFamily: MONO, fontSize: "0.68rem", overflow: "auto", maxHeight: 520, margin: 0 }}>
            {summaryJson}
          </pre>
        </ContentCard>
      )}
    </RedesignPage>
  );
}
