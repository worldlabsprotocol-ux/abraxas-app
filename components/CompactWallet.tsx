// FILE: components/CompactWallet.tsx
// Wallet is identity. Session is secondary context.
// Single connect surface, no duplicate auth links.
// Wallet-first: connect → linked identity, not "sign in to dapp."
"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet }                    from "@solana/wallet-adapter-react";
import { useWalletModal }               from "@solana/wallet-adapter-react-ui";
import { useAbraBalance }               from "@/lib/hooks/useAbraBalance";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function CompactWallet() {
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const { setVisible }  = useWalletModal();
  const { balance }     = useAbraBalance();
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  const addr  = publicKey?.toBase58() ?? "";
  const short = addr ? `${addr.slice(0,4)}…${addr.slice(-4)}` : "";

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Not connected
  if (!connected) {
    return (
      <button onClick={() => setVisible(true)} style={{
        display:"flex", alignItems:"center", gap:"0.35rem",
        padding:"0.25rem clamp(0.4rem,1.5vw,0.625rem)",
        borderRadius:"4px",
        border:"1px solid rgba(16,185,129,0.35)",
        background:"rgba(16,185,129,0.08)",
        color:"#10B981", fontFamily:M,
        fontSize:"clamp(0.28rem,0.9vw,0.38rem)",
        fontWeight:700, cursor:"pointer",
        textTransform:"uppercase", letterSpacing:"0.08em",
        whiteSpace:"nowrap", flexShrink:0,
        transition:"all 0.15s",
      }}>
        <span style={{ fontSize:"0.55rem", lineHeight:1 }}>◉</span>
        CONNECT
      </button>
    );
  }

  // Connected
  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display:"flex", alignItems:"center", gap:"0.35rem",
        padding:"0.25rem clamp(0.4rem,1.5vw,0.625rem)",
        borderRadius:"4px",
        border:"1px solid rgba(16,185,129,0.25)",
        background: open ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.05)",
        color:"#10B981", fontFamily:M,
        fontSize:"clamp(0.28rem,0.9vw,0.36rem)",
        fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
        transition:"all 0.15s",
      }}>
        <span style={{ width:6, height:6, borderRadius:"50%",
                        background:"#10B981", flexShrink:0, display:"inline-block",
                        boxShadow:"0 0 6px #10B981" }}/>
        {short}
        {balance > 0 && (
          <span style={{ color:"rgba(200,169,110,0.7)",
                          borderLeft:"1px solid rgba(255,255,255,0.08)",
                          paddingLeft:"0.35rem" }}>
            {balance >= 1000 ? `${(balance/1000).toFixed(0)}K` : String(balance)} ABRA
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", right:0,
          background:"#0E1117", border:"1px solid #1F2937",
          borderRadius:"6px", minWidth:200, zIndex:500,
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
          overflow:"hidden",
        }}>
          <div style={{ padding:"0.75rem 1rem",
                         borderBottom:"1px solid #1F2937" }}>
            <div style={{ fontFamily:M, fontSize:"0.3rem",
                           color:"rgba(21,21,26,0.2)",
                           textTransform:"uppercase", letterSpacing:"0.1em",
                           marginBottom:"0.25rem" }}>
              CONNECTED NODE
            </div>
            <div style={{ fontFamily:M, fontSize:"0.44rem",
                           color:"#10B981", fontWeight:700 }}>
              {short}
            </div>
            {wallet?.adapter.name && (
              <div style={{ fontFamily:M, fontSize:"0.3rem",
                             color:"rgba(21,21,26,0.25)", marginTop:"0.15rem" }}>
                via {wallet.adapter.name}
              </div>
            )}
          </div>

          {balance > 0 && (
            <div style={{ padding:"0.625rem 1rem",
                           borderBottom:"1px solid #1F2937" }}>
              <div style={{ fontFamily:M, fontSize:"0.3rem",
                             color:"rgba(21,21,26,0.2)",
                             textTransform:"uppercase", letterSpacing:"0.1em",
                             marginBottom:"0.2rem" }}>
                $ABRA BALANCE
              </div>
              <div style={{ fontFamily:M, fontSize:"0.6rem",
                             fontWeight:900, color:"rgba(200,169,110,0.8)" }}>
                {balance.toLocaleString()} ABRA
              </div>
            </div>
          )}

          <button onClick={() => { disconnect(); setOpen(false); }} style={{
            width:"100%", padding:"0.625rem 1rem", border:"none",
            background:"transparent", cursor:"pointer", textAlign:"left",
            fontFamily:M, fontSize:"0.38rem", fontWeight:700,
            color:"rgba(242,107,107,0.7)",
            textTransform:"uppercase", letterSpacing:"0.08em",
          }}>
            DISCONNECT
          </button>
        </div>
      )}
    </div>
  );
}
