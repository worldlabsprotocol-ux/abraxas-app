"use client";
// FILE: components/passport/PassportEntryPanel.tsx
// Single primary Abraxas Passport entry — wallet options secondary.

import { useId, useState } from "react";
import { useGoogleSignIn } from "@/lib/hooks/useGoogleSignIn";
import { ZKLOGIN_SIGN_IN_COPY } from "@/lib/sui/zklogin/signInCopy";
import {
  ABRAXAS_CONTINUE_HEADLINE,
  ABRAXAS_CONTINUE_SECURELY_LABEL,
  ABRAXAS_OAUTH_PROVIDER_FOOTNOTE,
  PASSPORT_PRODUCT_TAGLINE,
} from "@/lib/product/abraxasIdentityExperienceCopy";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HolderWalletAuthPanel } from "@/components/passport/HolderWalletAuthPanel";
import { shouldShowLegacySignInOption } from "@/lib/sui/zklogin/signInChooserState";
import { HOLDER_LEGACY_GOOGLE_DETAIL } from "@/lib/sui/holderAccessCopy";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";

export function PassportEntryPanel({ compact = false }: { compact?: boolean }) {
  const {
    signIn,
    signInExistingAccount,
    busy,
    legacyBusy,
    configured,
    legacyRecoveryConfigured,
    disabled,
    legacyDisabled,
    error,
  } = useGoogleSignIn();
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const recoveryId = useId();
  const showLegacy = shouldShowLegacySignInOption({ configured, legacyRecoveryConfigured });

  return (
    <div
      style={{
        border: `1px solid ${ACCENT}33`,
        borderRadius: compact ? 12 : 16,
        padding: compact ? "1rem" : "1.25rem",
        background: "var(--surface)",
      }}
    >
      <h2 style={{
        fontFamily: FONT,
        fontSize: compact ? "0.95rem" : "1.05rem",
        fontWeight: 800,
        margin: "0 0 0.35rem",
        color: "var(--text-primary)",
      }}
      >
        {ABRAXAS_CONTINUE_HEADLINE}
      </h2>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.82rem",
        lineHeight: 1.55,
        color: "var(--text-secondary)",
        margin: "0 0 1rem",
      }}
      >
        {PASSPORT_PRODUCT_TAGLINE}
      </p>

      <button
        type="button"
        onClick={() => void signIn()}
        disabled={disabled || !configured}
        aria-label={ZKLOGIN_SIGN_IN_COPY.canonicalAriaLabel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          padding: "0.75rem 1rem",
          borderRadius: 999,
          border: "none",
          background: configured ? ACCENT : "var(--border)",
          color: configured ? "#04130C" : "var(--text-muted)",
          fontFamily: FONT,
          fontSize: "0.86rem",
          fontWeight: 700,
          cursor: disabled || !configured ? "not-allowed" : "pointer",
          opacity: busy ? 0.75 : 1,
        }}
      >
        {busy ? ZKLOGIN_SIGN_IN_COPY.redirecting : ABRAXAS_CONTINUE_SECURELY_LABEL}
      </button>

      <p style={{
        fontFamily: FONT,
        fontSize: "0.68rem",
        lineHeight: 1.5,
        color: "var(--text-muted)",
        margin: "0.65rem 0 0",
      }}
      >
        {ABRAXAS_OAUTH_PROVIDER_FOOTNOTE}
      </p>

      {(error || !configured) && (
        <p style={{
          fontFamily: FONT,
          fontSize: "0.72rem",
          color: !configured ? "var(--text-muted)" : "#E0524F",
          margin: "0.65rem 0 0",
          lineHeight: 1.55,
        }}
        >
          {error ?? "Sign-in is not configured in this environment."}
        </p>
      )}

      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
        <button
          type="button"
          aria-expanded={recoveryOpen}
          aria-controls={recoveryId}
          onClick={() => setRecoveryOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--text-secondary)",
            textAlign: "left",
          }}
        >
          <span>Other sign-in options and account recovery</span>
          <span aria-hidden="true">{recoveryOpen ? "−" : "+"}</span>
        </button>

        {recoveryOpen ? (
          <div id={recoveryId} style={{ marginTop: "0.85rem", display: "grid", gap: "0.85rem" }}>
            <p style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              lineHeight: 1.55,
              color: "var(--text-muted)",
              margin: 0,
            }}>
              Connecting a wallet does not sign you in or approve sharing. Choose a sign-in action when you are ready.
            </p>
            <HolderWalletAuthPanel compact secondaryMode />
            {showLegacy ? (
              <div>
                <p style={{
                  fontFamily: FONT,
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.55,
                  margin: "0 0 0.5rem",
                }}
                >
                  {HOLDER_LEGACY_GOOGLE_DETAIL}
                </p>
                <button
                  type="button"
                  onClick={() => void signInExistingAccount()}
                  disabled={legacyDisabled}
                  aria-label={ZKLOGIN_SIGN_IN_COPY.legacyAriaLabel}
                  style={{
                    padding: "0.55rem 1rem",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    fontFamily: FONT,
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    cursor: !legacyDisabled ? "pointer" : "not-allowed",
                    opacity: legacyBusy ? 0.7 : 1,
                  }}
                >
                  {legacyBusy ? ZKLOGIN_SIGN_IN_COPY.redirecting : ZKLOGIN_SIGN_IN_COPY.legacyButton}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
