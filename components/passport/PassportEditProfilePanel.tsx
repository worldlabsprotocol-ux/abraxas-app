"use client";
// FILE: components/passport/PassportEditProfilePanel.tsx
// Profile-only edit — photo, name, bio. No wallets, KYC, or security controls.

import { useCallback, useEffect, useState } from "react";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { Btn } from "@/components/redesign/ui";
import { notifyProfileUpdated, useUserProfile, type UserProfile } from "@/lib/hooks/useUserProfile";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const AVATAR_COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.65rem", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text-primary)", fontFamily: FONT, fontSize: "0.85rem",
  boxSizing: "border-box",
};

export function PassportEditProfilePanel({ onClose }: { onClose: () => void }) {
  const { suiAddress, session } = useSuiAuth();
  const email = session?.email ?? null;
  const { data: profile, isLoading } = useUserProfile();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hydrate = useCallback((p: UserProfile | null | undefined) => {
    setDisplayName(p?.display_name ?? "");
    setUsername(p?.username ?? "");
    setBio(p?.bio ?? "");
    if (p?.avatar_color) setAvatarColor(p.avatar_color);
  }, []);

  useEffect(() => {
    hydrate(profile);
  }, [profile, hydrate]);

  async function save() {
    if (!suiAddress) return;
    setSaving(true);
    setErr(null);
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
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      notifyProfileUpdated();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      borderRadius: 16,
      padding: "1.15rem 1.25rem",
      marginBottom: "1.25rem",
    }} aria-labelledby="edit-profile-heading">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <h2 id="edit-profile-heading" style={{
            fontFamily: FONT, fontSize: "1rem", fontWeight: 800,
            color: "var(--text-primary)", margin: "0 0 0.25rem",
          }}>
            Edit profile
          </h2>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
            How you appear on Abraxas. Wallets and verification live in their own tabs.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close edit profile" style={{
          border: "none", background: "transparent", color: "var(--text-muted)",
          fontFamily: FONT, fontSize: "1.1rem", cursor: "pointer", lineHeight: 1,
        }}>
          ×
        </button>
      </div>

      {isLoading ? (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <label style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Avatar color
            <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Avatar color ${c}`}
                  onClick={() => setAvatarColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 999, border: avatarColor === c ? "2px solid #fff" : "2px solid transparent",
                    background: c, cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </label>
          <label style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Display name
            <input value={displayName} onChange={e => setDisplayName(e.target.value.slice(0, 48))} placeholder="How partners see you" style={{ ...inputStyle, marginTop: "0.25rem" }} />
          </label>
          <label style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Username
            <input value={username} onChange={e => setUsername(e.target.value.slice(0, 24).replace(/\s/g, ""))} placeholder="Optional handle" style={{ ...inputStyle, marginTop: "0.25rem" }} />
          </label>
          <label style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Short bio
            <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 160))} rows={2} placeholder="Optional — business or role" style={{ ...inputStyle, marginTop: "0.25rem", resize: "vertical" }} />
          </label>
          {email && (
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0 }}>
              Sign-in email: {email} (managed by Google)
            </p>
          )}
          {err && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Btn size="sm" loading={saving} onClick={() => void save()}>Save profile</Btn>
            <Btn size="sm" variant="ghost" onClick={onClose}>Cancel</Btn>
          </div>
        </div>
      )}
    </section>
  );
}
