"use client";
// FILE: components/account/EphemeralSandboxWorkspaceClient.tsx

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { completeWalletActionAuthorization } from "@/lib/auth/ephemeralWallet/clientActionAuth";
import {
  EPHEMERAL_WORKSPACE_TEST_ONLY_NOTE,
  mapSandboxEnterFailure,
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
  | "verifying"
  | "result"
  | "failure";

function logSandboxStage(input: Record<string, unknown>): void {
  if (typeof console !== "undefined" && console.info) {
    console.info("[abraxas sandbox]", input);
  }
}

export function EphemeralSandboxWorkspaceClient() {
  const { signMessage, publicKey } = useWallet();
  const [phase, setPhase] = useState<WorkspacePhase>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);
  const [validation, setValidation] = useState<{ ok?: boolean; signature_valid?: boolean } | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);

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

  const runTestVerification = useCallback(async () => {
    if (!selectedPolicy || !workspace) return;
    if (!signMessage) {
      setError("Connect your wallet in the browser to authorize test verification.");
      return;
    }
    setBusy(true);
    setError(null);
    setValidation(null);
    setDecision(null);
    setPhase("verifying");
    try {
      const resource = `abraxas:sandbox:${workspace.workspace_id}:policy:${selectedPolicy}`;
      const action = await completeWalletActionAuthorization({
        operation: "sandbox:verification:test",
        resource,
        policyId: selectedPolicy,
        signMessage: (msg) => signMessage(msg),
      });
      if (!action.ok) {
        setPhase("workspace");
        setError(action.code === "cancelled" ? "Signature request dismissed." : action.code ?? "Authorization cancelled.");
        return;
      }
      const res = await fetch("/api/auth/wallet/sandbox/test-verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          policy_id: selectedPolicy,
          action_challenge_id: action.action_challenge_id,
          signature: action.signature,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        result?: TestResult;
        code?: string;
        decision?: string;
        unsupported?: boolean;
      };
      if (!res.ok || !json.result) {
        setPhase("workspace");
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
      setPhase("result");
      const validateRes = await fetch(
        `/api/auth/wallet/sandbox/validate?receipt_id=${encodeURIComponent(String(json.result.receipt_id))}`,
        { credentials: "same-origin" },
      );
      const validateJson = (await validateRes.json()) as { ok?: boolean; signature_valid?: boolean };
      setValidation(validateJson);
    } finally {
      setBusy(false);
    }
  }, [selectedPolicy, workspace, signMessage]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/wallet/session", { method: "DELETE", credentials: "same-origin" });
    setWorkspace(null);
    setResult(null);
    void hydrate();
  }, [hydrate]);

  const stepIndex =
    phase === "ready" || phase === "entering" || phase === "failure"
      ? 0
      : phase === "workspace" || phase === "verifying"
        ? 1
        : phase === "result"
          ? 3
          : 0;

  const steps = ["Authorize workspace", "Configure policy", "Verify", "Validate"];

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
            <p className={styles.lead}>Start building</p>
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

        {workspace ? (
          <>
            <p className={styles.lead}>Workspace ready</p>
            <p className={`${styles.meta} ${styles.muted}`}>
              {workspace.workspace_id.slice(0, 18)}… · expires {new Date(workspace.expires_at).toLocaleString()}
            </p>
            {publicKey ? null : (
              <p className={styles.note}>Connect your wallet to authorize test verification when you are ready.</p>
            )}
            <label className={styles.muted}>
              Test policy
              <select
                className={styles.select}
                value={selectedPolicy}
                onChange={(e) => setSelectedPolicy(e.target.value)}
              >
                {policies.map((p) => (
                  <option key={p.policy_id} value={p.policy_id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={busy || !selectedPolicy}
                onClick={() => void runTestVerification()}
              >
                Run test verification
              </button>
              <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
            {phase === "verifying" ? (
              <div className={styles.statusRow} role="status">
                <span className={styles.spinner} aria-hidden />
                Waiting for wallet signature…
              </div>
            ) : null}
          </>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
            {correlationId ? ` Reference: ${correlationId}.` : ""}
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
          </div>
        ) : null}

        <p className={styles.note}>{EPHEMERAL_WORKSPACE_TEST_ONLY_NOTE}</p>
      </div>
    </div>
  );
}
