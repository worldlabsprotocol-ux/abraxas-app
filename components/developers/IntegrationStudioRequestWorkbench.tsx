"use client";

import { useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  LAUNCHPAD_TEST_SCENARIOS,
  type LaunchpadTestScenarioId,
} from "@/lib/partner/launchpad/testScenarios";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { AbraxasJourneyEmblemStatus } from "@/components/developers/AbraxasJourneyEmblemStatus";
import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { useIntegrationStudioOperational } from "@/components/developers/integrationStudioOperationalContext";
import { formatHarnessResultForBuilder } from "@/lib/partner/launchpad/formatHarnessResultForBuilder";
import { buildLaunchpadTestScenarioRequestBody } from "@/lib/partner/launchpad/testScenarioClientRequest";
import type { LaunchpadTestRunResult } from "@/lib/partner/launchpad/runTestScenario";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import {
  ApplicationConnectionAfterTestPanel,
  persistHarnessSuccess,
  readPersistedHarnessSuccess,
} from "@/components/developers/ApplicationConnectionAfterTestPanel";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function IntegrationStudioRequestWorkbench({
  packId,
  pathId,
  policyId,
  beginnerSurface = false,
}: {
  packId: PolicyPackId | null;
  pathId: IntegrationStudioPathId;
  policyId: string | null;
  beginnerSurface?: boolean;
}) {
  const { applicationId, signedIn, returnUrl, recordHttpTrace } = useIntegrationStudioOperational();
  const [scenarioId, setScenarioId] = useState<LaunchpadTestScenarioId>(
    LAUNCHPAD_TEST_SCENARIOS[0]?.id ?? "approved",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<ReturnType<typeof formatHarnessResultForBuilder> | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    const restored = readPersistedHarnessSuccess(applicationId);
    if (restored) setOutcome(restored);
  }, [applicationId]);

  async function runHarness() {
    if (!applicationId || !signedIn) return;
    setBusy(true);
    setError("");
    setOutcome(null);
    const requestBody = buildLaunchpadTestScenarioRequestBody({
      scenarioId,
      returnUrl,
    });
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
        setError(typeof data.error === "string" ? data.error : "Test failed");
        return;
      }
      if (data.result && typeof data.result === "object") {
        const formatted = formatHarnessResultForBuilder(data.result as LaunchpadTestRunResult);
        setOutcome(formatted);
        if (applicationId && formatted.tone === "success") {
          persistHarnessSuccess(applicationId, formatted);
        }
      }
    } catch {
      setError("Test failed");
      recordHttpTrace(requestBody, { ok: false, error: "network_error" });
    } finally {
      setBusy(false);
    }
  }

  const showConnectJourney =
    Boolean(applicationId && signedIn && packId && policyId && outcome?.tone === "success");

  if (beginnerSurface && showConnectJourney) {
    return (
      <ApplicationConnectionAfterTestPanel
        applicationId={applicationId!}
        signedIn={signedIn}
        packId={packId!}
        pathId={pathId}
        policyId={policyId!}
        returnUrl={returnUrl}
        outcome={outcome!}
        testSucceeded
      />
    );
  }

  if (beginnerSurface) {
    const failed = Boolean(error || (outcome && outcome.tone !== "success"));
    return (
      <BuilderActiveTask
        taskKey="run-sandbox-test"
        testId="builder-run-test-minimal"
        title={busy ? "Running your test" : failed ? "Your test needs attention" : "Run a sandbox test"}
        description={failed ? "Check the result, then try again." : "See how your app receives a verified result."}
        state={busy ? "pending" : failed ? "failure" : "ready"}
        status={busy ? "Running against your sandbox app" : failed ? outcome?.headline : undefined}
        error={error}
        action={applicationId && signedIn ? (
          <Btn size="sm" disabled={busy} loading={busy} onClick={() => void runHarness()}>
            {failed ? "Try test again" : "Run test"}
          </Btn>
        ) : null}
      >
        {!applicationId ? <p className="abx-builder-journey-support">Create your test app first.</p> : null}
        {applicationId && !signedIn ? <p className="abx-builder-journey-support">Sign in to run your test.</p> : null}
      </BuilderActiveTask>
    );
  }

  return (
    <ContentCard title="Run a test" id="request">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
        Run a real sandbox verification. When it succeeds, connect your application backend on the next step.
      </p>
      {busy ? <AbraxasJourneyEmblemStatus state="running_test" detail="Executing harness request against your sandbox application." /> : null}
      {outcome && !busy ? (
        <AbraxasJourneyEmblemStatus
          state={outcome.tone === "success" ? "verified" : "needs_attention"}
          detail={outcome.headline}
        />
      ) : null}
      {!applicationId && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Create your test app above to enable live requests.
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
          {outcome && !busy ? (
            <div
              style={{
                fontFamily: FONT,
                fontSize: "0.78rem",
                lineHeight: 1.55,
                margin: "0 0 0.75rem",
                padding: "0.75rem 0.85rem",
                borderRadius: 10,
                border:
                  outcome.tone === "success"
                    ? "1px solid rgba(76,187,146,0.45)"
                    : "1px solid rgba(248,113,113,0.35)",
                background: "var(--surface-inset)",
              }}
            >
              <p style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>{outcome.headline}</p>
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>{outcome.summary}</p>
              {outcome.receiptId ? (
                <p style={{ margin: "0.55rem 0 0", fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-muted)" }}>
                  receipt_id: {outcome.receiptId}
                </p>
              ) : null}
            </div>
          ) : null}
          <Btn size="sm" disabled={busy} onClick={() => void runHarness()}>
            {busy ? "Running…" : "Run test"}
          </Btn>
        </>
      )}
      {showConnectJourney ? (
        <div style={{ marginTop: "1rem" }}>
          <ApplicationConnectionAfterTestPanel
            applicationId={applicationId!}
            signedIn={signedIn}
            packId={packId!}
            pathId={pathId}
            policyId={policyId!}
            returnUrl={returnUrl}
            outcome={outcome!}
          />
        </div>
      ) : null}
    </ContentCard>
  );
}
