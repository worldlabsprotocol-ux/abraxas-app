"use client";
// FILE: components/passport/PassportSignInRecoveryPanel.tsx
// Persistent wrong-path zkLogin recovery guidance on Passport.

import { useCallback } from "react";
import { useGoogleSignIn } from "@/lib/hooks/useGoogleSignIn";
import { ZKLOGIN_SIGN_IN_COPY } from "@/lib/sui/zklogin/signInCopy";
import {
  recoveryPrimaryActionHelper,
  recoveryPrimaryActionLabel,
  type SignInRecoveryState,
} from "@/lib/sui/zklogin/signInRecovery";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const RED = "#EF4444";

export function PassportSignInRecoveryPanel({
  recovery,
  onDismiss,
}: {
  recovery: SignInRecoveryState;
  onDismiss: () => void;
}) {
  const {
    signIn,
    signInExistingAccount,
    busy,
    legacyBusy,
    configured,
    legacyRecoveryConfigured,
    disabled,
    legacyDisabled,
  } = useGoogleSignIn();

  const suggestedMode = recovery.suggestedMode;
  const primaryLabel = suggestedMode
    ? recoveryPrimaryActionLabel(suggestedMode)
    : ZKLOGIN_SIGN_IN_COPY.canonicalButton;
  const primaryHelper = suggestedMode
    ? recoveryPrimaryActionHelper(suggestedMode)
    : ZKLOGIN_SIGN_IN_COPY.canonicalHelper;

  const handlePrimary = useCallback(() => {
    if (suggestedMode === "legacy_recovery") {
      void signInExistingAccount();
      return;
    }
    void signIn();
  }, [signIn, signInExistingAccount, suggestedMode]);

  const primaryDisabled = suggestedMode === "legacy_recovery"
    ? legacyDisabled
    : disabled;
  const primaryBusy = suggestedMode === "legacy_recovery" ? legacyBusy : busy;
  const primaryConfigured = suggestedMode === "legacy_recovery"
    ? legacyRecoveryConfigured
    : configured;

  return (
    <section
      aria-labelledby="passport-signin-recovery-heading"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: `1px solid ${RED}55`,
        borderRadius: 16,
        padding: "1.15rem 1.25rem",
        marginBottom: "1.25rem",
      }}
    >
      <div style={{
        fontFamily: FONT,
        fontSize: "0.58rem",
        fontWeight: 700,
        color: RED,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: "0.45rem",
      }}>
        Sign-in needs a different path
      </div>

      <h2
        id="passport-signin-recovery-heading"
        style={{
          fontFamily: FONT,
          fontSize: "1rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          margin: "0 0 0.55rem",
          lineHeight: 1.35,
        }}
      >
        {recovery.message}
      </h2>

      {suggestedMode && (
        <>
          <button
            type="button"
            onClick={handlePrimary}
            disabled={primaryDisabled || !primaryConfigured}
            aria-label={suggestedMode === "legacy_recovery"
              ? ZKLOGIN_SIGN_IN_COPY.legacyAriaLabel
              : ZKLOGIN_SIGN_IN_COPY.canonicalAriaLabel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.7rem 1rem",
              borderRadius: 999,
              border: "none",
              background: primaryConfigured ? ACCENT : "var(--border)",
              color: primaryConfigured ? "#000" : "var(--text-muted)",
              fontFamily: FONT,
              fontSize: "0.86rem",
              fontWeight: 700,
              cursor: primaryDisabled || !primaryConfigured ? "not-allowed" : "pointer",
              opacity: primaryBusy ? 0.75 : 1,
              marginBottom: "0.45rem",
            }}
          >
            <span aria-hidden="true" style={{ fontWeight: 800 }}>G</span>
            {primaryBusy ? ZKLOGIN_SIGN_IN_COPY.redirecting : primaryLabel}
          </button>
          <p style={{
            fontFamily: FONT,
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            lineHeight: 1.55,
            margin: "0 0 0.85rem",
          }}>
            {primaryHelper}
          </p>
        </>
      )}

      <button
        type="button"
        onClick={onDismiss}
        aria-label={ZKLOGIN_SIGN_IN_COPY.recoveryDismissAriaLabel}
        style={{
          padding: "0.45rem 0.85rem",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-secondary)",
          fontFamily: FONT,
          fontSize: "0.72rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {ZKLOGIN_SIGN_IN_COPY.recoveryDismissButton}
      </button>
    </section>
  );
}
