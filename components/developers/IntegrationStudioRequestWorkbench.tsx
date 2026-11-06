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
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import {
  presentIntegrationTestFailure,
  type IntegrationTestFailurePresentation,
} from "@/lib/partner/launchpad/integrationTestFailure";
import {
  ApplicationConnectionAfterTestPanel,
  persistHarnessSuccess,
  readPersistedHarnessSuccess,
} from "@/components/developers/ApplicationConnectionAfterTestPanel";
import {
  appendSafeReturnPath,
  buildIntegrationStudioResumeUrl,
  classifyPortableDecision,
  independentlyAccepted,
  resolveIntegrationStudioExecutionMode,
  SOLANA_EXECUTION_PENDING_MESSAGE,
  type IllustrativeIndependentVerification,
  type UnifiedTrustExecutionJourney,
} from "@/lib/partner/integrationStudio/unifiedTrustExecution";

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
  const [failure, setFailure] = useState<IntegrationTestFailurePresentation | null>(null);
  const [outcome, setOutcome] = useState<ReturnType<typeof formatHarnessResultForBuilder> | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState<ReturnType<typeof formatHarnessResultForBuilder> | null>(null);
  const [trustJourney, setTrustJourney] = useState<UnifiedTrustExecutionJourney | null>(null);
  const continueInFlight = useRef(false);
  const [browserOrigin, setBrowserOrigin] = useState<string | null>(null);

  useEffect(() => {
    setBrowserOrigin(getPublicAppOrigin());
  }, []);

  useEffect(() => {
    const challengeId = new URLSearchParams(window.location.search).get("trust_execution_challenge")?.trim();
    if (!challengeId || trustJourney) return;
    setTrustJourney({
      phase: "authorized_pending_execution",
      challenge_id: challengeId,
      holder_url: "",
      receipt_id: null,
      decision_result: null,
      evidence_mode: null,
    });
  }, [trustJourney]);

  async function startUnifiedTrustExecution() {
    if (!applicationId) return;
    const sessionRes = await fetch("/api/auth/wallet/session", {
      credentials: "include",
      cache: "no-store",
    });
    const session = await sessionRes.json().catch(() => ({})) as {
      authenticated?: boolean;
      wallet_address?: string;
    };
    if (!sessionRes.ok || !session.authenticated || !session.wallet_address) {
      setFailure({
        kind: "action_required",
        headline: "Wallet authorization required",
        detail: "Sign in with the wallet that will authorize this sandbox action, then run the test again.",
        actionLabel: "Resume sign-in",
        refreshSession: true,
      });
      return;
    }

    const res = await fetch(`/api/launchpad/applications/${applicationId}/sovereign-trust-execution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        holder_wallet_address: session.wallet_address,
        solana_network: "devnet",
        defer_execution: true,
      }),
    });
    const data = await res.json().catch(() => ({})) as {
      code?: string;
      error?: string;
      journey?: UnifiedTrustExecutionJourney;
    };
    recordHttpTrace(
      { method: "POST", path: `/api/launchpad/applications/${applicationId}/sovereign-trust-execution`, mode: "offchain_portable" },
      res.ok ? data : { ok: false, status: res.status, ...data },
    );
    if (!res.ok || !data.journey) {
      setFailure(presentIntegrationTestFailure(res.status, data));
      return;
    }
    setTrustJourney(data.journey);
  }

  async function continueUnifiedTrustExecution() {
    if (!applicationId || !trustJourney?.challenge_id || continueInFlight.current) return;
    continueInFlight.current = true;
    setBusy(true);
    try {
    const statusRes = await fetch(
      `/api/launchpad/applications/${applicationId}/sovereign-trust-execution?challenge_id=${encodeURIComponent(trustJourney.challenge_id)}`,
      { credentials: "include", cache: "no-store" },
    );
    const statusData = await statusRes.json().catch(() => ({})) as {
      code?: string;
      journey?: UnifiedTrustExecutionJourney;
    };
    if (!statusRes.ok || !statusData.journey) {
      setError(statusData.code ?? "Abraxas could not load the authorization status.");
      return;
    }
    setTrustJourney(statusData.journey);
    if (statusData.journey.phase === "awaiting_holder_authorization") {
      setError("The wallet authorization is still waiting for a signature.");
      return;
    }
    if (statusData.journey.phase === "expired") {
      setError("The wallet authorization expired. Start a new sandbox test.");
      return;
    }

    const executeRes = await fetch(`/api/launchpad/applications/${applicationId}/sovereign-trust-execution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ execute: true, challenge_id: trustJourney.challenge_id }),
    });
    const executed = await executeRes.json().catch(() => ({})) as {
      code?: string;
      journey?: UnifiedTrustExecutionJourney;
      independent_verification?: IllustrativeIndependentVerification;
    };
    recordHttpTrace(
      { method: "POST", path: `/api/launchpad/applications/${applicationId}/sovereign-trust-execution`, phase: "execute" },
      executeRes.ok ? executed : { ok: false, status: executeRes.status, ...executed },
    );
    if (!executeRes.ok || !executed.journey) {
      setError(executed.code ?? "The authorized action could not be executed.");
      return;
    }
    if (!executed.journey.receipt_id || !independentlyAccepted(executed.independent_verification)) {
      setError("A portable receipt was produced, but independent verification did not accept it. No successful test was recorded.");
      return;
    }
    const classification = classifyPortableDecision(
      executed.journey.decision_result,
      executed.independent_verification,
    );
    setTrustJourney(executed.journey);
    setError("");
    if (classification === "deny") {
      setError("This test did not authorize access. The current signed receipt was independently verified and denied this action.");
      setOutcome({
        headline: "This test did not authorize access.",
        summary: "Abraxas independently verified a current signed receipt whose policy decision denied this action.",
        tone: "denied",
        observedAccess: "deny",
        passed: false,
        nextActionLabel: "Review response details",
        receiptId: executed.journey.receipt_id,
      });
      return;
    }
    if (classification !== "allow") {
      setError("The signed receipt did not contain a clear, currently valid allow or deny decision. No authorization result was recorded.");
      return;
    }
    setOutcome({
      headline: "Your test worked.",
      summary: "The wallet authorized one policy-bound action. Abraxas issued a portable signed receipt and the existing independent verifier accepted its cryptographic authority and current status.",
      tone: "success",
      observedAccess: "allow",
      passed: true,
      nextActionLabel: "Connect my application",
      receiptId: executed.journey.receipt_id,
    });
    } finally {
      continueInFlight.current = false;
      setBusy(false);
    }
  }

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
    setFailure(null);
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
    setFailure(null);
    setOutcome(null);
    setTrustJourney(null);
    if (resolveIntegrationStudioExecutionMode(pathId) === "solana_finalized") {
      setError(SOLANA_EXECUTION_PENDING_MESSAGE);
      setBusy(false);
      return;
    }
    if (scenarioId === "approved") {
      try {
        await startUnifiedTrustExecution();
      } catch {
        setFailure({
          kind: "test_failed",
          headline: "Trust execution did not start",
          detail: "The request did not reach the unified trust-execution service. Check the connection and try again.",
          actionLabel: "Try test again",
          refreshSession: false,
        });
      } finally {
        setBusy(false);
      }
      return;
    }
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
      const data = await res.json().catch(() => ({})) as {
        code?: string;
        error?: string;
        retry_after_sec?: number;
        result?: LaunchpadTestRunResult;
      };
      recordHttpTrace(
        { method: "POST", path: `/api/launchpad/applications/${applicationId}/test`, body: requestBody },
        res.ok ? data : { ok: false, status: res.status, ...data },
      );
      if (!res.ok) {
        setFailure(presentIntegrationTestFailure(res.status, data));
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
      setFailure({
        kind: "test_failed",
        headline: "Test request did not reach Abraxas",
        detail: "Check your connection, then try the test again.",
        actionLabel: "Try test again",
        refreshSession: false,
      });
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

  const holderAuthorizationUrl = trustJourney?.phase === "awaiting_holder_authorization" && browserOrigin
    ? appendSafeReturnPath(
        trustJourney.holder_url,
        buildIntegrationStudioResumeUrl(window.location.href, trustJourney.challenge_id),
        browserOrigin,
      )
    : null;

  const trustAuthorizationAction = trustJourney?.phase === "awaiting_holder_authorization" && holderAuthorizationUrl ? (
    <div className="abx-builder-journey-actions">
      <Btn
        href={holderAuthorizationUrl}
        size="sm"
      >
        Authorize with wallet
      </Btn>
      <Btn size="sm" variant="secondary" disabled={busy} onClick={() => void continueUnifiedTrustExecution()}>
        Check authorization
      </Btn>
    </div>
  ) : trustJourney?.phase === "awaiting_holder_authorization" && browserOrigin ? (
    <p role="alert">Abraxas could not open a safe same-origin wallet authorization link.</p>
  ) : trustJourney?.phase === "awaiting_holder_authorization" ? null : trustJourney && trustJourney.phase !== "executed" ? (
    <Btn size="sm" disabled={busy} loading={busy} onClick={() => void continueUnifiedTrustExecution()}>
      Check authorization
    </Btn>
  ) : null;

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
    const failed = Boolean(failure || error || (outcome && outcome.tone !== "success"));
    return (
      <BuilderActiveTask
        taskKey="run-sandbox-test"
        testId="builder-run-test-minimal"
        title={busy ? "Running your test" : failed ? "Your test needs attention" : trustJourney ? "Authorize the sandbox action" : "Run a sandbox test"}
        description={failed ? "Check the result, then try again." : trustJourney ? "Sign the action-specific request, then verify the resulting receipt." : "See how your app receives a verified result."}
        state={busy ? "pending" : failed ? "failure" : "ready"}
        status={busy ? "Running against your sandbox app" : failure?.headline ?? (failed ? outcome?.headline : undefined)}
        error={failure?.detail ?? error}
        action={trustAuthorizationAction ?? (applicationId && signedIn && (!failure || failure.actionLabel) ? (
          <Btn
            size="sm"
            disabled={busy}
            loading={busy}
            onClick={() => failure?.refreshSession ? void onRefreshSession?.() : void runHarness()}
          >
            {pendingReceipt ? "Recheck receipt" : failure?.actionLabel ?? (failed ? "Try test again" : "Run test")}
          </Btn>
        ) : null)}
      >
        {!applicationId ? <p className="abx-builder-journey-support">Create your test app first.</p> : null}
        {trustJourney?.phase === "awaiting_holder_authorization" ? (
          <p className="abx-builder-journey-support">Review and sign the action-specific request, then return here and check authorization.</p>
        ) : null}
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




