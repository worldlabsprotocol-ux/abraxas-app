"use client";
// FILE: components/admin/operator/OperationalEmptyState.tsx

const FONT = "'Inter',system-ui,sans-serif";

export function OperationalEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div
      role="status"
      style={{
        padding: "1rem 1.1rem",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, margin: "0 0 0.35rem", color: "#f0f0f0" }}>
        {title}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, margin: 0, color: "rgba(255,255,255,0.62)" }}>
        {body}
      </p>
    </div>
  );
}
