"use client";
// FILE: components/passport/PassportGate.tsx
// Sign-in gate for diligence packs. captures investigators inside Abraxas.

import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { useGoogleSignIn } from "@/lib/hooks/useGoogleSignIn";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function PassportGate({
  returnPath,
  title = "Sign in to unlock",
  description = "Full diligence packs, lot schedules, and survey PDFs stay inside Abraxas Passport. verify once, access anywhere.",
  children,
}: {
  returnPath: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useSuiAuth();
  const { signIn, busy, disabled } = useGoogleSignIn();

  if (isLoading) {
    return (
      <div style={{
        padding: "1.25rem", borderRadius: 12,
        border: "1px solid var(--border)", background: "var(--surface)",
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)",
      }}>
        Checking Passport session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        padding: "1.25rem 1.35rem", borderRadius: 14,
        border: `1px solid ${ACCENT}44`, background: `${ACCENT}08`,
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
          {title}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
          {description}
        </p>
        <button
          type="button"
          onClick={() => void signIn()}
          disabled={disabled}
          style={{
            padding: "0.65rem 1.25rem", borderRadius: 999,
            border: "none", background: ACCENT, color: "#04130C",
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800,
            letterSpacing: "0.06em", textTransform: "uppercase",
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.75 : 1,
          }}
        >
          {busy ? "Redirecting…" : "Continue with Google →"}
        </button>
        <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
          Public registry and headline pricing stay open. Detailed packs release after sign-in. closed loop on Abraxas.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
