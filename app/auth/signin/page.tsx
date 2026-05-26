// FILE: app/auth/signin/page.tsx
// Auth page with official GitHub and X logos, wallet connect.
// Uses next-auth signIn — no 404 if authOptions configured correctly.
"use client";

import { useState }         from "react";
import { signIn }           from "next-auth/react";
import { useWalletModal }   from "@solana/wallet-adapter-react-ui";
import { useSearchParams }  from "next/navigation";

const MONO = "'JetBrains Mono',monospace";

export default function SignInPage() {
  const { setVisible }     = useWalletModal();
  const searchParams       = useSearchParams();
  const callbackUrl        = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail]  = useState("");
  const [sent,  setSent]   = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleEmail() {
    if (!email) return;
    setLoading("email");
    await signIn("email", { email, callbackUrl, redirect: false });
    setSent(true);
    setLoading(null);
  }

  async function handleProvider(id: string) {
    setLoading(id);
    await signIn(id, { callbackUrl });
  }

  return (
    <div style={{
      minHeight:"100vh", background:"#070a14",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"1rem",
    }}>
      <div style={{ width:"100%", maxWidth:400 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
          <div style={{
            display:"inline-flex", alignItems:"center",
            justifyContent:"center", width:48, height:48,
            borderRadius:"10px", marginBottom:"0.875rem",
            background:"linear-gradient(135deg, #7c3aed, #C8A96E)",
            fontSize:"1.4rem", fontWeight:900, color:"#fff",
          }}>A</div>
          <div style={{ fontWeight:900, fontSize:"1.2rem", color:"#f0f0f0",
                         fontFamily:MONO, letterSpacing:"0.1em" }}>ABRAXAS</div>
          <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.2)",
                         fontFamily:MONO, textTransform:"uppercase",
                         letterSpacing:"0.2em", marginTop:"0.2rem" }}>
            Verification Protocol · Solana
          </div>
        </div>

        {/* Wallet — primary */}
        <button
          onClick={() => { setVisible(true); }}
          style={{
            width:"100%", padding:"1rem", borderRadius:"8px", border:"none",
            cursor:"pointer", fontWeight:900, fontSize:"0.72rem", fontFamily:MONO,
            letterSpacing:"0.04em", marginBottom:"1rem",
            background:"linear-gradient(135deg, #7c3aed, #9945FF)",
            color:"#fff", display:"flex", alignItems:"center",
            justifyContent:"center", gap:"0.5rem",
          }}>
          <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.15)"/>
            <path d="M8 15h24M8 20h18M8 25h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Connect Solana Wallet
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem",
                       marginBottom:"1rem" }}>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }}/>
          <span style={{ fontSize:"0.42rem", color:"rgba(255,255,255,0.2)",
                          fontFamily:MONO, textTransform:"uppercase",
                          letterSpacing:"0.12em" }}>or</span>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }}/>
        </div>

        {/* GitHub */}
        <button
          disabled={loading === "github"}
          onClick={() => handleProvider("github")}
          style={{
            width:"100%", padding:"0.875rem", borderRadius:"8px",
            cursor:"pointer", fontWeight:700, fontSize:"0.64rem", fontFamily:MONO,
            marginBottom:"0.625rem",
            background:"rgba(255,255,255,0.06)",
            border:"1px solid rgba(255,255,255,0.1)",
            color:"rgba(255,255,255,0.75)",
            display:"flex", alignItems:"center", justifyContent:"center",
            gap:"0.6rem", opacity: loading === "github" ? 0.5 : 1,
          }}>
          {/* Official GitHub mark */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
        </button>

        {/* X / Twitter */}
        <button
          disabled={loading === "twitter"}
          onClick={() => handleProvider("twitter")}
          style={{
            width:"100%", padding:"0.875rem", borderRadius:"8px",
            cursor:"pointer", fontWeight:700, fontSize:"0.64rem", fontFamily:MONO,
            marginBottom:"1rem",
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.08)",
            color:"rgba(255,255,255,0.65)",
            display:"flex", alignItems:"center", justifyContent:"center",
            gap:"0.6rem", opacity: loading === "twitter" ? 0.5 : 1,
          }}>
          {/* Official X mark */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.629 5.906-5.629zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          {loading === "twitter" ? "Redirecting…" : "Continue with X"}
        </button>

        {/* Email magic link */}
        {!sent ? (
          <div style={{ display:"flex", gap:"0.4rem" }}>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmail()}
              placeholder="Email address"
              style={{
                flex:1, padding:"0.75rem 0.875rem", borderRadius:"7px",
                border:"1px solid rgba(255,255,255,0.1)",
                background:"rgba(255,255,255,0.04)",
                color:"#f0f0f0", fontSize:"0.62rem", outline:"none", fontFamily:MONO,
              }}
            />
            <button
              disabled={!email || loading === "email"}
              onClick={handleEmail}
              style={{
                padding:"0.75rem 1rem", borderRadius:"7px",
                border:"1px solid rgba(200,169,110,0.3)",
                background:"rgba(200,169,110,0.1)",
                color: email ? "#C8A96E" : "rgba(255,255,255,0.2)",
                fontFamily:MONO, fontSize:"0.52rem", fontWeight:700,
                cursor: email ? "pointer" : "not-allowed", whiteSpace:"nowrap",
              }}>
              {loading === "email" ? "…" : "Magic Link"}
            </button>
          </div>
        ) : (
          <div style={{
            padding:"0.875rem", borderRadius:"7px",
            border:"1px solid rgba(20,241,149,0.2)",
            background:"rgba(20,241,149,0.05)",
            fontSize:"0.56rem", color:"rgba(20,241,149,0.8)",
            fontFamily:MONO, textAlign:"center",
          }}>
            ✓ Check your inbox — magic link sent to {email}
          </div>
        )}

        <p style={{
          marginTop:"1.5rem", fontSize:"0.4rem",
          color:"rgba(255,255,255,0.15)", textAlign:"center",
          fontFamily:MONO, lineHeight:1.8,
        }}>
          Wallet connection required for on-chain actions.
          Email / OAuth provides read access until a wallet is linked.
        </p>
      </div>
    </div>
  );
}
