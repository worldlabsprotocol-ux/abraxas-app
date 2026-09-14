"use client";
// FILE: components/passport/PassportReauthenticationPanel.tsx
// Re-establish HttpOnly browser session when local zkLogin state outlived the cookie.

import { useGoogleSignIn } from "@/lib/hooks/useGoogleSignIn";
import { ZKLOGIN_SIGN_IN_COPY } from "@/lib/sui/zklogin/signInCopy";
import {
  PASSPORT_REAUTH_EXPLAINER,
  PASSPORT_REAUTH_HEADLINE,
  PASSPORT_REAUTH_LABEL,
} from "@/lib/passport/passportCustomerCopy";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";

const FONT = ABRAXAS_FONT_SANS;

export function PassportReauthenticationPanel() {
  const { signIn, busy, configured, disabled } = useGoogleSignIn();

  return (
    <section
      aria-labelledby="passport-reauth-heading"
      style={{
        background: PUBLIC_SURFACE.cardBackground,
        border: PUBLIC_SURFACE.cardBorder,
        borderRadius: PUBLIC_SURFACE.cardRadius,
        padding: PUBLIC_SURFACE.cardPadding,
        marginBottom: "1rem",
      }}
    >
      <h2
        id="passport-reauth-heading"
        style={{
          fontFamily: FONT,
          fontSize: "0.95rem",
          fontWeight: 800,
          margin: "0 0 0.5rem",
        }}
      >
        {PASSPORT_REAUTH_HEADLINE}
      </h2>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.84rem",
        lineHeight: 1.6,
        color: "var(--text-secondary)",
        margin: "0 0 1rem",
      }}>
        {PASSPORT_REAUTH_EXPLAINER}
      </p>
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={disabled || !configured}
        aria-label={PASSPORT_REAUTH_LABEL}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          width: "100%",
          padding: "0.75rem 1rem",
          borderRadius: 999,
          border: "none",
          background: configured ? "#10B981" : "var(--border)",
          color: configured ? "#000" : "var(--text-muted)",
          fontFamily: FONT,
          fontSize: "0.86rem",
          fontWeight: 700,
          cursor: disabled || !configured ? "not-allowed" : "pointer",
          opacity: busy ? 0.75 : 1,
        }}
      >
        <span aria-hidden="true" style={{ fontWeight: 800 }}>G</span>
        {busy ? ZKLOGIN_SIGN_IN_COPY.redirecting : PASSPORT_REAUTH_LABEL}
      </button>
    </section>
  );
}
