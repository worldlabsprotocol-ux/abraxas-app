// FILE: components/AuthGate.tsx
// Full-screen auth overlay — shown when no session AND no wallet connected.
// Dismisses automatically when wallet connects or session is established.
"use client";

import { useState }          from "react";
import { signIn }            from "next-auth/react";
import { useWalletModal }    from "@solana/wallet-adapter-react-ui";

const M  = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const BG = "rgba(12,14,18,0.97)";

export function AuthGate() {
  const { setVisible }        = useWalletModal();
  const [email, setEmail]     = useState("");
  const [sent,  setSent]      = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleProvider(id: string) {
    setLoading(id);
    await signIn(id, { callbackUrl: "/" });
  }

  async function handleEmail() {
    if (!email.trim()) return;
    setLoading("email");
    await signIn("email", { email, callbackUrl: "/", redirect: false });
    setSent(true);
    setLoading(null);
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:BG, backdropFilter:"blur(12px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"1rem",
    }}>
      <div style={{ width:"100%", maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
          <div style={{ fontSize:"0.36rem", color:"rgba(16,185,129,0.5)",
                         fontFamily:M, textTransform:"uppercase",
                         letterSpacing:"0.25em", marginBottom:"0.75rem" }}>
            ABRAXAS COLLATERAL TERMINAL
          </div>
          <div style={{ fontSize:"clamp(1.6rem,4vw,2.4rem)", fontWeight:900,
                         color:"#f0f0f0", fontFamily:M, letterSpacing:"-0.02em",
                         lineHeight:1 }}>
            ACCESS REQUIRED
          </div>
          <div style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.3)",
                         marginTop:"0.625rem", lineHeight:1.7 }}>
            Connect a Solana wallet or authenticate via<br/>
            social provider to access the terminal.
          </div>
        </div>

        {/* Wallet — primary CTA */}
        <button onClick={() => setVisible(true)} style={{
          width:"100%", padding:"1rem", borderRadius:"6px",
          border:"1px solid rgba(16,185,129,0.35)",
          background:"rgba(16,185,129,0.08)",
          color:"#10B981", fontFamily:M, fontSize:"0.64rem",
          fontWeight:900, cursor:"pointer", letterSpacing:"0.06em",
          textTransform:"uppercase", marginBottom:"0.875rem",
          display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem",
          transition:"all 0.15s",
        }}>
          <span style={{ fontSize:"0.9rem" }}>◉</span>
          CONNECT SOLANA WALLET
        </button>

        {/* Divider */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem",
                       marginBottom:"0.875rem" }}>
          <div style={{ flex:1, height:1, background:"#1F2937" }}/>
          <span style={{ fontSize:"0.32rem", color:"rgba(255,255,255,0.2)",
                          fontFamily:M, textTransform:"uppercase",
                          letterSpacing:"0.12em" }}>OR</span>
          <div style={{ flex:1, height:1, background:"#1F2937" }}/>
        </div>

        {/* OAuth providers */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                       gap:"0.5rem", marginBottom:"0.875rem" }}>
          <button
            disabled={loading === "github"}
            onClick={() => handleProvider("github")}
            style={{
              padding:"0.75rem", borderRadius:"5px",
              border:"1px solid #1F2937",
              background:"rgba(255,255,255,0.03)",
              color: loading === "github" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
              fontFamily:M, fontSize:"0.46rem", fontWeight:700,
              cursor:"pointer", display:"flex", alignItems:"center",
              justifyContent:"center", gap:"0.4rem",
              transition:"all 0.15s",
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            {loading === "github" ? "…" : "GitHub"}
          </button>

          <button
            disabled={loading === "twitter"}
            onClick={() => handleProvider("twitter")}
            style={{
              padding:"0.75rem", borderRadius:"5px",
              border:"1px solid #1F2937",
              background:"rgba(255,255,255,0.03)",
              color: loading === "twitter" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
              fontFamily:M, fontSize:"0.46rem", fontWeight:700,
              cursor:"pointer", display:"flex", alignItems:"center",
              justifyContent:"center", gap:"0.4rem",
              transition:"all 0.15s",
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.629 5.906-5.629zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            {loading === "twitter" ? "…" : "X / Twitter"}
          </button>
        </div>

        {/* Email magic link */}
        {!sent ? (
          <div style={{ display:"flex", gap:"0.375rem" }}>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEmail()}
              placeholder="Email address"
              style={{
                flex:1, padding:"0.7rem 0.875rem", borderRadius:"5px",
                border:"1px solid #1F2937", background:"rgba(255,255,255,0.03)",
                color:"#f0f0f0", fontSize:"0.58rem", outline:"none", fontFamily:M,
              }}
            />
            <button
              disabled={!email || loading === "email"}
              onClick={handleEmail}
              style={{
                padding:"0.7rem 0.875rem", borderRadius:"5px",
                border:"1px solid rgba(49,130,206,0.3)",
                background:"rgba(49,130,206,0.08)",
                color: email ? "#3182CE" : "rgba(255,255,255,0.2)",
                fontFamily:M, fontSize:"0.46rem", fontWeight:700,
                cursor: email ? "pointer" : "not-allowed", whiteSpace:"nowrap",
              }}>
              {loading === "email" ? "…" : "MAGIC LINK"}
            </button>
          </div>
        ) : (
          <div style={{
            padding:"0.875rem", borderRadius:"5px",
            border:"1px solid rgba(16,185,129,0.2)",
            background:"rgba(16,185,129,0.05)",
            fontFamily:M, fontSize:"0.48rem",
            color:"rgba(16,185,129,0.8)", textAlign:"center",
          }}>
            ✓ LINK DISPATCHED → {email}
          </div>
        )}

        <p style={{ marginTop:"1.25rem", fontSize:"0.36rem",
                     color:"rgba(255,255,255,0.12)", textAlign:"center",
                     fontFamily:M, lineHeight:1.8 }}>
          GitHub + X OAuth requires provider keys in Vercel environment variables.
          Wallet connect works immediately without configuration.
        </p>
      </div>
    </div>
  );
}
