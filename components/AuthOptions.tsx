// FILE: components/AuthOptions.tsx
// Multi-login UI — Email, GitHub, X, plus Solana wallet.
// Shown on /auth/signin page. All imports at top.
"use client";

import { useState }      from "react";
import { signIn }        from "next-auth/react";
import { useWalletModal }from "@solana/wallet-adapter-react-ui";

const MONO = "'JetBrains Mono',monospace";

const PROVIDERS = [
  { id:"github",  label:"GitHub",  icon:"⌥", color:"rgba(255,255,255,0.5)" },
  { id:"twitter", label:"X",       icon:"✕", color:"rgba(29,161,242,0.7)" },
  { id:"email",   label:"Email",   icon:"@", color:"rgba(200,169,110,0.7)" },
] as const;

export function AuthOptions({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const { setVisible }     = useWalletModal();
  const [email, setEmail]  = useState("");
  const [sent,  setSent]   = useState(false);
  const [loading, setLoading] = useState<string|null>(null);

  async function handleEmailSignIn() {
    if (!email) return;
    setLoading("email");
    await signIn("email", { email, callbackUrl, redirect:false });
    setSent(true);
    setLoading(null);
  }

  async function handleProviderSignIn(id: string) {
    setLoading(id);
    await signIn(id, { callbackUrl });
  }

  return (
    <div style={{ width:"100%", maxWidth:380, margin:"0 auto" }}>
      {/* Wallet — primary CTA */}
      <button
        onClick={() => setVisible(true)}
        style={{
          width:"100%", padding:"1rem", borderRadius:"7px",
          fontWeight:800, fontSize:"0.72rem", fontFamily:MONO,
          letterSpacing:"0.04em", cursor:"pointer", marginBottom:"0.75rem",
          background:"linear-gradient(135deg,#7c3aed,#6d28d9)",
          border:"none", color:"#fff", transition:"all 0.15s",
        }}>
        Connect Solana Wallet
      </button>
      <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.2)",
                    fontFamily:MONO, textAlign:"center", marginBottom:"0.75rem",
                    textTransform:"uppercase", letterSpacing:"0.15em" }}>
        or continue with
      </div>

      {/* OAuth providers */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                    gap:"0.5rem", marginBottom:"0.75rem" }}>
        {PROVIDERS.filter(p => p.id !== "email").map(p => (
          <button key={p.id}
            disabled={loading === p.id}
            onClick={() => handleProviderSignIn(p.id)}
            style={{
              padding:"0.75rem", borderRadius:"6px",
              border:"1px solid rgba(255,255,255,0.1)",
              background:"rgba(255,255,255,0.03)",
              cursor:"pointer", fontFamily:MONO,
              fontSize:"0.56rem", fontWeight:700,
              color: loading===p.id ? "rgba(255,255,255,0.2)" : p.color,
              transition:"all 0.15s", display:"flex",
              alignItems:"center", justifyContent:"center", gap:"0.4rem",
            }}>
            <span style={{ fontSize:"0.7rem" }}>{p.icon}</span> {p.label}
          </button>
        ))}
      </div>

      {/* Email magic-link */}
      {!sent ? (
        <div style={{ display:"flex", gap:"0.4rem" }}>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            onKeyDown={e => e.key === "Enter" && handleEmailSignIn()}
            style={{
              flex:1, padding:"0.75rem 0.875rem", borderRadius:"6px",
              border:"1px solid rgba(255,255,255,0.1)",
              background:"rgba(255,255,255,0.03)",
              color:"#f0f0f0", fontSize:"0.58rem", fontFamily:MONO,
              outline:"none",
            }}
          />
          <button
            disabled={!email || loading==="email"}
            onClick={handleEmailSignIn}
            style={{
              padding:"0.75rem 1rem", borderRadius:"6px",
              border:"1px solid rgba(200,169,110,0.3)",
              background:"rgba(200,169,110,0.1)",
              color: email ? "#C8A96E" : "rgba(255,255,255,0.2)",
              fontFamily:MONO, fontSize:"0.52rem",
              fontWeight:700, cursor: email ? "pointer" : "not-allowed",
              transition:"all 0.15s", whiteSpace:"nowrap",
            }}>
            {loading==="email" ? "…" : "Send Link"}
          </button>
        </div>
      ) : (
        <div style={{
          padding:"0.875rem", borderRadius:"6px",
          border:"1px solid rgba(20,241,149,0.2)",
          background:"rgba(20,241,149,0.05)",
          fontSize:"0.54rem", color:"rgba(20,241,149,0.8)",
          fontFamily:MONO, textAlign:"center",
        }}>
          ✓ Magic link sent to {email}
        </div>
      )}
    </div>
  );
}
