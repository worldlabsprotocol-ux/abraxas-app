"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { launchpadResumeHref } from "@/lib/partner/activationPath";
import {
  ACCOUNT_PARTNER_LINKED_MEMBERSHIPS_TITLE,
  ACCOUNT_PARTNER_RECOVERY_BODY,
  ACCOUNT_PARTNER_RECOVERY_TITLE,
  ACCOUNT_PARTNER_SESSION_BODY,
  ACCOUNT_PARTNER_SESSION_TITLE,
} from "@/lib/account/accountHubCopy";
import { INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";
import {
  claimApplicationMembershipWithApiKey,
  establishLaunchpadSessionWithAccount,
  establishLaunchpadSessionWithApiKey,
} from "@/lib/partner/launchpad/launchpadSessionClient";
import { PartnerMembershipRecoveryPanel } from "@/components/account/PartnerMembershipRecoveryPanel";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function PartnerLaunchpadSessionPanel({
  signedIn,
  partnerId,
  environment,
  applicationId,
  onSessionChange,
  showInstitutionalShortcuts = true,
  recoveryApplicationId,
  recoveryPartnerId,
  linkedMemberships = [],
}: {
  signedIn: boolean;
  partnerId?: string | null;
  environment?: "sandbox" | "production" | null;
  applicationId?: string | null;
  onSessionChange: (authenticated: boolean) => void;
  showInstitutionalShortcuts?: boolean;
  recoveryApplicationId?: string;
  recoveryPartnerId?: string;
  linkedMemberships?: Array<{ partner_id: string; role: string }>;
}) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [nativeAccountSignedIn, setNativeAccountSignedIn] = useState(false);
  const [showApiKeyFallback, setShowApiKeyFallback] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/auth/native/session", { credentials: "include" });
      const data = (await res.json()) as { authenticated?: boolean };
      setNativeAccountSignedIn(Boolean(data.authenticated));
    })();
  }, []);

  const signInWithKey = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await establishLaunchpadSessionWithApiKey(apiKeyInput);
      if (!result.ok) {
        setError(result.error ?? "Could not attach Launchpad session");
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

  const signInWithAccount = useCallback(
    async (input?: { applicationId?: string | null; partnerId?: string | null }) => {
      setBusy(true);
      setError("");
      try {
        const result = await establishLaunchpadSessionWithAccount({
          applicationId: input?.applicationId ?? applicationId,
          partnerId: input?.partnerId ?? partnerId,
        });
        if (!result.ok) {
          if (result.status === 403) {
            setError("Partner membership required. Request authorized access below or use a one-time API key.");
          } else {
            setError(result.error ?? "Could not attach Launchpad session");
          }
          onSessionChange(false);
          return;
        }
        onSessionChange(true);
      } catch {
        setError("Could not attach Launchpad session");
        onSessionChange(false);
      } finally {
        setBusy(false);
      }
    },
    [applicationId, onSessionChange, partnerId],
  );

  const claimAndAttach = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const claim = await claimApplicationMembershipWithApiKey(apiKeyInput);
      if (!claim.ok) {
        setError(claim.code === "api_key_invalid" ? "API key not recognized" : "Could not link membership");
        onSessionChange(false);
        return;
      }
      setApiKeyInput("");
      setShowApiKeyFallback(false);
      onSessionChange(true);
    } catch {
      setError("Could not link membership");
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
          {nativeAccountSignedIn && linkedMemberships.length > 0 ? (
            <div style={{ display: "grid", gap: "0.45rem" }}>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {ACCOUNT_PARTNER_LINKED_MEMBERSHIPS_TITLE}
              </div>
              {linkedMemberships.map((m) => (
                <div key={m.partner_id} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                    {m.partner_id} · {m.role}
                  </span>
                  <Btn
                    size="sm"
                    disabled={busy}
                    onClick={() => void signInWithAccount({ partnerId: m.partner_id, applicationId: recoveryApplicationId })}
                  >
                    Resume Launchpad
                  </Btn>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {nativeAccountSignedIn ? (
              <Btn
                size="sm"
                disabled={busy}
                onClick={() =>
                  void signInWithAccount({
                    applicationId: recoveryApplicationId ?? applicationId,
                    partnerId: recoveryPartnerId ?? partnerId,
                  })
                }
              >
                Resume Launchpad with account
              </Btn>
            ) : (
              <Btn href="/account/applications" size="sm" variant="secondary">
                Sign in to Abraxas account
              </Btn>
            )}
          </div>

          <PartnerMembershipRecoveryPanel
            nativeAccountSignedIn={nativeAccountSignedIn}
            defaultApplicationId={recoveryApplicationId}
            defaultPartnerId={recoveryPartnerId}
            onMembershipLinked={() => void signInWithAccount()}
          />

          <div>
            <button
              type="button"
              onClick={() => setShowApiKeyFallback((v) => !v)}
              style={{
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {showApiKeyFallback ? "Hide" : "Show"} {ACCOUNT_PARTNER_RECOVERY_TITLE.toLowerCase()}
            </button>
            {showApiKeyFallback ? (
              <>
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0.35rem 0 0.5rem" }}>
                  {ACCOUNT_PARTNER_RECOVERY_BODY}
                </p>
                <label style={{ display: "grid", gap: "0.35rem", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700 }}>
                  Sandbox API key
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <Btn size="sm" disabled={busy || !apiKeyInput.trim()} onClick={() => void claimAndAttach()}>
                    Link membership with API key
                  </Btn>
                  <Btn size="sm" variant="secondary" disabled={busy || !apiKeyInput.trim()} onClick={() => void signInWithKey()}>
                    Attach session only
                  </Btn>
                </div>
              </>
            ) : null}
          </div>

          {error && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: 0 }} role="alert">
              {error}
            </p>
          )}

          {showInstitutionalShortcuts && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Btn href="/developers/integration-studio" variant="secondary" size="sm">
                Create sandbox in Studio
              </Btn>
              <Link
                href={INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF}
                style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--accent)", alignSelf: "center" }}
              >
                Institutional Launchpad →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
