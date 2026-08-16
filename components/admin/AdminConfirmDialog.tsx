"use client";
// FILE: components/admin/AdminConfirmDialog.tsx
// Reusable confirmation dialog for admin mutations.

import { useEffect, useId, useRef, type CSSProperties } from "react";
import {
  getAdminConfirmCopy,
  interpolateConfirmCopy,
  type AdminConfirmActionKey,
} from "@/lib/admin/adminConfirmCopy";

const FONT = "'Inter',system-ui,sans-serif";

const RISK_CONFIRM_STYLES: Record<"medium" | "high", CSSProperties> = {
  medium: {
    background: "#10B981",
    color: "#04120e",
    border: "none",
  },
  high: {
    background: "rgba(239,68,68,0.18)",
    color: "#FCA5A5",
    border: "1px solid rgba(239,68,68,0.45)",
  },
};

export interface AdminConfirmDialogProps {
  open: boolean;
  busy: boolean;
  actionKey: AdminConfirmActionKey | null;
  context: Record<string, string | number>;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminConfirmDialog({
  open,
  busy,
  actionKey,
  context,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement;
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!busy) {
          event.preventDefault();
          onCancel();
        }
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [open, busy, onCancel]);

  if (!open || !actionKey) return null;

  const copy = getAdminConfirmCopy(actionKey);
  const title = interpolateConfirmCopy(copy.title, context);
  const body = interpolateConfirmCopy(copy.body, context);
  const reasonMissing = copy.requireReasonCode && !String(context.reasonCode ?? "").trim();
  const confirmDisabled = busy || reasonMissing;
  const confirmStyle = copy.risk === "high"
    ? RISK_CONFIRM_STYLES.high
    : RISK_CONFIRM_STYLES.medium;

  return (
    <div
      role="presentation"
      onClick={() => { if (!busy) onCancel(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.72)",
        display: "grid",
        placeItems: "center",
        padding: "1rem",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={event => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#0d1017",
          color: "#f0f0f0",
          padding: "1.1rem 1.15rem",
          boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
        }}
      >
        <h2
          id={titleId}
          style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.65rem" }}
        >
          {title}
        </h2>
        <p
          id={bodyId}
          style={{
            fontFamily: FONT,
            fontSize: "0.78rem",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.72)",
            margin: "0 0 1rem",
            whiteSpace: "pre-wrap",
          }}
        >
          {body}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "rgba(255,255,255,0.75)",
              fontFamily: FONT,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.55 : 1,
            }}
          >
            {copy.cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: 8,
              fontFamily: FONT,
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: confirmDisabled ? "not-allowed" : "pointer",
              opacity: confirmDisabled ? 0.55 : 1,
              ...confirmStyle,
            }}
          >
            {busy ? "Working…" : copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
