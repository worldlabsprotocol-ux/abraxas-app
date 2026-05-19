// FILE: components/CompactWallet.tsx
// Compact wallet button — navbar-baseline aligned.
// Shows truncated address + ABRA balance when connected.
// Disconnect on click when connected. Connect when not.
// Replaces WalletMultiButton entirely.
"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet }                   from "@solana/wallet-adapter-react";
import { useWalletModal }              from "@solana/wallet-adapter-react-ui";
import { useAbraBalance }              from "@/lib/hooks/useAbraBalance";

const MONO = "'JetBrains Mono',monospace";

export function CompactWallet() {
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const { setVisible }      = useWalletModal();
  const { balance, loading} = useAbraBalance();
  const [open, setOpen]     = useState(false);
  const ref                 = useRef<HTMLDivElement>(null);

  const addr = publicKey?.toBase58() ?? "";
  const short = addr ? `${addr.slice(0,4)}…${addr.slice(-4)}` : "";

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!connected) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          padding:"0.35rem 0.875rem", borderRadius:"5px",
          border:"1px solid rgba(124,58,237,0.5)", cursor:"pointer",
          fontWeight:700, fontSize:"0.54rem", fontFamily:MONO,
          letterSpacing:"0.04em", background:"rgba(124,58,237,0.12)",
          color:"#a78bfa", whiteSpace:"nowrap", transition:"all 0.15s",
        }}
        onMouseEnter={e=>(e.currentTarget.style.background="rgba(124,58,237,0.22)")}
        onMouseLeave={e=>(e.currentTarget.style.background="rgba(124,58,237,0.12)")}
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:"flex", alignItems:"center", gap:"0.4rem",
          padding:"0.35rem 0.75rem", borderRadius:"5px",
          border:"1px solid rgba(20,241,149,0.25)", cursor:"pointer",
          background:"rgba(20,241,149,0.06)", transition:"all 0.15s",
        }}
        onMouseEnter={e=>(e.currentTarget.style.borderColor="rgba(20,241,149,0.45)")}
        onMouseLeave={e=>(e.currentTarget.style.borderColor="rgba(20,241,149,0.25)")}
      >
        <div style={{width:6,height:6,borderRadius:"50%",background:"#14F195",flexShrink:0}}/>
        <span style={{fontSize:"0.5rem",fontWeight:700,color:"rgba(255,255,255,0.7)",fontFamily:MONO}}>
          {short}
        </span>
        {!loading && balance > 0 && (
          <span style={{fontSize:"0.44rem",color:"rgba(200,169,110,0.6)",fontFamily:MONO,
            borderLeft:"1px solid rgba(255,255,255,0.1)",paddingLeft:"0.4rem"}}>
            {balance.toLocaleString()} ABRA
          </span>
        )}
        <span style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.25)"}}>▾</span>
      </button>

      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:200,
          background:"rgba(10,12,20,0.98)", borderRadius:"8px",
          border:"1px solid rgba(255,255,255,0.09)",
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)", minWidth:200,
          overflow:"hidden",
        }}>
          {/* Address */}
          <div style={{padding:"0.75rem 1rem",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.25)",
              fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:3}}>
              Wallet
            </div>
            <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.6)",fontFamily:MONO,
              wordBreak:"break-all"}}>{addr}</div>
          </div>
          {/* Balance */}
          <div style={{padding:"0.625rem 1rem",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",fontFamily:MONO}}>
                ABRA Balance
              </span>
              <span style={{fontSize:"0.58rem",fontWeight:800,color:"#C8A96E",fontFamily:MONO}}>
                {loading?"…":balance.toLocaleString()}
              </span>
            </div>
          </div>
          {/* Wallet name */}
          {wallet?.adapter.name && (
            <div style={{padding:"0.5rem 1rem",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.25)",fontFamily:MONO}}>
                Via {wallet.adapter.name}
              </span>
            </div>
          )}
          {/* Disconnect */}
          <button
            onClick={() => { disconnect(); setOpen(false); }}
            style={{
              width:"100%", padding:"0.625rem 1rem", background:"none",
              border:"none", cursor:"pointer", textAlign:"left",
              fontSize:"0.48rem", fontWeight:700, fontFamily:MONO,
              color:"rgba(242,107,107,0.7)", transition:"background 0.15s",
            }}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(242,107,107,0.08)")}
            onMouseLeave={e=>(e.currentTarget.style.background="none")}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}