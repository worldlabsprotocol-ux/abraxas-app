"use client";
// FILE: components/passport/PassportProfileHeader.tsx
// Instagram-style profile header — identity, progress, one primary action.

import { profileInitial, profileNavLabel, useUserProfile } from "@/lib/hooks/useUserProfile";
import { buildPassportProgress } from "@/lib/passport/passportProgress";
import type { PassportTierInput } from "@/lib/passport/passportTiers";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

interface Props {
  email: string;
  signedIn: boolean;
  tierInput: PassportTierInput;
  returnPath?: string | null;
  onEditProfile: () => void;
  onPrimaryAction?: () => void;
}

export function PassportProfileHeader({
  email,
  signedIn,
  tierInput,
  returnPath,
  onEditProfile,
  onPrimaryAction,
}: Props) {
  const { data: profile } = useUserProfile();
  const progress = buildPassportProgress(tierInput);
  const displayLabel = signedIn ? profileNavLabel(profile, email || null) : "Guest";
  const initial = profileInitial(profile, email || null);
  const avatarColor = profile?.avatar_color ?? ACCENT;

  const primaryHref =
    progress.primaryAction === "sign-in"
      ? undefined
      : progress.primaryAction === "add-wallet"
        ? "/passport?tab=wallets"
        : progress.primaryAction === "verify-identity"
          ? "/passport?tab=verifications"
          : returnPath
            ? decodeURIComponent(returnPath)
            : "/cielo/verified-rate";

  return (
    <header style={{
      display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start",
      marginBottom: "1.25rem", paddingBottom: "1.25rem",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 999, flexShrink: 0,
        background: `${avatarColor}33`, border: `2px solid ${avatarColor}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, color: avatarColor,
      }} aria-hidden>
        {initial}
      </div>

      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <h2 style={{
            fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800,
            color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em",
          }}>
            {displayLabel}
          </h2>
          {signedIn && (
            <span style={{
              fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
              padding: "0.15rem 0.45rem", borderRadius: 999,
              background: `${ACCENT}18`, color: ACCENT,
            }}>
              Passport {progress.statusLabel === "Ready to use" || progress.statusLabel === "Ready for pilot actions" ? "active" : "setup"}
            </span>
          )}
        </div>

        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
          margin: "0 0 0.35rem", lineHeight: 1.5,
        }}>
          Partners only see what you approve.
        </p>

        {signedIn && (
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            margin: "0 0 0.65rem", lineHeight: 1.5,
          }}>
            {progress.progressLine} · {progress.statusLabel}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.65rem" }}>
          {progress.steps.map(step => (
            <span key={step.id} style={{
              fontFamily: FONT, fontSize: "0.62rem", fontWeight: 600,
              padding: "0.2rem 0.5rem", borderRadius: 999,
              background: step.done ? `${ACCENT}18` : "var(--surface-inset)",
              color: step.done ? ACCENT : "var(--text-muted)",
              border: `1px solid ${step.done ? `${ACCENT}44` : "var(--border)"}`,
            }}>
              {step.done ? "✓ " : ""}{step.label}{step.optional ? " (optional)" : ""}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {signedIn && progress.primaryAction !== "sign-in" && (
            primaryHref ? (
              <Btn href={primaryHref} size="sm" onClick={onPrimaryAction}>
                {progress.primaryActionLabel} →
              </Btn>
            ) : null
          )}
          {signedIn && (
            <Btn variant="secondary" size="sm" onClick={onEditProfile}>
              Edit profile
            </Btn>
          )}
        </div>
      </div>
    </header>
  );
}
