"use client";
// FILE: components/passport/PassportProfileHeader.tsx
// Profile presentation only — trust summary links to canonical sections.

import Link from "next/link";
import { profileInitial, profileNavLabel, useUserProfile } from "@/lib/hooks/useUserProfile";
import { buildTrustStatusLine } from "@/lib/passport/passportCanonicalState";
import type { PassportCanonicalState } from "@/lib/passport/passportCanonicalState";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

interface Props {
  email: string;
  signedIn: boolean;
  canonical: PassportCanonicalState | null;
  onEditProfile: () => void;
}

export function PassportProfileHeader({
  email,
  signedIn,
  canonical,
  onEditProfile,
}: Props) {
  const { data: profile } = useUserProfile();
  const displayLabel = signedIn ? profileNavLabel(profile, email || null) : "Guest";
  const initial = profileInitial(profile, email || null);
  const avatarColor = profile?.avatar_color ?? ACCENT;
  const trustLine = canonical ? buildTrustStatusLine(canonical) : null;

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
          {profile?.username && (
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
              @{profile.username}
            </span>
          )}
        </div>

        {profile?.bio && (
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0 0 0.35rem", lineHeight: 1.5 }}>
            {profile.bio}
          </p>
        )}

        <p style={{
          fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
          margin: "0 0 0.5rem", lineHeight: 1.5,
        }}>
          Partners only see what you approve.
        </p>

        {signedIn && trustLine && (
          <p style={{
            fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)",
            margin: "0 0 0.65rem", lineHeight: 1.5,
          }}>
            {trustLine}
            {" · "}
            <Link href="/passport?tab=verification" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>Verification</Link>
            {" · "}
            <Link href="/passport?tab=wallets" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>Wallets</Link>
            {" · "}
            <Link href="/passport?tab=access" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>Access</Link>
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
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
