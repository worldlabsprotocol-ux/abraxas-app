"use client";
// FILE: components/sui/ZkLoginSignInChooserDialog.tsx
// Accessible modal chooser for canonical vs existing Passport sign-in.

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useGoogleSignIn } from "@/lib/hooks/useGoogleSignIn";
import { ZKLOGIN_SIGN_IN_COPY } from "@/lib/sui/zklogin/signInCopy";
import { shouldShowLegacySignInOption } from "@/lib/sui/zklogin/signInChooserState";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

export function ZkLoginSignInChooserDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

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

  const showLegacy = shouldShowLegacySignInOption({ configured, legacyRecoveryConfigured });

  const handleCanonical = useCallback(() => {
    void signIn();
  }, [signIn]);

  const handleLegacy = useCallback(() => {
    void signInExistingAccount();
  }, [signInExistingAccount]);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const panel = panelRef.current;
    const focusables = panel ? getFocusableElements(panel) : [];
    focusables[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const items = getFocusableElements(panel);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const primaryStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "0.7rem 1rem",
    borderRadius: 999,
    border: "none",
    background: ACCENT,
    color: "#000",
    fontFamily: FONT,
    fontSize: "0.86rem",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: busy ? 0.75 : 1,
  };

  const secondaryStyle: CSSProperties = {
    ...primaryStyle,
    background: "transparent",
    color: "var(--text-secondary)",
    border: `1px solid ${ACCENT}55`,
    opacity: legacyBusy ? 0.75 : 1,
  };

  const helperStyle: CSSProperties = {
    fontFamily: FONT,
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    lineHeight: 1.55,
    margin: "0.45rem 0 0",
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom))",
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(4px)",
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          width: "min(100%, 22rem)",
          maxHeight: "min(90vh, 32rem)",
          overflowY: "auto",
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "var(--surface-raised, var(--surface))",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
          padding: "1.15rem 1.15rem 1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.9rem" }}>
          <h2
            id={titleId}
            style={{
              fontFamily: FONT,
              fontSize: "1rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {ZKLOGIN_SIGN_IN_COPY.chooserTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={ZKLOGIN_SIGN_IN_COPY.closeButton}
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              fontFamily: FONT,
              fontSize: "1.1rem",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <button
          type="button"
          onClick={handleCanonical}
          disabled={disabled}
          aria-label={ZKLOGIN_SIGN_IN_COPY.canonicalAriaLabel}
          style={primaryStyle}
        >
          <span aria-hidden="true" style={{ fontWeight: 800 }}>G</span>
          {busy ? ZKLOGIN_SIGN_IN_COPY.redirecting : ZKLOGIN_SIGN_IN_COPY.canonicalButton}
        </button>
        <p style={helperStyle}>{ZKLOGIN_SIGN_IN_COPY.canonicalHelper}</p>

        {showLegacy && (
          <>
            <div
              role="separator"
              aria-hidden="true"
              style={{
                height: 1,
                background: "var(--border)",
                margin: "1rem 0 0.85rem",
              }}
            />
            <p style={{
              fontFamily: FONT,
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--text-secondary)",
              margin: "0 0 0.55rem",
            }}>
              {ZKLOGIN_SIGN_IN_COPY.legacySectionHeading}
            </p>
            <button
              type="button"
              onClick={handleLegacy}
              disabled={legacyDisabled}
              aria-label={ZKLOGIN_SIGN_IN_COPY.legacyAriaLabel}
              style={secondaryStyle}
            >
              {legacyBusy ? ZKLOGIN_SIGN_IN_COPY.redirecting : ZKLOGIN_SIGN_IN_COPY.legacyButton}
            </button>
            <p style={helperStyle}>{ZKLOGIN_SIGN_IN_COPY.legacyHelper}</p>
          </>
        )}

        {error && (
          <p
            role="alert"
            style={{
              ...helperStyle,
              marginTop: "0.85rem",
              color: "#EF4444",
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
