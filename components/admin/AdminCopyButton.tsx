"use client";
// FILE: components/admin/AdminCopyButton.tsx
// Accessible explicit clipboard copy control for admin operator surfaces.

import { useEffect, useId, useState } from "react";
import {
  CLIPBOARD_FAILED_COPY,
  CLIPBOARD_SUCCESS_COPY,
  CLIPBOARD_UNAVAILABLE_COPY,
  copyTextToClipboard,
} from "@/lib/admin/designPartnerPromoteReadiness";

const FONT = "'Inter',system-ui,sans-serif";

export function AdminCopyButton({
  text,
  label,
  disabled = false,
  resetKey,
  testId,
}: {
  text: string;
  label: string;
  disabled?: boolean;
  resetKey?: string | number | null;
  testId?: string;
}) {
  const statusId = useId();
  const [status, setStatus] = useState<"idle" | "success" | "unavailable" | "failed">("idle");

  useEffect(() => {
    setStatus("idle");
  }, [resetKey, text]);

  useEffect(() => () => {
    setStatus("idle");
  }, []);

  async function handleCopy() {
    if (!text || disabled) return;
    const result = await copyTextToClipboard(text);
    setStatus(result === "success" ? "success" : result);
  }

  const statusCopy = status === "success"
    ? CLIPBOARD_SUCCESS_COPY
    : status === "unavailable"
      ? CLIPBOARD_UNAVAILABLE_COPY
      : status === "failed"
        ? CLIPBOARD_FAILED_COPY
        : null;

  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={disabled || !text}
        aria-label={label}
        aria-describedby={statusCopy ? statusId : undefined}
        data-testid={testId}
        style={{
          fontFamily: FONT,
          fontSize: "0.72rem",
          fontWeight: 700,
          minHeight: 44,
          minWidth: 44,
          padding: "0.45rem 0.75rem",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-primary)",
          cursor: disabled || !text ? "not-allowed" : "pointer",
        }}
      >
        {label}
      </button>
      {statusCopy && (
        <span
          id={statusId}
          role="status"
          aria-live="polite"
          data-testid={testId ? `${testId}-status` : undefined}
          style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}
        >
          {statusCopy}
        </span>
      )}
    </div>
  );
}
