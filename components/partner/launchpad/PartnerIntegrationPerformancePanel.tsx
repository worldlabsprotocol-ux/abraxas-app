"use client";
// FILE: components/partner/launchpad/PartnerIntegrationPerformancePanel.tsx

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface PerformanceSummary {
  integration_status: string;
  environment: string;
  metrics: {
    total_requests: { value: number };
    completed_holder_flows: { value: number };
    successful_receipt_verifications: { value: number };
    evidence_reuse_count: { value: number };
    verification_success_rate: { value: number | null };
    unique_policy_count: { value: number };
  };
  policy_consumption: Array<{ policy_id: string; result_family: string | null; request_count: number }>;
  reliability: { safe_failure_categories: string[] };
  funnel: Array<{ stage: string; label: string; status: string; first_at: string | null }>;
}

export function PartnerIntegrationPerformancePanel({ applicationId }: { applicationId: string }) {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/pilot-evidence`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? data.code ?? "Could not load integration performance"));
      return;
    }
    setError("");
    setSummary((data as { performance: PerformanceSummary }).performance);
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  if (!summary && !error) {
    return (
      <ContentCard title="Integration performance">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>Loading performance evidence…</p>
      </ContentCard>
    );
  }

  const m = summary?.metrics;

  return (
    <ContentCard title="Integration performance">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Factual usage from privacy-safe lifecycle events. No holder identity data.
      </p>
      {error && <p style={{ fontFamily: FONT, color: "#ef4444" }}>{error}</p>}
      {summary && m && (
        <>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", marginTop: "0.65rem" }}>
            Status <strong>{summary.integration_status}</strong>
            {" · "}environment <code style={{ fontFamily: MONO }}>{summary.environment}</code>
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", marginTop: "0.35rem" }}>
            Requests {m.total_requests.value}
            {" · "}completed flows {m.completed_holder_flows.value}
            {" · "}verified {m.successful_receipt_verifications.value}
            {" · "}reuse {m.evidence_reuse_count.value}
            {m.verification_success_rate.value != null
              && ` · verify success ${(m.verification_success_rate.value * 100).toFixed(1)}%`}
          </p>
          {summary.policy_consumption.length > 0 && (
            <>
              <h3 style={{ fontFamily: FONT, fontSize: "0.85rem", marginTop: "0.85rem" }}>Policies requested</h3>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: MONO, fontSize: "0.72rem" }}>
                {summary.policy_consumption.map((row) => (
                  <li key={row.policy_id} style={{ marginBottom: 4 }}>
                    {row.policy_id} · {row.result_family ?? "unknown"} · {row.request_count} requests
                  </li>
                ))}
              </ul>
            </>
          )}
          {summary.reliability.safe_failure_categories.length > 0 && (
            <p style={{ fontFamily: MONO, fontSize: "0.72rem", color: "#f59e0b", marginTop: "0.65rem" }}>
              Integration failures to fix: {summary.reliability.safe_failure_categories.join(", ")}
            </p>
          )}
          <div style={{ marginTop: "0.75rem" }}>
            <Btn size="sm" variant="secondary" onClick={() => void load()}>Refresh</Btn>
          </div>
        </>
      )}
    </ContentCard>
  );
}
