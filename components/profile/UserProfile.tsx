// FILE: components/profile/UserProfile.tsx
// Wallet-linked user profile. Loads on wallet connect, persists to Supabase.
// Non-crypto users can also create a profile via email.
"use client";

import { useState, useEffect, useCallback } from "react";

const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S   = "system-ui,-apple-system,sans-serif";
const G   = "#10B981";
const A   = "#F59E0B";
const B   = "#3B82F6";
const W   = "#F8FAFC";
const BDR = "#1C2333";
const BG  = "#0D1117";

interface Profile {
  wallet_address: string;
  username:       string | null;
  display_name:   string | null;
  email:          string | null;
  bio:            string | null;
  passport_level: string;
  created_at:     string;
}

const inp: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.75rem", borderRadius: 5,
  border: `1px solid ${BDR}`, background: "rgba(255,255,255,0.03)",
  color: W, fontFamily: S, fontSize: "16px", outline: "none",
  boxSizing: "border-box",
};

export function UserProfile({
  walletAddress,
  onProfileLoaded,
}: {
  walletAddress?: string | null;
  onProfileLoaded?: (profile: Profile) => void;
}) {
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Refs for controlled-free inputs (prevent Android keyboard dismiss)
  const [draftName,  setDraftName]  = useState("");
  const [draftUser,  setDraftUser]  = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftBio,   setDraftBio]   = useState("");

  const loadProfile = useCallback(async (wallet: string) => {
    setLoading(true);
    try {
      // Check localStorage cache first for instant load
      const cached = localStorage.getItem(`abraxas_profile_${wallet}`);
      if (cached) {
        const p = JSON.parse(cached) as Profile;
        setProfile(p);
        onProfileLoaded?.(p);
      }
      // Always fetch fresh from Supabase
      const res  = await fetch(`/api/profile/upsert?wallet=${encodeURIComponent(wallet)}`);
      const data = await res.json() as { profile: Profile | null };
      if (data.profile) {
        setProfile(data.profile);
        localStorage.setItem(`abraxas_profile_${wallet}`, JSON.stringify(data.profile));
        onProfileLoaded?.(data.profile);
      } else {
        // First time, auto-create minimal profile
        await createProfile(wallet);
      }
    } catch { /* network error, cached data still shown */ }
    finally { setLoading(false); }
  }, [onProfileLoaded]);

  async function createProfile(wallet: string) {
    const res  = await fetch("/api/profile/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: wallet }),
    });
    const data = await res.json() as { profile: Profile };
    if (data.profile) {
      setProfile(data.profile);
      localStorage.setItem(`abraxas_profile_${wallet}`, JSON.stringify(data.profile));
      onProfileLoaded?.(data.profile);
    }
  }

  async function saveProfile() {
    if (!walletAddress) return;
    setSaving(true); setError(null);
    try {
      const res  = await fetch("/api/profile/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          display_name:   draftName  || undefined,
          username:       draftUser  || undefined,
          email:          draftEmail || undefined,
          bio:            draftBio   || undefined,
        }),
      });
      const data = await res.json() as { profile?: Profile; error?: string };
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      if (data.profile) {
        setProfile(data.profile);
        localStorage.setItem(`abraxas_profile_${walletAddress}`, JSON.stringify(data.profile));
        onProfileLoaded?.(data.profile);
        setEditing(false);
      }
    } catch { setError("Network error, try again"); }
    finally { setSaving(false); }
  }

  // Load profile when wallet changes
  useEffect(() => {
    if (walletAddress) {
      loadProfile(walletAddress);
    } else {
      setProfile(null);
    }
  }, [walletAddress, loadProfile]);

  // Populate draft fields when entering edit mode
  useEffect(() => {
    if (editing && profile) {
      setDraftName(profile.display_name ?? "");
      setDraftUser(profile.username    ?? "");
      setDraftEmail(profile.email      ?? "");
      setDraftBio(profile.bio          ?? "");
    }
  }, [editing, profile]);

  const passportColor =
    profile?.passport_level === "ELITE"    ? "#8B5CF6"
    : profile?.passport_level === "TRUSTED"  ? B
    : profile?.passport_level === "VERIFIED" ? G
    : profile?.passport_level === "BASIC"    ? A
    : "rgba(255,255,255,0.2)";

  // No wallet, prompt to connect
  if (!walletAddress) {
    return (
      <div style={{ padding:"1.25rem", background:BG, border:`1px solid ${BDR}`,
                     borderRadius:8, textAlign:"center" }}>
        <div style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                       color:"rgba(255,255,255,0.3)", letterSpacing:"0.15em",
                       textTransform:"uppercase", marginBottom:"0.5rem" }}>
          ABRAXAS PROFILE
        </div>
        <div style={{ fontFamily:"Georgia,serif", fontSize:"1rem",
                       fontWeight:700, color:W, marginBottom:"0.375rem" }}>
          Connect your wallet to create a profile.
        </div>
        <div style={{ fontFamily:S, fontSize:"0.72rem",
                       color:"rgba(255,255,255,0.35)", lineHeight:1.6,
                       maxWidth:300, margin:"0 auto" }}>
          Your wallet address is your identity on Abraxas. Connect once and your
          profile, assets, and passport are always retrievable.
        </div>
      </div>
    );
  }

  if (loading && !profile) {
    return (
      <div style={{ padding:"1.25rem", background:BG, border:`1px solid ${BDR}`,
                     borderRadius:8, textAlign:"center" }}>
        <div style={{ fontFamily:M, fontSize:"0.6rem",
                       color:"rgba(255,255,255,0.25)", letterSpacing:"0.15em",
                       textTransform:"uppercase" }}>
          LOADING PROFILE…
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:BG, border:`1px solid ${BDR}`, borderRadius:8,
                   overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"0.875rem 1rem",
                     background:`${G}08`,
                     borderBottom:`1px solid ${BDR}`,
                     display:"flex", alignItems:"center",
                     justifyContent:"space-between", gap:"0.75rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          {/* Avatar placeholder */}
          <div style={{ width:40, height:40, borderRadius:"50%",
                         background:`${G}25`,
                         border:`1.5px solid ${G}40`,
                         display:"flex", alignItems:"center", justifyContent:"center",
                         flexShrink:0 }}>
            <span style={{ fontFamily:M, fontSize:"0.9rem", color:G, fontWeight:900 }}>
              {(profile?.display_name ?? profile?.username ?? "?")[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{ fontFamily:M, fontSize:"0.82rem", fontWeight:700, color:W }}>
              {profile?.display_name ?? profile?.username ?? "Unnamed User"}
            </div>
            <div style={{ fontFamily:M, fontSize:"0.52rem",
                           color:"rgba(255,255,255,0.3)", letterSpacing:"0.06em" }}>
              {walletAddress.slice(0,8)}…{walletAddress.slice(-5)}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
          <div style={{ padding:"0.2rem 0.5rem", borderRadius:3,
                         background:`${passportColor}12`,
                         border:`1px solid ${passportColor}30`,
                         fontFamily:M, fontSize:"0.52rem", fontWeight:700,
                         color:passportColor, letterSpacing:"0.08em",
                         textTransform:"uppercase" }}>
            {profile?.passport_level ?? "UNVERIFIED"}
          </div>
          <button onClick={() => setEditing(e => !e)} style={{
            padding:"0.3rem 0.75rem", borderRadius:4,
            border:`1px solid ${BDR}`, background:"transparent",
            color:"rgba(255,255,255,0.5)", fontFamily:M,
            fontSize:"0.6rem", fontWeight:700, cursor:"pointer",
            letterSpacing:"0.06em", textTransform:"uppercase",
          }}>
            {editing ? "CANCEL" : "EDIT"}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing ? (
        <div style={{ padding:"1rem", display:"flex",
                       flexDirection:"column", gap:"0.625rem" }}>
          <div>
            <label style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                             color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                             letterSpacing:"0.12em", display:"block", marginBottom:3 }}>
              Display Name
            </label>
            <input value={draftName} onChange={e => setDraftName(e.target.value)}
              placeholder="Your name" style={inp} autoComplete="name"/>
          </div>
          <div>
            <label style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                             color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                             letterSpacing:"0.12em", display:"block", marginBottom:3 }}>
              Username
            </label>
            <input value={draftUser} onChange={e => setDraftUser(e.target.value)}
              placeholder="@yourhandle" style={inp} autoComplete="username"/>
          </div>
          <div>
            <label style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                             color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                             letterSpacing:"0.12em", display:"block", marginBottom:3 }}>
              Email (for verification updates)
            </label>
            <input value={draftEmail} onChange={e => setDraftEmail(e.target.value)}
              placeholder="you@email.com" type="email" style={inp} inputMode="email"/>
          </div>
          <div>
            <label style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                             color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                             letterSpacing:"0.12em", display:"block", marginBottom:3 }}>
              Bio
            </label>
            <textarea value={draftBio} onChange={e => setDraftBio(e.target.value)}
              placeholder="Artist, builder, investor..." rows={2}
              style={{ ...inp, resize:"none", lineHeight:1.6 }}/>
          </div>
          {error && (
            <div style={{ fontFamily:M, fontSize:"0.6rem",
                           color:"#EF4444", letterSpacing:"0.04em" }}>{error}</div>
          )}
          <button onClick={saveProfile} disabled={saving} style={{
            width:"100%", padding:"0.625rem", borderRadius:5, border:"none",
            background:G, color:"#000", fontFamily:M, fontSize:"0.75rem",
            fontWeight:900, cursor:"pointer", opacity:saving ? 0.7 : 1,
            letterSpacing:"0.05em", textTransform:"uppercase",
          }}>
            {saving ? "SAVING…" : "SAVE PROFILE →"}
          </button>
        </div>
      ) : (
        <div style={{ padding:"0.875rem 1rem",
                       display:"flex", flexDirection:"column", gap:"0.25rem" }}>
          {profile?.email && (
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontFamily:M, fontSize:"0.55rem",
                              color:"rgba(255,255,255,0.25)",
                              textTransform:"uppercase", letterSpacing:"0.1em" }}>EMAIL</span>
              <span style={{ fontFamily:S, fontSize:"0.7rem",
                              color:"rgba(255,255,255,0.5)" }}>{profile.email}</span>
            </div>
          )}
          {profile?.bio && (
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(255,255,255,0.4)", lineHeight:1.6,
                           paddingTop:"0.25rem" }}>
              {profile.bio}
            </div>
          )}
          {!profile?.display_name && !profile?.email && (
            <div style={{ fontFamily:S, fontSize:"0.72rem",
                           color:"rgba(255,255,255,0.25)", textAlign:"center",
                           padding:"0.5rem 0" }}>
              Add your name and email to personalize your profile.
            </div>
          )}
          <div style={{ fontFamily:M, fontSize:"0.52rem",
                         color:"rgba(255,255,255,0.15)",
                         letterSpacing:"0.06em", paddingTop:"0.375rem" }}>
            MEMBER SINCE {profile ? new Date(profile.created_at).toLocaleDateString("en-US",
              { month:"long", year:"numeric" }) : "N/A"}
          </div>
        </div>
      )}
    </div>
  );
}
