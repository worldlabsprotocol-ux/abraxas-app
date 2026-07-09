"use client";
// FILE: components/verify/VerifyProfilePanel.tsx
// Profile creation on /verify — username, display name, avatar color.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { Btn } from "@/components/redesign/ui";
import { notifyProfileUpdated } from "@/lib/hooks/useUserProfile";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const AVATAR_COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];

interface UserProfile {
  wallet_address: string;
  username?: string | null;
  display_name?: string | null;
  email?: string | null;
  bio?: string | null;
  avatar_color?: string | null;
}

function avatarInitial(profile: UserProfile | null, email: string | null): string {
  const name = profile?.display_name || profile?.username || email || "?";
  return name.charAt(0).toUpperCase();
}

export function VerifyProfilePanel() {
  const { isAuthenticated, suiAddress, session } = useSuiAuth();
  const email = session?.email ?? null;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!suiAddress) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/profile/upsert?sui=${encodeURIComponent(suiAddress)}`);
      const data = await res.json() as { profile?: UserProfile | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load profile");
      if (data.profile) {
        setProfile(data.profile);
        setUsername(data.profile.username ?? "");
        setDisplayName(data.profile.display_name ?? "");
        setBio(data.profile.bio ?? "");
        if (data.profile.avatar_color) setAvatarColor(data.profile.avatar_color);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [suiAddress]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function saveProfile() {
    if (!suiAddress) return;
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch("/api/profile/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sui_address: suiAddress,
          wallet_address: suiAddress,
          username: username.trim() || undefined,
          display_name: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          email: email ?? undefined,
          avatar_color: avatarColor,
        }),
      });
      const data = await res.json() as { profile?: UserProfile; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setProfile(data.profile ?? null);
      setSaved(true);
      notifyProfileUpdated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated || !suiAddress) {
    return (
      <div style={{ padding: "1.25rem", borderRadius: 16, background: "var(--surface-raised)", border: "1px solid var(--border-strong)" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          Your profile
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 1rem", maxWidth: 480 }}>
          Sign in to create a public profile: username, display name, and avatar. Connects your verify identity to the rest of the platform.
        </p>
        <ZkLoginSignIn compact={false} />
      </div>
    );
  }

  const initial = avatarInitial(profile, email);

  return (
    <div style={{ padding: "1.25rem", borderRadius: 16, background: "var(--surface-raised)", border: "1px solid var(--border-strong)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
            Your profile
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, maxWidth: 420 }}>
            Add a username and avatar so partners recognize you across verify, passport, and booking flows.
          </p>
        </div>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: avatarColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT,
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "#04130C",
            boxShadow: `0 0 24px ${avatarColor}44`,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
      </div>

      {loading ? (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>Loading profile…</p>
      ) : (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)" }}>Username</span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 24))}
              placeholder="yourhandle"
              style={inputStyle}
            />
            <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)" }}>Letters, numbers, underscore · max 24</span>
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)" }}>Display name</span>
            <input value={displayName} onChange={e => setDisplayName(e.target.value.slice(0, 48))} placeholder="How you appear to partners" style={inputStyle} />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)" }}>Bio (optional)</span>
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 160))} rows={2} placeholder="One line about you or your fund" style={{ ...inputStyle, resize: "vertical", minHeight: 64 }} />
          </label>

          <div>
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "0.45rem" }}>Avatar color</span>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Avatar color ${c}`}
                  onClick={() => setAvatarColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: c,
                    border: avatarColor === c ? "2px solid #fff" : "2px solid transparent",
                    cursor: "pointer",
                    boxShadow: avatarColor === c ? `0 0 0 2px ${c}` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
            Wallet · {suiAddress.slice(0, 12)}…{suiAddress.slice(-8)}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            <Btn size="sm" loading={saving} onClick={() => void saveProfile()}>Save profile</Btn>
            <Btn href="/passport" variant="secondary" size="sm">Complete Passport →</Btn>
            <Btn href="/account" variant="ghost" size="sm">My account</Btn>
          </div>

          {saved && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, margin: 0 }}>Profile saved ✓</p>}
          {err && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: 0 }}>{err}</p>}
        </div>
      )}

      <p style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", margin: "1rem 0 0", lineHeight: 1.55 }}>
        ID verification is optional until a partner policy requires it.{" "}
        <Link href="/passport#identity-stamp" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>Add ID later →</Link>
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.65rem 0.85rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-inset)",
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-primary)",
  width: "100%",
};
