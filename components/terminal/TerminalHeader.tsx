// FILE: components/terminal/TerminalHeader.tsx
// Network rail — node status, credit health, auth anchor.
"use client";
import { useWallet }    from "@solana/wallet-adapter-react";
import { useAbraBalance } from "@/lib/hooks/useAbraBalance";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

function Dot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display:"inline-block", width:6, height:6, borderRadius:"50%",
      background: ok ? "#10B981" : "#ED8936",
      boxShadow: ok ? "0 0 6px #10B981" : "0 0 6px #ED8936",
      marginRight:6, flexShrink:0,
    }}/>
  );
}

export function TerminalHeader() {
  const { publicKey, connected } = useWallet();
  const { balance } = useAbraBalance();
  const short = publicKey ? `${publicKey.toBase58().slice(0,4)}…${publicKey.toBase58().slice(-4)}` : "—";

  return (
    <div style={{
      height:44, background:"#0C0E12",
      borderBottom:"1px solid #1F2937",
      display:"flex", alignItems:"center",
      padding:"0 1rem", gap:"1.5rem",
      fontFamily:M, fontSize:"0.36rem",
      color:"rgba(255,255,255,0.35)",
      flexShrink:0, overflowX:"auto",
    }}>
      {/* Brand */}
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                     color:"#f0f0f0", fontWeight:900, fontSize:"0.56rem",
                     letterSpacing:"0.15em", flexShrink:0 }}>
        <span style={{ color:"#10B981" }}>◈</span> ABRAXAS
        <span style={{ fontSize:"0.28rem", color:"rgba(255,255,255,0.2)",
                        fontWeight:400, letterSpacing:"0.1em" }}>
          COLLATERAL TERMINAL
        </span>
      </div>

      <div style={{ flex:1 }}/>

      {/* Status nodes */}
      <div style={{ display:"flex", alignItems:"center", gap:"1rem", flexShrink:0 }}>
        <span style={{ display:"flex", alignItems:"center" }}>
          <Dot ok={true}/>SOLANA MAINNET
        </span>
        <span style={{ display:"flex", alignItems:"center" }}>
          <Dot ok={connected}/>
          {connected ? `NODE ${short}` : "NODE UNLINKED"}
        </span>
        {connected && (
          <span style={{ color:"#10B981", fontWeight:700 }}>
            {balance.toLocaleString()} ABRA
          </span>
        )}
        <span style={{ display:"flex", alignItems:"center" }}>
          <Dot ok={true}/> AAS-1 PROTOCOL
        </span>
      </div>
    </div>
  );
}
