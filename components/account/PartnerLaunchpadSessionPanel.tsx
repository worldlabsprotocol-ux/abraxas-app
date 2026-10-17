"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { launchpadResumeHref } from "@/lib/partner/activationPath";
import {
  ACCOUNT_PARTNER_RECOVERY_BODY,
  ACCOUNT_PARTNER_RECOVERY_TITLE,
  ACCOUNT_PARTNER_SESSION_BODY,
  ACCOUNT_PARTNER_SESSION_TITLE,
} from "@/lib/account/accountHubCopy";
import { INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function PartnerLaunchpadSessionPanel({
  signedIn,
  partnerId,
  environment,
  applicationId,
  onSessionChange,
  showInstitutionalShortcuts = true,
}: {
  signedIn: boolean;
  partnerId?: string | null;
  environment?: "sandbox" | "production" | null;
  applicationId?: string | null;
  onSessionChange: (authenticated: boolean) => void;
  showInstitutionalShortcuts?: boolean;
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

  async function signOutPartnerSession() {
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
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <div>
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
          {ACCOUNT_PARTNER_SESSION_TITLE}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0.35rem 0 0" }}>
          {ACCOUNT_PARTNER_SESSION_BODY}
        </p>
      </div>

      {signedIn ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-primary)" }}>
            Operator session active
            {partnerId ? ` · ${partnerId}` : ""}
            {environment ? ` · ${environment}` : ""}
          </span>
          <Btn href={launchpadResumeHref(applicationId ?? undefined)} size="sm">
            Open Launchpad
          </Btn>
          <Btn size="sm" variant="secondary" disabled={busy} onClick={() => void signOutPartnerSession()}>
            End operator session
          </Btn>
        </div>
      ) : (
        <>
          <div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {ACCOUNT_PARTNER_RECOVERY_TITLE}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0.25rem 0 0.5rem" }}>
              {ACCOUNT_PARTNER_RECOVERY_BODY}
            </p>
          </div>
          <label style={{ display: "grid", gap: "0.35rem", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700 }}>
            Sandbox or production API key
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
          {error && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: 0 }} role="alert">
              {error}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn size="sm" disabled={busy || !apiKeyInput.trim()} onClick={() => void signInWithKey()}>
              Attach operator session
            </Btn>
            {showInstitutionalShortcuts && (
              <>
                <Btn href="/developers/integration-studio" variant="secondary" size="sm">
                  Create sandbox in Studio
                </Btn>
                <Link
                  href={INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}
                  style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--accent)", alignSelf: "center" }}
                >
                  Institutional Launchpad →
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
