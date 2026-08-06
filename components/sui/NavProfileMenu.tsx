"use client";
// FILE: components/sui/NavProfileMenu.tsx
// Signed-in profile menu. Passport, account, submit asset (replaces nav Passport tab).

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSuiAuthOptional } from "./SuiAuthProvider";
import { profileInitial, profileNavLabel, useUserProfile } from "@/lib/hooks/useUserProfile";
import { useGoogleSignIn } from "@/lib/hooks/useGoogleSignIn";
import { useAdminAccess } from "@/lib/hooks/useAdminAccess";
import { useAdminIdentityPendingCount } from "@/lib/hooks/useAdminIdentityPendingCount";
import {
  ADMIN_IDENTITY_NAV,
  adminIdentityPendingAriaLabel,
  formatAdminIdentityPendingBadge,
  shouldShowAdminIdentityNav,
} from "@/lib/admin/adminIdentityNav";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  NAV_SIGN_IN_COPY,
  resolveNavSignInUiState,
} from "@/lib/nav/navSignInButtonState";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";
const DEFAULT_AVATAR = "#10B981";

const OTHER_ADMIN_MENU_ITEMS = [
  { label: "Asset reviews", href: "/admin", description: "Verification center" },
  { label: "Partners & keys", href: "/admin/partners", description: "Relying party registry" },
] as const;

const MENU_ITEMS = [
  { label: "Passport", href: "/passport", description: "Your proofs & verification" },
  { label: "Account settings", href: "/account", description: "Name, profile, status" },
  { label: "Verify a record", href: "/verify", description: "Look up an asset" },
  { label: "Tokenize an asset", href: "/build", description: "Start owner intake" },
  { label: "Design partners", href: "/design-partner", description: "For apps integrating Abraxas" },
] as const;

export function NavProfileMenu({ prominent = false }: { prominent?: boolean }) {
  const auth = useSuiAuthOptional();
  const { data: profile } = useUserProfile();
  const addr = auth?.suiAddress ?? null;
  const { isAdmin } = useAdminAccess({ enabled: Boolean(addr) });
  const showAdminNav = shouldShowAdminIdentityNav(isAdmin);
  const { pendingCount } = useAdminIdentityPendingCount(isAdmin);
  const pendingBadge = formatAdminIdentityPendingBadge(pendingCount, isAdmin);
  const pendingAria = adminIdentityPendingAriaLabel(pendingCount);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const email = auth?.session?.email ?? null;
  const configured = auth?.isConfigured ?? false;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (addr) {
    const label = profileNavLabel(profile, email);
    const avatarColor = profile?.avatar_color ?? DEFAULT_AVATAR;
    const initial = profileInitial(profile, email);

    return (
      <div ref={rootRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.45rem" }}>
        {showAdminNav && (
          <span
            title="Signed-in account has admin access"
            aria-label="Admin access enabled"
            style={{
              fontFamily: FONT,
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: ACCENT,
              padding: "0.28rem 0.55rem",
              borderRadius: 999,
              border: `1px solid ${ACCENT}44`,
              background: `${ACCENT}12`,
              whiteSpace: "nowrap",
            }}
          >
            Admin Access ✓
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: prominent ? "0.45rem 0.95rem 0.45rem 0.45rem" : "0.4rem 0.85rem 0.4rem 0.4rem",
            borderRadius: 999,
            border: `1px solid ${avatarColor}55`,
            background: `${avatarColor}14`,
            fontFamily: FONT,
            fontSize: prominent ? "0.82rem" : "0.78rem",
            color: "var(--text-primary)",
            fontWeight: 700,
            cursor: "pointer",
            maxWidth: prominent ? 220 : 188,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: avatarColor,
              color: "#04130C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initial}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </span>
          <span style={{ fontSize: "0.55rem", opacity: 0.7, flexShrink: 0 }}>{open ? "▴" : "▾"}</span>
        </button>

        {open && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              minWidth: 240,
              padding: "0.45rem",
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--nav-bg-solid)",
              boxShadow: "var(--shadow-soft)",
              zIndex: 400,
            }}
          >
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "0.65rem 0.7rem",
                  borderRadius: 10,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {item.description}
                </div>
              </Link>
            ))}
            {showAdminNav && (
              <>
                <div style={{ height: 1, background: "var(--border)", margin: "0.35rem 0" }} />
                <div style={{ padding: "0.35rem 0.7rem 0.2rem", fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  {ADMIN_IDENTITY_NAV.sectionLabel}
                </div>
                <Link
                  href={ADMIN_IDENTITY_NAV.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  aria-label={pendingAria ? `${ADMIN_IDENTITY_NAV.label}, ${pendingAria}` : ADMIN_IDENTITY_NAV.label}
                  style={{
                    display: "block",
                    padding: "0.65rem 0.7rem",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: ACCENT }}>
                      {ADMIN_IDENTITY_NAV.label}
                    </div>
                    {pendingBadge && (
                      <span
                        aria-hidden={Boolean(pendingAria)}
                        style={{
                          fontFamily: FONT,
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          color: "#04130C",
                          background: ACCENT,
                          borderRadius: 999,
                          padding: "0.15rem 0.45rem",
                          minWidth: "1.25rem",
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {pendingBadge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {ADMIN_IDENTITY_NAV.description}
                  </div>
                </Link>
                {OTHER_ADMIN_MENU_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    style={{
                      display: "block",
                      padding: "0.65rem 0.7rem",
                      borderRadius: 10,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: ACCENT }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {item.description}
                    </div>
                  </Link>
                ))}
              </>
            )}
            <div style={{ height: 1, background: "var(--border)", margin: "0.35rem 0" }} />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                auth?.signOut();
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "0.55rem 0.7rem",
                borderRadius: 10,
                border: "none",
                background: "transparent",
                fontFamily: FONT,
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function NavSignInButton({ prominent = false }: { prominent?: boolean }) {
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

  const uiState = resolveNavSignInUiState({ configured, legacyRecoveryConfigured });

  if (uiState === "unavailable") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          maxWidth: prominent ? 220 : 200,
        }}
      >
        <span
          style={{
            padding: prominent ? "0.55rem 1rem" : "0.5rem 0.95rem",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--surface-inset)",
            fontFamily: FONT,
            fontSize: prominent ? "0.82rem" : "0.78rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {NAV_SIGN_IN_COPY.unavailable}
        </span>
        <span style={{
          fontFamily: FONT,
          fontSize: "0.62rem",
          color: "var(--text-muted)",
          textAlign: "right",
          lineHeight: 1.4,
        }}>
          {NAV_SIGN_IN_COPY.unavailableHint}
        </span>
      </div>
    );
  }

  const buttonStyle = (primary: boolean): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: prominent ? "0.55rem 1rem" : "0.5rem 0.95rem",
    borderRadius: 999,
    border: primary ? "none" : `1px solid ${ACCENT}55`,
    background: primary ? ACCENT : "transparent",
    color: primary ? "#000" : "var(--text-secondary)",
    fontFamily: FONT,
    fontSize: prominent ? "0.84rem" : "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    opacity: (primary ? busy : legacyBusy) ? 0.75 : 1,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "0.45rem" }}>
        <button
          type="button"
          onClick={() => void signIn()}
          disabled={disabled}
          aria-label={NAV_SIGN_IN_COPY.canonicalAriaLabel}
          style={buttonStyle(true)}
        >
          <span aria-hidden="true" style={{ fontWeight: 800, fontSize: "0.9rem" }}>G</span>
          {busy ? "Redirecting…" : NAV_SIGN_IN_COPY.canonical}
        </button>
        {uiState === "canonical_and_legacy" && (
          <button
            type="button"
            onClick={() => void signInExistingAccount()}
            disabled={legacyDisabled}
            aria-label={NAV_SIGN_IN_COPY.legacyAriaLabel}
            style={buttonStyle(false)}
          >
            {legacyBusy ? "Redirecting…" : NAV_SIGN_IN_COPY.legacy}
          </button>
        )}
      </div>
      {error && (
        <span style={{
          fontFamily: FONT,
          fontSize: "0.62rem",
          color: "#EF4444",
          maxWidth: 240,
          textAlign: "right",
          lineHeight: 1.4,
        }}>
          {error}
        </span>
      )}
    </div>
  );
}
