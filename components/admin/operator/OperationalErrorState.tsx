"use client";
// FILE: components/admin/operator/OperationalErrorState.tsx

const FONT = "'Inter',system-ui,sans-serif";

export function OperationalErrorState({
  title = "Could not load operator data",
  message,
  onRetry,
  retryLabel = "Retry",
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      style={{
        padding: "1rem 1.1rem",
        borderRadius: 12,
        border: "1px solid rgba(248,113,113,0.35)",
        background: "rgba(248,113,113,0.08)",
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, margin: "0 0 0.35rem", color: "#fecaca" }}>
        {title}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, margin: "0 0 0.65rem", color: "rgba(255,255,255,0.78)" }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: "0.45rem 0.75rem",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "#f0f0f0",
            fontFamily: FONT,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
