"use client";
// FILE: components/WaitlistForm.tsx
// Replaces the old email sign-in flow entirely. Honest positioning:
// this doesn't create a real account right now, it just captures an
// email to notify at ZK Login launch.

import { useState } from "react";

const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";
const BDR = "var(--border)";

interface WaitlistFormProps {
  onJoined?: () => void;
}

export function WaitlistForm({ onJoined }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email || !email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setJoined(true);
      onJoined?.();
    } catch {
      setError("Something went wrong, try again");
    } finally {
      setSending(false);
    }
  }

  if (joined) {
    return (
      <div style={{ textAlign:"center", padding:"0.5rem 0" }}>
        <div style={{ fontSize:"1.5rem", marginBottom:"0.5rem" }}>✓</div>
        <div style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700,
                       color:"var(--text-primary)" }}>
          You're on the list
        </div>
        <div style={{ fontFamily:S, fontSize:"0.75rem",
                       color:"var(--text-secondary)", marginTop:"0.25rem" }}>
          We'll email you the moment ZK Login is live.
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontFamily:S, fontSize:"0.78rem",
                   color:"var(--text-secondary)", lineHeight:1.6,
                   margin:"0 0 0.875rem" }}>
        ZK Login is in active development. Leave your email and we'll
        notify you the moment it's ready, no account created today.
      </p>
      <div style={{ display:"flex", gap:"0.5rem" }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          onKeyDown={e => e.key === "Enter" && submit()}
          style={{ flex:1, padding:"0.6rem 0.75rem", borderRadius:5,
                    border:`1px solid ${BDR}`, background:"#FFFFFF",
                    color:"#15151A", fontFamily:S, fontSize:"16px", outline:"none" }}
        />
        <button onClick={submit} disabled={sending}
          style={{ padding:"0.6rem 1.1rem", borderRadius:5, border:"none",
                    background:G, color:"#000", fontFamily:S,
                    fontSize:"0.78rem", fontWeight:700, cursor:"pointer",
                    opacity: sending ? 0.7 : 1, whiteSpace:"nowrap" }}>
          {sending ? "..." : "Join waitlist"}
        </button>
      </div>
      {error && (
        <div style={{ fontFamily:S, fontSize:"0.72rem", color:"#EF4444",
                       marginTop:"0.5rem" }}>
          {error}
        </div>
      )}
    </div>
  );
}
