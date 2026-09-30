"use client";
// FILE: components/admin/operator/OperatorActionPanel.tsx
// Neutral action presentation — approval is not the default visual emphasis.

const FONT = "'Inter',system-ui,sans-serif";

export interface OperatorAction {
  id: string;
  label: string;
  description: string;
  tone: "neutral" | "approve" | "reject" | "caution";
  disabled?: boolean;
  onSelect: () => void;
}

const TONE_STYLES: Record<OperatorAction["tone"], { border: string; color: string; background: string }> = {
  neutral: { border: "1px solid rgba(255,255,255,0.18)", color: "#f0f0f0", background: "transparent" },
  approve: { border: "1px solid rgba(16,185,129,0.35)", color: "#6ee7b7", background: "rgba(16,185,129,0.08)" },
  reject: { border: "1px solid rgba(248,113,113,0.35)", color: "#fecaca", background: "rgba(248,113,113,0.06)" },
  caution: { border: "1px solid rgba(245,158,11,0.35)", color: "#fcd34d", background: "rgba(245,158,11,0.06)" },
};

export function OperatorActionPanel({
  title = "Available actions",
  actions,
}: {
  title?: string;
  actions: OperatorAction[];
}) {
  return (
    <section aria-label={title} style={{ marginTop: "0.85rem" }}>
      <h4 style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", margin: "0 0 0.45rem" }}>
        {title}
      </h4>
      <div style={{ display: "grid", gap: "0.45rem" }}>
        {actions.map((action) => {
          const style = TONE_STYLES[action.tone];
          return (
            <button
              key={action.id}
              type="button"
              disabled={action.disabled}
              aria-label={action.label}
              onClick={action.onSelect}
              style={{
                textAlign: "left",
                padding: "0.65rem 0.75rem",
                borderRadius: 10,
                border: style.border,
                background: style.background,
                color: style.color,
                fontFamily: FONT,
                cursor: action.disabled ? "not-allowed" : "pointer",
                opacity: action.disabled ? 0.55 : 1,
              }}
            >
              <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 700 }}>{action.label}</span>
              <span style={{ display: "block", fontSize: "0.68rem", marginTop: "0.2rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.45 }}>
                {action.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
