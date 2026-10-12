"use client";

import { useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  LAUNCHPAD_TEST_SCENARIOS,
  type LaunchpadTestScenarioId,
} from "@/lib/partner/launchpad/testScenarios";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { useIntegrationStudioOperational } from "@/components/developers/integrationStudioOperationalContext";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function IntegrationStudioRequestWorkbench() {
  const { applicationId, signedIn, returnUrl, recordHttpTrace } = useIntegrationStudioOperational();
  const [scenarioId, setScenarioId] = useState<LaunchpadTestScenarioId>(
    LAUNCHPAD_TEST_SCENARIOS[0]?.id ?? "approved",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function runHarness() {
    if (!applicationId || !signedIn) return;
    setBusy(true);
    setError("");
    const requestBody = { scenario_id: scenarioId, return_url: returnUrl };
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      recordHttpTrace(
        { method: "POST", path: `/api/launchpad/applications/${applicationId}/test`, body: requestBody },
        res.ok ? data : { ok: false, status: res.status, ...data },
      );
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Harness request failed");
      }
    } catch {
      setError("Harness request failed");
      recordHttpTrace(requestBody, { ok: false, error: "network_error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ContentCard title="Authenticated request builder" id="request">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
        Runs the partner test harness against your sandbox application. Responses and any signed receipt material appear in the inspector — nothing is fabricated.
      </p>
      {!applicationId && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Provision a sandbox application above to enable live requests.
        </p>
      )}
      {applicationId && !signedIn && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--warning, #f59e0b)" }}>
          Sign in with your sandbox API key (Launchpad session) to execute harness scenarios.
        </p>
      )}
      {applicationId && signedIn && (
        <>
          <label style={{ display: "grid", gap: "0.35rem", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.65rem" }}>
            Scenario
            <select
              value={scenarioId}
              onChange={(event) => setScenarioId(event.target.value as LaunchpadTestScenarioId)}
              style={{
                fontFamily: MONO,
                fontSize: "0.72rem",
                padding: "0.5rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-inset)",
                color: "var(--text-primary)",
              }}
            >
              {LAUNCHPAD_TEST_SCENARIOS.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
          </label>
          <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0 0 0.75rem" }}>
            return_url: {returnUrl}
          </p>
          {error && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)" }}>{error}</p>}
          <Btn size="sm" disabled={busy} onClick={() => void runHarness()}>
            {busy ? "Running…" : "Run harness request"}
          </Btn>
        </>
      )}
    </ContentCard>
  );
}
