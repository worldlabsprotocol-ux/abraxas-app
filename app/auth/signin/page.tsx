// FILE: app/auth/signin/page.tsx
// Must be "use client" — uses useWalletModal and signIn
"use client";

import { useState }         from "react";
import { signIn }           from "next-auth/react";
import { useWalletModal }   from "@solana/wallet-adapter-react-ui";
import { useSearchParams }  from "next/navigation";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export default function SignInPage() {
  const { setVisible }      = useWalletModal();
  const searchParams        = useSearchParams();
  const callbackUrl         = searchParams?.get("callbackUrl") ?? "/terminal";
  const [email, setEmail]   = useState("");
  const [sent,  setSent]    = useState(false);
  const [busy,  setBusy]    = useState<string | null>(null);

  async function auth(provider: string) {
    setBusy(provider);
    await signIn(provider, { callbackUrl });
  }

  async function emailLink() {
    if (!email.trim()) return;
    setBusy("email");
    await signIn("email", { email, callbackUrl, redirect: false });
    setSent(true);
    setBusy(null);
  }

  return (
    <div style={{
      minHeight:"100vh", background:"#0C0E12",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"clamp(0.75rem,3vw,1.5rem)",
    }}>
      <div style={{ width:"100%", maxWidth:400 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
          <div style={{ fontSize:"clamp(1.6rem,5vw,2.4rem)", fontWeight:900,
                         color:"#f0f0f0", fontFamily:M, letterSpacing:"-0.03em",
                         marginBottom:"0.5rem" }}>
            <span style={{ color:"#10B981" }}>◈</span> ABRAXAS
          </div>
          <div style={{ fontSize:"clamp(0.32rem,1.2vw,0.42rem)", fontWeight:700,
                         color:"rgba(255,255,255,0.2)", fontFamily:M,
                         textTransform:"uppercase", letterSpacing:"0.2em" }}>
            ACCESS REQUIRED
          </div>
        </div>

        {/* Wallet — PRIMARY CTA */}
        <button
          onClick={() => setVisible(true)}
          style={{
            width:"100%", padding:"clamp(0.75rem,2.5vw,1rem)",
            borderRadius:"6px", border:"1px solid rgba(16,185,129,0.35)",
            background:"rgba(16,185,129,0.08)", color:"#10B981",
            fontFamily:M, fontSize:"clamp(0.52rem,1.8vw,0.68rem)",
            fontWeight:900, cursor:"pointer", letterSpacing:"0.06em",
            textTransform:"uppercase", marginBottom:"1rem",
            display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem",
          }}>
          <span style={{ fontSize:"1rem" }}>◉</span>
          CONNECT SOLANA WALLET
        </button>

        {/* Divider */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1rem" }}>
          <div style={{ flex:1, height:1, background:"#1F2937" }}/>
          <span style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                          textTransform:"uppercase", letterSpacing:"0.12em" }}>OR</span>
          <div style={{ flex:1, height:1, background:"#1F2937" }}/>
        </div>

        {/* GitHub */}
        <button
          disabled={busy === "github"}
          onClick={() => auth("github")}
          style={{
            width:"100%", padding:"clamp(0.625rem,2vw,0.875rem)",
            borderRadius:"5px", border:"1px solid #1F2937",
            background:"rgba(255,255,255,0.03)", marginBottom:"0.5rem",
            color: busy === "github" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
            fontFamily:M, fontSize:"clamp(0.44rem,1.5vw,0.58rem)", fontWeight:700,
            cursor:"pointer", display:"flex", alignItems:"center",
            justifyContent:"center", gap:"0.5rem",
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          {busy === "github" ? "REDIRECTING…" : "CONTINUE WITH GITHUB"}
        </button>

        {/* X */}
        <button
          disabled={busy === "twitter"}
          onClick={() => auth("twitter")}
          style={{
            width:"100%", padding:"clamp(0.625rem,2vw,0.875rem)",
            borderRadius:"5px", border:"1px solid #1F2937",
            background:"rgba(255,255,255,0.03)", marginBottom:"1rem",
            color: busy === "twitter" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
            fontFamily:M, fontSize:"clamp(0.44rem,1.5vw,0.58rem)", fontWeight:700,
            cursor:"pointer", display:"flex", alignItems:"center",
            justifyContent:"center", gap:"0.5rem",
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.629 5.906-5.629zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          {busy === "twitter" ? "REDIRECTING…" : "CONTINUE WITH X"}
        </button>

        {/* Email */}
        {!sent ? (
          <div style={{ display:"flex", gap:"0.375rem" }}>
            <input type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && emailLink()}
              placeholder="Email address"
              style={{
                flex:1, padding:"clamp(0.6rem,2vw,0.75rem) 0.875rem",
                borderRadius:"5px", border:"1px solid #1F2937",
                background:"rgba(255,255,255,0.03)",
                color:"#f0f0f0", fontSize:"16px", outline:"none", fontFamily:M,
              }}/>
            <button disabled={!email || busy === "email"} onClick={emailLink}
              style={{
                padding:"0 clamp(0.75rem,2vw,1rem)", borderRadius:"5px",
                border:"1px solid rgba(49,130,206,0.3)",
                background:"rgba(49,130,206,0.08)",
                color: email ? "#3182CE" : "rgba(255,255,255,0.2)",
                fontFamily:M, fontSize:"clamp(0.36rem,1.2vw,0.46rem)", fontWeight:700,
                cursor: email ? "pointer" : "not-allowed", whiteSpace:"nowrap",
              }}>
              {busy === "email" ? "…" : "MAGIC LINK"}
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
            ✓ CHECK INBOX — LINK SENT TO {email.toUpperCase()}
          </div>
        )}

        {/* Note */}
        <p style={{ marginTop:"1.25rem", fontFamily:M, fontSize:"0.34rem",
                     color:"rgba(255,255,255,0.12)", textAlign:"center", lineHeight:1.8 }}>
          Wallet connect works without configuration.<br/>
          GitHub + X require OAuth keys in Vercel env vars.
        </p>
      </div>
    </div>
  );
}
