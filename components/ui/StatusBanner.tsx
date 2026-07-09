"use client";
// FILE: components/ui/StatusBanner.tsx

import type { ReactNode } from "react";
import { Spinner } from "./Spinner";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

type Tone = "success" | "pending" | "error" | "info";

const TONE_STYLES: Record<Tone, { border: string; bg: string; color: string }> = {
  success: { border: "rgba(16,185,129,0.35)", bg: "rgba(16,185,129,0.1)", color: "#10B981" },
  pending: { border: "rgba(245,158,11,0.35)", bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
  error: { border: "rgba(239,68,68,0.35)", bg: "rgba(239,68,68,0.1)", color: "#EF4444" },
  info: { border: "var(--border)", bg: "var(--surface)", color: "var(--text-secondary)" },
};

export function StatusBanner({
  tone,
  title,
  children,
  loading,
  action,
}: {
  tone: Tone;
  title: string;
  children?: ReactNode;
  loading?: boolean;
  action?: React.ReactNode;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "1rem 1.1rem",
        borderRadius: 12,
        border: `1px solid ${s.border}`,
        background: s.bg,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem" }}>
        {loading && <Spinner color={s.color} size={16} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: s.color, marginBottom: children ? "0.35rem" : 0 }}>
            {title}
          </div>
          {children && (
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
              {children}
            </div>
          )}
          {action && <div style={{ marginTop: "0.75rem" }}>{action}</div>}
        </div>
      </div>
    </div>
  );
}
