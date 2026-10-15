"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { PassportReusableCredentialSummary } from "@/lib/passport/reusableCredential/contract";

const FONT = ABRAXAS_FONT_SANS;

export function PassportReusableCredentialsPanel({ sessionReady }: { sessionReady: boolean }) {
  const [credentials, setCredentials] = useState<PassportReusableCredentialSummary[]>([]);
  const [sandboxOnly, setSandboxOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionReady) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/passport/reusable-credentials", { credentials: "include" });
      const data = (await res.json()) as {
        credentials?: PassportReusableCredentialSummary[];
        sandbox_only?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "load_failed");
      setCredentials(data.credentials ?? []);
      setSandboxOnly(data.sandbox_only !== false);
    } catch {
      setError("Reusable credentials are unavailable right now.");
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [sessionReady]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCredential(credentialId: string) {
    setBusy(credentialId);
    try {
      const res = await fetch("/api/passport/reusable-credentials/export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential_id: credentialId }),
      });
      const data = (await res.json()) as { credential?: unknown; error?: string };
      if (!res.ok || !data.credential) throw new Error(data.error ?? "export_failed");
      const blob = new Blob([JSON.stringify(data.credential, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `abraxas-reusable-credential-${credentialId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Sign in and try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!sessionReady) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
        Sign in to view issuer-signed reusable credentials.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>
        Reusable credentials are issuer-signed eligibility assurances you hold once. Each institution still receives its
        own partner-bound authorization receipt after you approve a scoped presentation — credentials are not receipts.
        {sandboxOnly ? " Sandbox-labeled demo in this environment." : ""}
      </p>
      {loading ? <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)" }}>Loading…</p> : null}
      {error ? <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--danger)" }}>{error}</p> : null}
      {credentials.map((cred) => (
        <div
          key={cred.credential_id}
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            padding: "0.75rem",
            display: "grid",
            gap: "0.35rem",
          }}
        >
          <strong style={{ fontFamily: FONT, fontSize: "0.82rem" }}>{cred.credential_id}</strong>
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Issuer: {cred.issuer_id} · Assurance: {cred.assurance_level} · Claims: {cred.claim_labels.join(", ")}
          </span>
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Valid until {new Date(cred.expires_at).toLocaleDateString()} · {cred.status}
          </span>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>
            {cred.limitations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Btn
            variant="secondary"
            disabled={busy === cred.credential_id}
            onClick={() => void exportCredential(cred.credential_id)}
          >
            {busy === cred.credential_id ? "Exporting…" : "Export credential (not account recovery)"}
          </Btn>
        </div>
      ))}
      {!loading && credentials.length === 0 && !error ? (
        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
          No reusable credentials are available for this environment yet.
        </p>
      ) : null}
    </div>
  );
}
