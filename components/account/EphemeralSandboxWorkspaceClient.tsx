"use client";
// FILE: components/account/EphemeralSandboxWorkspaceClient.tsx

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  fetchWalletActionChallenge,
  signWalletActionChallenge,
  type WalletActionChallengePayload,
} from "@/lib/auth/ephemeralWallet/clientActionAuth";
import {
  EPHEMERAL_WORKSPACE_SANDBOX_BADGE,
  EPHEMERAL_WORKSPACE_SANDBOX_EXPIRY_NOTE,
  mapSandboxEnterFailure,
  verificationReviewScopeNote,
  verificationReviewTitle,
} from "@/lib/developers/ephemeralWorkspaceCopy";
import styles from "./EphemeralDeveloperWorkspace.module.css";

const EPHEMERAL_SANDBOX_RESULT_LABEL = "ephemeral_sandbox_test_only";

type Policy = {
  policy_id: string;
  label: string;
  description: string;
};

type Workspace = {
  workspace_id: string;
  expires_at: string;
};

type TestResult = {
  receipt_id: string;
  result_label: string;
  signature: string;
  payload_hash: string;
};

type WorkspacePhase =
  | "loading"
  | "signed_out"
  | "ready"
  | "entering"
  | "workspace"
  | "review"
  | "signing"
  | "submitting"
  | "result"
  | "failure";

function logSandboxStage(input: Record<string, unknown>): void {
  if (typeof console !== "undefined" && console.info) {
    console.info("[abraxas sandbox]", input);
  }
}

function mapSignFailure(code?: string | null): string {
  if (code === "expired") {
    return "Request expired. For your security, this request is no longer valid.";
  }
  return mapSandboxEnterFailure(code);
}

export function EphemeralSandboxWorkspaceClient() {
  const { signMessage, publicKey } = useWallet();
  const [phase, setPhase] = useState<WorkspacePhase>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [pendingChallenge, setPendingChallenge] = useState<WalletActionChallengePayload | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [validation, setValidation] = useState<{ ok?: boolean; signature_valid?: boolean } | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [walletFocusHint, setWalletFocusHint] = useState(false);

  const requestGenerationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const bumpRequestGeneration = useCallback(() => {
    requestGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const hydrate = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const sessionRes = await fetch("/api/auth/wallet/session", { credentials: "same-origin" });
      const sessionBody = (await sessionRes.json()) as {
        authenticated?: boolean;
        session_id?: string;
        wallet_address?: string;
      };
      if (!sessionBody.authenticated) {
        setPhase("signed_out");
        setSessionId(null);
        setWalletAddress(null);
        setWorkspace(null);
        return;
      }
      setSessionId(sessionBody.session_id ?? null);
      setWalletAddress(sessionBody.wallet_address ?? null);

      const workspaceRes = await fetch("/api/auth/wallet/sandbox/workspace", { credentials: "same-origin" });
      const workspaceBody = (await workspaceRes.json()) as { workspace?: Workspace | null; code?: string };
      if (workspaceBody.workspace) {
        setWorkspace(workspaceBody.workspace);
        setPhase("workspace");
        return;
      }
      setPhase("ready");
    } catch {
      setPhase("failure");
      setError("Could not load workspace state. Refresh and try again.");
    }
  }, []);

  useEffect(() => {
    void hydrate();
    void fetch("/api/auth/wallet/sandbox/policies", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((json: { policies?: Policy[] }) => {
        const list = json.policies ?? [];
        setPolicies(list);
        if (list[0]) setSelectedPolicy(list[0].policy_id);
      })
      .catch(() => setPolicies([]));
  }, [hydrate]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && phase === "signing") {
        setWalletFocusHint(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase]);

  useEffect(() => {
    if (phase !== "signing" || !walletAddress || !publicKey) return;
    if (publicKey.toBase58() !== walletAddress) {
      bumpRequestGeneration();
      setPendingChallenge(null);
      setPhase("workspace");
      setError("Wallet account changed. Connect the same wallet as your session and try again.");
    }
  }, [phase, publicKey, walletAddress, bumpRequestGeneration]);

  const enterWorkspace = useCallback(async () => {
    if (!sessionId) {
      setError("Sign in with your Solana wallet first.");
      setPhase("signed_out");
      return;
    }
    setBusy(true);
    setError(null);
    setCorrelationId(null);
    setPhase("entering");
    logSandboxStage({ stage: "enter_request", session_id_prefix: sessionId.slice(0, 8) });
    try {
      const res = await fetch("/api/auth/wallet/sandbox/enter", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        workspace?: Workspace;
        code?: string;
        correlation_id?: string;
        stage?: string;
      };
      if (json.correlation_id) setCorrelationId(json.correlation_id);
      logSandboxStage({
        stage: json.stage ?? "enter_response",
        http_status: res.status,
        code: json.code ?? null,
        correlation_id: json.correlation_id ?? null,
      });
      if (!res.ok || !json.workspace) {
        setPhase("failure");
        setError(mapSandboxEnterFailure(json.code));
        return;
      }
      setWorkspace(json.workspace);
      setPhase("workspace");
    } catch {
      setPhase("failure");
      setError("Network error while opening workspace. Try again.");
    } finally {
      setBusy(false);
    }
  }, [sessionId]);

  const cancelVerificationRequest = useCallback(() => {
    bumpRequestGeneration();
    setPendingChallenge(null);
    setWalletFocusHint(false);
    setError(null);
    setPhase("workspace");
  }, [bumpRequestGeneration]);

  const loadVerificationChallenge = useCallback(async (): Promise<boolean> => {
    if (!selectedPolicy || !workspace) return false;
    const generation = requestGenerationRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const resource = `abraxas:sandbox:${workspace.workspace_id}:policy:${selectedPolicy}`;
    const challengeResult = await fetchWalletActionChallenge({
      operation: "sandbox:verification:test",
      resource,
      policyId: selectedPolicy,
      signal: controller.signal,
    });
    if (generation !== requestGenerationRef.current) return false;
    if (!challengeResult.ok) {
      setError(mapSandboxEnterFailure(challengeResult.code));
      setPhase("workspace");
      return false;
    }
    setPendingChallenge(challengeResult.challenge);
    setError(null);
    setWalletFocusHint(false);
    setPhase("review");
    return true;
  }, [selectedPolicy, workspace]);

  const beginVerificationReview = useCallback(async () => {
    if (!signMessage) {
      setError("Connect your wallet in the browser to authorize test verification.");
      return;
    }
    setBusy(true);
    setResult(null);
    setValidation(null);
    setDecision(null);
    try {
      await loadVerificationChallenge();
    } finally {
      setBusy(false);
    }
  }, [loadVerificationChallenge, signMessage]);

  const submitSignedVerification = useCallback(
    async (input: { action_challenge_id: string; signature: string; generation: number }) => {
      if (input.generation !== requestGenerationRef.current) return;
      setPhase("submitting");
      try {
        const res = await fetch("/api/auth/wallet/sandbox/test-verify", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            policy_id: selectedPolicy,
            action_challenge_id: input.action_challenge_id,
            signature: input.signature,
          }),
        });
        if (input.generation !== requestGenerationRef.current) return;
        const json = (await res.json()) as {
          ok?: boolean;
          result?: TestResult;
          code?: string;
          decision?: string;
          unsupported?: boolean;
        };
        if (!res.ok || !json.result) {
          setPhase("workspace");
          setPendingChallenge(null);
          const hint =
            json.code === "insufficient_evidence_for_policy"
              ? "This policy needs authoritative identity evidence. Use wallet control for sandbox testing."
              : json.unsupported
                ? "That evidence issuer is not supported for this policy."
                : null;
          setError(hint ?? mapSandboxEnterFailure(json.code));
          return;
        }
        setResult(json.result);
        setDecision(json.decision ?? null);
        setPendingChallenge(null);
        setPhase("result");
        const validateRes = await fetch(
          `/api/auth/wallet/sandbox/validate?receipt_id=${encodeURIComponent(String(json.result.receipt_id))}`,
          { credentials: "same-origin" },
        );
        const validateJson = (await validateRes.json()) as { ok?: boolean; signature_valid?: boolean };
        if (input.generation === requestGenerationRef.current) {
          setValidation(validateJson);
        }
      } catch {
        if (input.generation === requestGenerationRef.current) {
          setPhase("workspace");
          setError("Network error during verification. Try again.");
        }
      }
    },
    [selectedPolicy],
  );

  const openPhantomForReview = useCallback(async () => {
    if (!pendingChallenge || !signMessage) return;
    const generation = requestGenerationRef.current;
    setBusy(true);
    setError(null);
    setWalletFocusHint(false);
    setPhase("signing");
    try {
      const signed = await signWalletActionChallenge({
        challenge: pendingChallenge,
        signMessage: (msg) => signMessage(msg),
        isStale: () => generation !== requestGenerationRef.current,
      });
      if (generation !== requestGenerationRef.current) return;
      if (!signed.ok) {
        setPhase(pendingChallenge ? "review" : "workspace");
        setError(mapSignFailure(signed.code));
        if (signed.code === "expired") {
          setPendingChallenge(null);
          setPhase("workspace");
        }
        return;
      }
      await submitSignedVerification({
        action_challenge_id: signed.action_challenge_id,
        signature: signed.signature,
        generation,
      });
    } finally {
      if (generation === requestGenerationRef.current) {
        setBusy(false);
      }
    }
  }, [pendingChallenge, signMessage, submitSignedVerification]);

  const retryVerificationRequest = useCallback(async () => {
    bumpRequestGeneration();
    setPendingChallenge(null);
    setWalletFocusHint(false);
    setError(null);
    setBusy(true);
    try {
      await loadVerificationChallenge();
    } finally {
      setBusy(false);
    }
  }, [bumpRequestGeneration, loadVerificationChallenge]);

  const signOut = useCallback(async () => {
    bumpRequestGeneration();
    await fetch("/api/auth/wallet/session", { method: "DELETE", credentials: "same-origin" });
    setWorkspace(null);
    setResult(null);
    setPendingChallenge(null);
    void hydrate();
  }, [hydrate, bumpRequestGeneration]);

  const selectedPolicyMeta = policies.find((p) => p.policy_id === selectedPolicy);
  const reviewTitle = verificationReviewTitle(selectedPolicy, selectedPolicyMeta?.label);
  const scopeNote = verificationReviewScopeNote(selectedPolicy);
  const display = pendingChallenge?.display;

  const stepIndex =
    phase === "ready" || phase === "entering" || phase === "failure"
      ? 0
      : phase === "workspace" || phase === "review" || phase === "signing" || phase === "submitting"
        ? 1
        : phase === "result"
          ? 3
          : 0;

  const steps = ["Open workspace", "Configure policy", "Verify", "Validate"];

  if (phase === "loading") {
    return (
      <div className={styles.shell}>
        <div className={styles.statusRow} role="status">
          <span className={styles.spinner} aria-hidden />
          Loading workspace…
        </div>
      </div>
    );
  }

  if (phase === "signed_out") {
    return (
      <div className={styles.shell}>
        <p className={styles.lead}>Sign in from the header to open your developer workspace.</p>
        <p className={styles.muted}>
          Wallet sign-in proves control of your address. It does not create a permanent personal account.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <div className={styles.workspaceHeader}>
        <span className={styles.sandboxBadge}>{EPHEMERAL_WORKSPACE_SANDBOX_BADGE}</span>
        <p className={styles.muted}>{EPHEMERAL_WORKSPACE_SANDBOX_EXPIRY_NOTE}</p>
      </div>

      <ol className={styles.steps} aria-label="Workspace progress">
        {steps.map((label, index) => (
          <li
            key={label}
            className={
              index < stepIndex ? styles.stepDone : index === stepIndex ? styles.stepActive : styles.step
            }
          >
            {label}
          </li>
        ))}
      </ol>

      <div className={styles.panel}>
        {(phase === "ready" || phase === "entering" || phase === "failure") && !workspace ? (
          <>
            <h2 className={styles.sectionTitle}>Start building</h2>
            <p className={styles.muted}>
              Your wallet session is active
              {walletAddress ? ` (${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)})` : ""}. Open an
              isolated sandbox to configure policies and run test verification.
            </p>
            {phase === "entering" ? (
              <div className={styles.statusRow} role="status">
                <span className={styles.spinner} aria-hidden />
                Preparing workspace…
              </div>
            ) : (
              <div className={styles.actions}>
                <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => void enterWorkspace()}>
                  Start building
                </button>
              </div>
            )}
          </>
        ) : null}

        {workspace && phase !== "review" && phase !== "signing" && phase !== "submitting" ? (
          <>
            <h2 className={styles.sectionTitle}>Configure test verification</h2>
            <p className={`${styles.meta} ${styles.muted}`}>
              Workspace {workspace.workspace_id.slice(0, 18)}… · expires{" "}
              {new Date(workspace.expires_at).toLocaleString()}
            </p>
            {publicKey ? null : (
              <p className={styles.note}>Connect your wallet to authorize test verification when you are ready.</p>
            )}
            <label className={styles.fieldLabel}>
              Test policy
              <select
                className={styles.select}
                value={selectedPolicy}
                disabled={busy}
                onChange={(e) => setSelectedPolicy(e.target.value)}
              >
                {policies.map((p) => (
                  <option key={p.policy_id} value={p.policy_id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            {selectedPolicyMeta?.description ? (
              <p className={styles.muted}>{selectedPolicyMeta.description}</p>
            ) : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy || !selectedPolicy || !signMessage}
                onClick={() => void beginVerificationReview()}
              >
                Run test verification
              </button>
              <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          </>
        ) : null}

        {phase === "review" && pendingChallenge ? (
          <div className={styles.reviewCard}>
            <h2 className={styles.sectionTitle}>{reviewTitle}</h2>
            <dl className={styles.reviewList}>
              <div>
                <dt>Policy</dt>
                <dd>{display?.policy_label ?? selectedPolicyMeta?.label ?? selectedPolicy}</dd>
              </div>
              <div>
                <dt>Environment</dt>
                <dd>{display?.environment ?? "Sandbox"}</dd>
              </div>
              <div>
                <dt>Requested by</dt>
                <dd>{display?.requested_by ?? "Abraxas Developer Workspace"}</dd>
              </div>
              {display?.wallet_address ? (
                <div>
                  <dt>Wallet</dt>
                  <dd className={styles.mono}>{display.wallet_address}</dd>
                </div>
              ) : null}
            </dl>
            <p className={styles.reviewLead}>You will sign a message confirming this test request.</p>
            <p className={styles.securityNote}>
              <strong>No funds move.</strong> No spending access is granted.
            </p>
            {scopeNote ? <p className={styles.note}>{scopeNote}</p> : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy}
                onClick={() => void openPhantomForReview()}
              >
                Review in Phantom
              </button>
              <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={cancelVerificationRequest}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {phase === "signing" ? (
          <div className={styles.reviewCard}>
            <h2 className={styles.sectionTitle}>Waiting for Phantom</h2>
            <div className={styles.statusRow} role="status">
              <span className={styles.spinner} aria-hidden />
              Review the request in Phantom.
            </div>
            {walletFocusHint ? (
              <p className={styles.note}>
                If the Phantom window closed, use Try again to create a fresh request. Abraxas cannot reopen your
                wallet popup.
              </p>
            ) : null}
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={cancelVerificationRequest}>
                Cancel request
              </button>
              <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={() => void retryVerificationRequest()}>
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {phase === "submitting" ? (
          <div className={styles.statusRow} role="status">
            <span className={styles.spinner} aria-hidden />
            Verifying signature…
          </div>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
            {correlationId ? ` Reference: ${correlationId}.` : ""}
            {error.includes("expired") ? (
              <>
                {" "}
                <button type="button" className={styles.linkBtn} onClick={() => void retryVerificationRequest()}>
                  Create a new request
                </button>
              </>
            ) : null}
          </p>
        ) : null}

        {result ? (
          <div className={styles.resultBox}>
            <p style={{ margin: "0 0 0.35rem" }}>
              <strong>Decision:</strong> {decision ?? "unknown"} · <strong>Label:</strong>{" "}
              {result.result_label || EPHEMERAL_SANDBOX_RESULT_LABEL} (test only)
            </p>
            <p style={{ margin: 0 }}>
              Receipt {String(result.receipt_id).slice(0, 24)}… · independent signature check:{" "}
              {validation?.signature_valid ? "valid" : validation ? "invalid" : "pending"}
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={busy}
                onClick={() => {
                  setResult(null);
                  setValidation(null);
                  setDecision(null);
                  setPhase("workspace");
                }}
              >
                Run another test
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
