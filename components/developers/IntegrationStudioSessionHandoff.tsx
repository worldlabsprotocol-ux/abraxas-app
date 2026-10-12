"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { launchpadResumeHref } from "@/lib/partner/activationPath";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function IntegrationStudioSessionHandoff({
  signedIn,
  applicationId,
  onSessionChange,
}: {
  signedIn: boolean;
  applicationId: string | null;
  onSessionChange: (authenticated: boolean) => void;
}) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signInWithKey = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/launchpad/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKeyInput.trim()}` },
        credentials: "include",
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not attach Launchpad session");
        onSessionChange(false);
        return;
      }
      setApiKeyInput("");
      onSessionChange(true);
    } catch {
      setError("Could not attach Launchpad session");
      onSessionChange(false);
    } finally {
      setBusy(false);
    }
  }, [apiKeyInput, onSessionChange]);

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await fetch("/api/launchpad/auth/session", { method: "DELETE", credentials: "include" });
      onSessionChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ContentCard title="Launchpad session" id="configuration">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
        Integration Studio uses the same Launchpad session cookie as Partner Launchpad — no second identity system.
        Creating a sandbox here issues a one-time API key and attaches your browser session automatically.
      </p>
      {signedIn ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-primary)" }}>
            Session active{applicationId ? ` · app ${applicationId.slice(0, 8)}…` : ""}
          </span>
          {applicationId && (
            <Btn href={launchpadResumeHref(applicationId)} variant="secondary" size="sm">
              Open in Launchpad
            </Btn>
          )}
          <Btn size="sm" variant="secondary" disabled={busy} onClick={() => void signOut()}>
            End session
          </Btn>
        </div>
      ) : (
        <>
          <label style={{ display: "grid", gap: "0.35rem", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700 }}>
            Resume with sandbox API key
            <input
              type="password"
              autoComplete="off"
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="Paste key shown once at provisioning"
              style={{
                fontFamily: MONO,
                fontSize: "0.72rem",
                padding: "0.55rem 0.65rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-inset)",
                color: "var(--text-primary)",
              }}
            />
          </label>
          {error && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)" }}>{error}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
            <Btn size="sm" disabled={busy || !apiKeyInput.trim()} onClick={() => void signInWithKey()}>
              Attach session
            </Btn>
            <Link href="/developers/launchpad" style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center" }}>
              Provision in Launchpad →
            </Link>
          </div>
        </>
      )}
    </ContentCard>
  );
}
