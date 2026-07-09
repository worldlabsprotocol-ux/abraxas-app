"use client";
// FILE: components/terminal/TerminalHeader.tsx
// Network rail. Sui zkLogin status + protocol health.

import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { truncateSuiAddress } from "@/lib/sui/identity";

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
  const suiAuth = useSuiAuthOptional();
  const connected = Boolean(suiAuth?.suiAddress);
  const short = suiAuth?.suiAddress
    ? truncateSuiAddress(suiAuth.suiAddress, 4, 4)
    : "-";

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

      <div style={{ display:"flex", alignItems:"center", gap:"1rem", flexShrink:0 }}>
        <span style={{ display:"flex", alignItems:"center" }}>
          <Dot ok={true}/>SUI DEVNET
        </span>
        <span style={{ display:"flex", alignItems:"center" }}>
          <Dot ok={connected}/>
          {connected ? `WALLET ${short}` : "SIGN IN FOR PASSPORT"}
        </span>
        <span style={{ display:"flex", alignItems:"center" }}>
          <Dot ok={true}/> AAS-1 PROTOCOL
        </span>
      </div>
    </div>
  );
}
