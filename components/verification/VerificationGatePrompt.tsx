"use client";
// FILE: components/verification/VerificationGatePrompt.tsx
// Shared UI when policy check-level requires deep verification before an action.

import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

export function VerificationGatePrompt({
  actionLabel,
  missingClaims,
  onRecheck,
  rechecking = false,
  compact = false,
}: {
  actionLabel: string;
  missingClaims: string[];
  onRecheck?: () => void;
  rechecking?: boolean;
  compact?: boolean;
}) {
  return (
    <div style={{
      padding: compact ? "0.75rem" : "1rem",
      borderRadius: 14,
      background: "rgba(245,158,11,0.08)",
      border: "1px solid rgba(245,158,11,0.28)",
      marginBottom: compact ? "0.65rem" : "0.85rem",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        color: AMBER, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem",
      }}>
        ID verification required
      </div>
      <p style={{
        fontFamily: FONT, fontSize: compact ? "0.72rem" : "0.78rem",
        color: "var(--text-secondary)", margin: "0 0 0.65rem", lineHeight: 1.6,
      }}>
        {actionLabel} requires a verified Passport. Complete a quick ID check — we only share
        what partners need, not your full document.
      </p>
      {missingClaims.length > 0 && (
        <p style={{
          fontFamily: MONO, fontSize: "0.52rem", color: "var(--text-muted)",
          margin: "0 0 0.65rem", lineHeight: 1.5,
        }}>
          Missing: {missingClaims.join(", ")}
        </p>
      )}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <Link href="/passport#passport-step-2" style={{
          display: "inline-block", padding: "0.55rem 1rem", borderRadius: 999,
          background: ACCENT, color: "#000", fontFamily: FONT,
          fontSize: "0.75rem", fontWeight: 800, textDecoration: "none",
        }}>
          Complete ID check →
        </Link>
        {onRecheck && (
          <button type="button" onClick={onRecheck} disabled={rechecking}
            style={{
              padding: "0.55rem 0.85rem", borderRadius: 999,
              border: `1px solid ${ACCENT}66`, background: "transparent", color: ACCENT,
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
              cursor: rechecking ? "wait" : "pointer",
            }}>
            {rechecking ? "Checking…" : "Re-check status"}
          </button>
        )}
      </div>
    </div>
  );
}
