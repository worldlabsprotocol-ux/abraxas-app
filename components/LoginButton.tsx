"use client";
// FILE: components/LoginButton.tsx
// Drop-in login button. Shows Google/Apple/email options via Privy.
// Falls back to wallet-only if Privy not configured.

import { useState } from "react";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";

interface LoginState {
  authenticated: boolean;
  user: { email?: string; wallet?: string } | null;
  login: () => void;
  logout: () => void;
}

function usePrivyOrFallback(): LoginState {
  // Try to use Privy if available, otherwise no-op
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePrivy } = require("@privy-io/react-auth");
    return usePrivy();
  } catch {
    return {
      authenticated: false,
      user: null,
      login: () => {},
      logout: () => {},
    };
  }
}

export function LoginButton() {
  const { authenticated, user, login, logout } = usePrivyOrFallback();
  const [open, setOpen] = useState(false);

  if (authenticated && user) {
    const display = user.email ?? (user.wallet ? user.wallet.slice(0, 6) + "..." : "Connected");
    return (
      <div style={{ position:"relative" }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ padding:"0.4rem 0.875rem", borderRadius:5,
                    border:`1px solid ${G}40`, background:`${G}10`,
                    color:G, fontFamily:M, fontSize:"0.65rem",
                    fontWeight:700, cursor:"pointer",
                    letterSpacing:"0.06em", textTransform:"uppercase" }}>
          {display}
        </button>
        {open && (
          <div style={{ position:"absolute", top:"100%", right:0, marginTop:4,
                         background:"#0D1117", border:"1px solid #1C2333",
                         borderRadius:6, padding:"0.5rem",
                         zIndex:1000, minWidth:140 }}>
            <button
              onClick={() => { logout(); setOpen(false); }}
              style={{ width:"100%", padding:"0.4rem 0.625rem",
                        borderRadius:4, border:"none",
                        background:"transparent",
                        color:"rgba(255,255,255,0.5)",
                        fontFamily:M, fontSize:"0.62rem",
                        cursor:"pointer", textAlign:"left",
                        letterSpacing:"0.06em", textTransform:"uppercase" }}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={login}
      style={{ padding:"0.4rem 0.875rem", borderRadius:5,
                border:`1px solid ${G}40`, background:`${G}10`,
                color:G, fontFamily:M, fontSize:"0.65rem",
                fontWeight:700, cursor:"pointer",
                letterSpacing:"0.06em", textTransform:"uppercase",
                display:"flex", alignItems:"center", gap:"0.375rem" }}>
      <span style={{ fontFamily:S }}>Sign In</span>
    </button>
  );
}
