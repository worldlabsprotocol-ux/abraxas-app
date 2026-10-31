"use client";

import { useEffect, useRef, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  LAUNCHPAD_TEST_SCENARIOS,
  type LaunchpadTestScenarioId,
} from "@/lib/partner/launchpad/testScenarios";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { AbraxasJourneyEmblemStatus } from "@/components/developers/AbraxasJourneyEmblemStatus";
import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { BeginnerPartnerAccessGate } from "@/components/developers/BeginnerPartnerAccessGate";
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
const pendingReceiptKey = (applicationId: string) => `abraxas:harness-pending:${applicationId}`;

function readPendingReceipt(applicationId: string): ReturnType<typeof formatHarnessResultForBuilder> | null {
  try {
    const raw = sessionStorage.getItem(pendingReceiptKey(applicationId));
    const value = raw ? JSON.parse(raw) as ReturnType<typeof formatHarnessResultForBuilder> : null;
    return value?.tone === "success" && typeof value.receiptId === "string" ? value : null;
  } catch { return null; }
}

function savePendingReceipt(applicationId: string, result: ReturnType<typeof formatHarnessResultForBuilder>) {
  try { sessionStorage.setItem(pendingReceiptKey(applicationId), JSON.stringify(result)); } catch { /* recheck remains available in this view */ }
}

function clearPendingReceipt(applicationId: string) {
  try { sessionStorage.removeItem(pendingReceiptKey(applicationId)); } catch { /* no security state stored here */ }
}

export function IntegrationStudioRequestWorkbench({
  packId,
  pathId,
  policyId,
  applicationName,
  beginnerSurface = false,
  autoRunOnReady = false,
  startWithExample = false,
  onAutoRunConsumed,
  onRefreshSession,
}: {
  packId: PolicyPackId | null;
  pathId: IntegrationStudioPathId;
  policyId: string | null;
  applicationName?: string;
  beginnerSurface?: boolean;
  autoRunOnReady?: boolean;
  startWithExample?: boolean;
  onAutoRunConsumed?: () => void;
  onRefreshSession?: () => void | Promise<void>;
}) {
  const { applicationId, signedIn, returnUrl, recordHttpTrace } = useIntegrationStudioOperational();
  const [scenarioId, setScenarioId] = useState<LaunchpadTestScenarioId>(
    LAUNCHPAD_TEST_SCENARIOS[0]?.id ?? "approved",
  );
  const [busy, setBusy] = useState(false);
  const autoRunStartedFor = useRef<string | null>(null);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<ReturnType<typeof formatHarnessResultForBuilder> | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState<ReturnType<typeof formatHarnessResultForBuilder> | null>(null);

  async function verifyHarnessReceipt(receiptId: string): Promise<"confirmed" | "invalid" | "unavailable"> {
    if (!applicationId || !signedIn) return "unavailable";
    const res = await fetch(`/api/launchpad/applications/${applicationId}/receipts/validate?receipt_id=${encodeURIComponent(receiptId)}`, {
      credentials: "include", cache: "no-store",
    });
    if (!res.ok) return res.status === 404 ? "invalid" : "unavailable";
    const data = await res.json();
    if (data.ok !== true || data.receipt_id !== receiptId) return "unavailable";
    return data.harness_verification_ok === true ? "confirmed" : "invalid";
  }

  useEffect(() => {
    setOutcome(null);
    setError("");
    if (!applicationId || !signedIn || autoRunStartedFor.current === applicationId) return;
    const pending = readPendingReceipt(applicationId);
    if (pending?.receiptId) {
      autoRunStartedFor.current = applicationId;
      onAutoRunConsumed?.();
      let active = true;
      setPendingReceipt(pending);
      void verifyHarnessReceipt(pending.receiptId).then((status) => {
        if (!active) return;
        if (status === "confirmed") {
          persistHarnessSuccess(applicationId, pending);
          clearPendingReceipt(applicationId);
          setPendingReceipt(null);
          setOutcome(pending);
        } else if (status === "invalid") {
          clearPendingReceipt(applicationId);
          setPendingReceipt(null);
          setError("That receipt is no longer valid. Run a new test.");
        } else setError("We could not recheck the receipt. Try again shortly.");
      }).catch(() => { if (active) setError("We could not recheck the receipt. Try again shortly."); });
      return () => { active = false; };
    }
    if (autoRunOnReady) return;
    const restored = readPersistedHarnessSuccess(applicationId);
    if (!restored?.receiptId) return;
    let active = true;
    void verifyHarnessReceipt(restored.receiptId).then((status) => {
      if (active && status === "confirmed") setOutcome(restored);
      if (active && status === "invalid") setError("The previous receipt is no longer valid. Run a new test.");
      if (active && status === "unavailable") setError("We could not recheck the receipt. Try again shortly.");
    }).catch(() => {
      if (active) setError("Could not confirm the previous test. Run it again.");
    });
    return () => { active = false; };
  // A browser hint never establishes a current verified result.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, signedIn, autoRunOnReady]);

  async function runHarness() {
    if (!applicationId || !signedIn) return;
    const pending = pendingReceipt ?? readPendingReceipt(applicationId);
    if (pending?.receiptId) {
      setBusy(true);
      try {
        const status = await verifyHarnessReceipt(pending.receiptId);
        if (status === "confirmed") {
          persistHarnessSuccess(applicationId, pending);
          clearPendingReceipt(applicationId);
          setPendingReceipt(null);
          setError("");
          setOutcome(pending);
        } else if (status === "invalid") {
          clearPendingReceipt(applicationId);
          setPendingReceipt(null);
          setError("That receipt is no longer valid. Run a new test.");
        } else setError("We could not recheck the receipt. Try again shortly.");
      } catch { setError("We could not recheck the receipt. Try again shortly."); }
      finally { setBusy(false); }
      return;
    }
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
        setError(res.status === 401 || res.status === 403
          ? "Access to this app has ended. Confirm your account and try again."
          : "We could not run the test. Try again.");
        return;
      }
      if (data.result && typeof data.result === "object") {
        const formatted = formatHarnessResultForBuilder(data.result as LaunchpadTestRunResult);
        if (formatted.tone === "success") {
          const verification = formatted.receiptId
            ? await verifyHarnessReceipt(formatted.receiptId) : "invalid";
          if (verification !== "confirmed") {
            if (formatted.receiptId && verification === "unavailable") {
              savePendingReceipt(applicationId, formatted);
              setPendingReceipt(formatted);
              setError("Your test ran. Recheck its receipt before running another test.");
            } else setError("The test receipt is invalid. Run a new test.");
            return;
          }
          persistHarnessSuccess(applicationId, formatted);
        }
        setOutcome(formatted);
      }
    } catch {
      setError("Test failed");
      recordHttpTrace(requestBody, { ok: false, error: "network_error" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!autoRunOnReady || !applicationId || autoRunStartedFor.current === applicationId || !signedIn || !packId || !policyId || readPendingReceipt(applicationId)) return;
    autoRunStartedFor.current = applicationId;
    onAutoRunConsumed?.();
    void runHarness();
  // One user-authorized create action starts one sandbox test; never replay on refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunOnReady, applicationId, signedIn, packId, policyId]);

  const showConnectJourney =
    Boolean(applicationId && signedIn && packId && policyId && outcome?.tone === "success");

  if (beginnerSurface && showConnectJourney) {
    return (
      <ApplicationConnectionAfterTestPanel
        applicationId={applicationId!}
        applicationName={applicationName ?? "Your application"}
        signedIn={signedIn}
        packId={packId!}
        pathId={pathId}
        policyId={policyId!}
        returnUrl={returnUrl}
        outcome={outcome!}
        testSucceeded
        startWithExample={startWithExample}
      />
    );
  }

  if (beginnerSurface && applicationId && !signedIn) {
    return <BeginnerPartnerAccessGate applicationId={applicationId} onReady={onRefreshSession ?? (() => {})} />;
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
            {pendingReceipt ? "Recheck receipt" : failed ? "Try test again" : "Run test"}
          </Btn>
        ) : null}
      >
        {!applicationId ? <p className="abx-builder-journey-support">Create your test app first.</p> : null}
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


