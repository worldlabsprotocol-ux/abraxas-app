"use client";
// FILE: components/WalletConnectButton.tsx
// Custom connect button, deliberately not using the pre-packaged
// WalletMultiButton, to avoid its CSS-import and SSR requirements,
// and to match the site's actual design system instead of the
// adapter library's default look.

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";
const BDR = "var(--border)";

export function WalletConnectButton() {
  const { wallet, wallets, select, connect, disconnect, connecting, connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Only render wallet-dependent UI after mount, this is the actual
  // fix for the SSR/hydration mismatch class of bug, never trust
  // useWallet()'s state during the very first render.
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <button disabled
        style={{ padding:"0.5rem 1.1rem", borderRadius:8, border:`1px solid ${BDR}`,
                  background:"transparent", color:"var(--text-muted)",
                  fontFamily:S, fontSize:"0.78rem", fontWeight:600 }}>
        Connect Wallet
      </button>
    );
  }

  if (connected && publicKey) {
    return (
      <button onClick={() => disconnect()}
        style={{ padding:"0.5rem 1.1rem", borderRadius:8, border:`1px solid ${G}40`,
                  background:`${G}12`, color:G, fontFamily:S, fontSize:"0.78rem",
                  fontWeight:700, cursor:"pointer" }}>
        {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
      </button>
    );
  }

  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setShowPicker(s => !s)} disabled={connecting}
        style={{ padding:"0.5rem 1.1rem", borderRadius:8, border:"none",
                  background:G, color:"#000", fontFamily:S, fontSize:"0.78rem",
                  fontWeight:700, cursor:"pointer" }}>
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {showPicker && (
        <div style={{ position:"absolute", top:"calc(100% + 0.5rem)", right:0, zIndex:100,
                       background:"var(--surface)", border:`1px solid ${BDR}`,
                       borderRadius:10, padding:"0.5rem", minWidth:160,
                       boxShadow:"0 8px 24px rgba(0,0,0,0.15)" }}>
          {wallets.map(w => (
            <button key={w.adapter.name}
              onClick={async () => {
                select(w.adapter.name);
                setShowPicker(false);
                try { await connect(); } catch { /* user closed the wallet popup, not an error */ }
              }}
              style={{ display:"flex", alignItems:"center", gap:"0.5rem", width:"100%",
                        padding:"0.5rem 0.625rem", borderRadius:6, border:"none",
                        background:"transparent", color:"var(--text-primary)",
                        fontFamily:S, fontSize:"0.78rem", cursor:"pointer", textAlign:"left" }}>
              {w.adapter.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
