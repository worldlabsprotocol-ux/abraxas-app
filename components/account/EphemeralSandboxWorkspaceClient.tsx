"use client";
// FILE: components/account/EphemeralSandboxWorkspaceClient.tsx

import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
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

export function EphemeralSandboxWorkspaceClient() {
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);
  const [validation, setValidation] = useState<{ ok?: boolean; signature_valid?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/auth/wallet/session", { credentials: "same-origin" });
    const body = (await res.json()) as { authenticated?: boolean };
    setSessionOk(Boolean(body.authenticated));
  }, []);

  useEffect(() => {
    void refreshSession();
    void fetch("/api/auth/wallet/sandbox/policies", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((json: { policies?: Policy[] }) => {
        const list = json.policies ?? [];
        setPolicies(list);
        if (list[0]) setSelectedPolicy(list[0].policy_id);
      })
      .catch(() => setPolicies([]));
  }, [refreshSession]);

  const enterSandbox = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/wallet/sandbox/enter", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const json = (await res.json()) as { ok?: boolean; workspace?: Workspace; code?: string };
      if (!res.ok || !json.workspace) {
        setError(json.code ?? "Could not open sandbox workspace.");
        return;
      }
      setWorkspace(json.workspace);
    } finally {
      setBusy(false);
    }
  }, []);

  const runTestVerification = useCallback(async () => {
    if (!selectedPolicy) return;
    setBusy(true);
    setError(null);
    setValidation(null);
    try {
      const res = await fetch("/api/auth/wallet/sandbox/test-verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ policy_id: selectedPolicy }),
      });
      const json = (await res.json()) as { ok?: boolean; result?: TestResult; code?: string };
      if (!res.ok || !json.result) {
        setError(json.code ?? "Test verification failed.");
        return;
      }
      setResult(json.result);
      const validateRes = await fetch(
        `/api/auth/wallet/sandbox/validate?receipt_id=${encodeURIComponent(String(json.result.receipt_id))}`,
        { credentials: "same-origin" },
      );
      const validateJson = (await validateRes.json()) as { ok?: boolean; signature_valid?: boolean };
      setValidation(validateJson);
    } finally {
      setBusy(false);
    }
  }, [selectedPolicy]);

  if (sessionOk === null) {
    return <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading…</p>;
  }

  if (!sessionOk) {
    return (
      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Sign in with your Solana wallet to use the temporary sandbox. No personal account is created.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Temporary developer sandbox — metadata and test results expire automatically. Test privileges cannot
        authorize Production access.
      </p>
      {!workspace ? (
        <Btn size="sm" disabled={busy} onClick={() => void enterSandbox()}>
          Start building
        </Btn>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Workspace {workspace.workspace_id.slice(0, 20)}… · expires {new Date(workspace.expires_at).toLocaleString()}
          </p>
          <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Test policy
            <select
              value={selectedPolicy}
              onChange={(e) => setSelectedPolicy(e.target.value)}
              style={{ display: "block", marginTop: "0.35rem", width: "100%", maxWidth: 420 }}
            >
              {policies.map((p) => (
                <option key={p.policy_id} value={p.policy_id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <Btn size="sm" disabled={busy || !selectedPolicy} onClick={() => void runTestVerification()}>
            Submit authorized test verification
          </Btn>
        </>
      )}
      {error ? <p style={{ color: "#E0524F", fontSize: "0.72rem" }}>{error}</p> : null}
      {result ? (
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
          <p style={{ margin: "0 0 0.35rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>Result label:</strong>{" "}
            {result.result_label || EPHEMERAL_SANDBOX_RESULT_LABEL} (not Production)
          </p>
          <p style={{ margin: "0 0 0.35rem" }}>
            Receipt {String(result.receipt_id).slice(0, 24)}… · signature verified independently:{" "}
            {validation?.signature_valid ? "yes" : validation ? "no" : "…"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
