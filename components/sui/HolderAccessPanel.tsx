"use client";
// FILE: components/sui/HolderAccessPanel.tsx
// Wallet-first holder entry with separated legacy Google Passport continuity.

import { useState } from "react";
import { useGoogleSignIn } from "@/lib/hooks/useGoogleSignIn";
import { useSuiAuth } from "./SuiAuthProvider";
import { HolderWalletAuthPanel } from "@/components/passport/HolderWalletAuthPanel";
import {
  HOLDER_LEGACY_GOOGLE_DETAIL,
  HOLDER_LEGACY_GOOGLE_LABEL,
  HOLDER_PASSPORT_ACCOUNT_HEADING,
  HOLDER_WALLET_SESSION_MISMATCH,
} from "@/lib/sui/holderAccessCopy";
import { ZKLOGIN_SIGN_IN_COPY } from "@/lib/sui/zklogin/signInCopy";
import { shouldShowLegacySignInOption } from "@/lib/sui/zklogin/signInChooserState";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#4CBB92";

export function HolderAccessPanel({ compact = false }: { compact?: boolean }) {
  const { suiAddress, isAuthenticated } = useSuiAuth();
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
  const [legacyOpen, setLegacyOpen] = useState(false);
  const showLegacy = shouldShowLegacySignInOption({ configured, legacyRecoveryConfigured });

  if (isAuthenticated && suiAddress) {
    return null;
  }

  return (
    <div
      style={{
        border: `1px solid ${ACCENT}33`,
        borderRadius: compact ? 10 : 14,
        padding: compact ? "0.85rem 1rem" : "1.15rem 1.25rem",
        background: "var(--surface)",
      }}
    >
      <p style={{
        fontFamily: FONT,
        fontSize: "0.58rem",
        fontWeight: 700,
        color: ACCENT,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        margin: "0 0 0.35rem",
      }}
      >
        Wallet authentication
      </p>
      <HolderWalletAuthPanel compact={compact} />

      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
        <button
          type="button"
          onClick={() => setLegacyOpen((v) => !v)}
          aria-expanded={legacyOpen}
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
            color: "var(--text-primary)",
            textAlign: "left",
          }}
        >
          <span>{HOLDER_PASSPORT_ACCOUNT_HEADING}</span>
          <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>{legacyOpen ? "−" : "+"}</span>
        </button>

        {legacyOpen ? (
          <div style={{ marginTop: "0.75rem" }}>
            <p style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              margin: "0 0 0.75rem",
            }}
            >
              {HOLDER_LEGACY_GOOGLE_DETAIL}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => void signIn()}
                disabled={disabled}
                aria-label={ZKLOGIN_SIGN_IN_COPY.canonicalAriaLabel}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.55rem 1rem",
                  borderRadius: 999,
                  border: `1px solid ${ACCENT}55`,
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontFamily: FONT,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: configured && !busy ? "pointer" : "not-allowed",
                  opacity: busy ? 0.7 : 1,
                }}
              >
                <span aria-hidden="true" style={{ fontWeight: 800 }}>G</span>
                {busy ? ZKLOGIN_SIGN_IN_COPY.redirecting : HOLDER_LEGACY_GOOGLE_LABEL}
              </button>
              {showLegacy ? (
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
              ) : null}
            </div>
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
          </div>
        ) : null}
      </div>

    </div>
  );
}

export { HOLDER_WALLET_SESSION_MISMATCH };
