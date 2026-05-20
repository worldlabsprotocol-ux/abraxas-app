// FILE: components/CompactWallet.tsx
// Compact wallet button + NextAuth session awareness.
// No tweetnacl in client code — signature verification is server-side only.
// All imports at top.
"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet }                   from "@solana/wallet-adapter-react";
import { useWalletModal }              from "@solana/wallet-adapter-react-ui";
import { useSession, signOut }         from "next-auth/react";
import { useAbraBalance }              from "@/lib/hooks/useAbraBalance";

const MONO = "'JetBrains Mono',monospace";

export function CompactWallet() {
  const { publicKey, connected, disconnect, wallet, signMessage } = useWallet();
  const { setVisible }      = useWalletModal();
  const { data: session }   = useSession();
  const { balance, loading} = useAbraBalance();
  const [open,    setOpen]    = useState(false);
  const [linking, setLinking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const addr    = publicKey?.toBase58() ?? "";
  const short   = addr ? `${addr.slice(0,4)}…${addr.slice(-4)}` : "";
  const user    = session?.user as (Record<string,unknown> & { walletAddress?: string }) | undefined;
  const needsLink = connected && user && !user.walletAddress;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Wallet link — signature sent to server-side route for verification
  async function handleLinkWallet() {
    if (!signMessage || !publicKey || !user) return;
    setLinking(true);
    try {
      const timestamp = Date.now();
      const userId    = String(user.id ?? "");
      const message   = `Link wallet to Abraxas Protocol.\nUser: ${userId}\nTimestamp: ${timestamp}`;
      const sig       = await signMessage(new TextEncoder().encode(message));
      await fetch("/api/auth/link-wallet", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature:     Array.from(sig),
          message,
        }),
      });
      window.location.reload();
    } catch { /* cancelled */ }
    finally { setLinking(false); }
  }

  // Not connected + no session
  if (!connected && !user) {
    return (
      <div style={{ display:"flex", gap:"0.4rem" }}>
        <button onClick={() => setVisible(true)} style={{
          padding:"0.35rem 0.875rem", borderRadius:"5px",
          border:"1px solid rgba(124,58,237,0.5)", cursor:"pointer",
          fontWeight:700, fontSize:"0.54rem", fontFamily:MONO,
          background:"rgba(124,58,237,0.12)", color:"#a78bfa",
          whiteSpace:"nowrap", transition:"all 0.15s",
        }}>Connect Wallet</button>
        <a href="/auth/signin" style={{
          padding:"0.35rem 0.75rem", borderRadius:"5px",
          border:"1px solid rgba(255,255,255,0.1)",
          color:"rgba(255,255,255,0.35)", textDecoration:"none",
          background:"rgba(255,255,255,0.03)", fontSize:"0.52rem",
          fontFamily:MONO, fontWeight:600, whiteSpace:"nowrap",
        }}>Sign In</a>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display:"flex", alignItems:"center", gap:"0.4rem",
        padding:"0.35rem 0.75rem", borderRadius:"5px",
        border:`1px solid ${connected?"rgba(20,241,149,0.25)":"rgba(255,255,255,0.1)"}`,
        cursor:"pointer",
        background:connected?"rgba(20,241,149,0.06)":"rgba(255,255,255,0.03)",
        transition:"all 0.15s",
      }}>
        <div style={{ width:6,height:6,borderRadius:"50%",flexShrink:0,
                      background:connected?"#14F195":"rgba(255,255,255,0.3)" }}/>
        <span style={{ fontSize:"0.5rem",fontWeight:700,
                       color:"rgba(255,255,255,0.7)",fontFamily:MONO }}>
          {connected ? short : (user?.name ?? String(user?.email ?? "Account")).split("@")[0]}
        </span>
        {!loading && balance > 0 && connected && (
          <span style={{ fontSize:"0.44rem",color:"rgba(200,169,110,0.6)",
                         fontFamily:MONO,borderLeft:"1px solid rgba(255,255,255,0.1)",
                         paddingLeft:"0.4rem" }}>
            {balance.toLocaleString()} ABRA
          </span>
        )}
        {needsLink && (
          <span style={{ fontSize:"0.38rem",color:"#FBBF24",fontFamily:MONO }}>⚠</span>
        )}
        <span style={{ fontSize:"0.38rem",color:"rgba(255,255,255,0.25)" }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:"absolute",top:"calc(100% + 6px)",right:0,zIndex:200,
          background:"rgba(10,12,20,0.98)",borderRadius:"8px",
          border:"1px solid rgba(255,255,255,0.09)",
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)",minWidth:220,
          overflow:"hidden",
        }}>
          {user && (
            <div style={{padding:"0.75rem 1rem",
                         borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.25)",
                           fontFamily:MONO,textTransform:"uppercase",
                           letterSpacing:"0.12em",marginBottom:3}}>Signed In As</div>
              <div style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.7)",
                           fontFamily:MONO}}>
                {String(user.name ?? user.email ?? "Account")}
              </div>
            </div>
          )}

          {connected && (
            <div style={{padding:"0.625rem 1rem",
                         borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.25)",
                           fontFamily:MONO,textTransform:"uppercase",
                           letterSpacing:"0.12em",marginBottom:3}}>Wallet</div>
              <div style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.6)",
                           fontFamily:MONO,wordBreak:"break-all"}}>{addr}</div>
            </div>
          )}

          {connected && !loading && (
            <div style={{padding:"0.625rem 1rem",
                         borderBottom:"1px solid rgba(255,255,255,0.06)",
                         display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",
                            fontFamily:MONO}}>ABRA</span>
              <span style={{fontSize:"0.58rem",fontWeight:800,
                            color:"#C8A96E",fontFamily:MONO}}>
                {balance.toLocaleString()}
              </span>
            </div>
          )}

          {needsLink && (
            <button onClick={()=>{setOpen(false);handleLinkWallet();}}
              disabled={linking}
              style={{width:"100%",padding:"0.625rem 1rem",background:"none",
                      border:"none",cursor:"pointer",textAlign:"left",
                      fontSize:"0.48rem",fontWeight:700,fontFamily:MONO,
                      color:"#FBBF24",
                      borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              {linking?"Signing…":"⚠ Link Wallet to Account"}
            </button>
          )}

          {!connected ? (
            <button onClick={()=>{setVisible(true);setOpen(false);}}
              style={{width:"100%",padding:"0.625rem 1rem",background:"none",
                      border:"none",cursor:"pointer",textAlign:"left",
                      fontSize:"0.48rem",fontWeight:700,fontFamily:MONO,
                      color:"rgba(107,140,255,0.8)",
                      borderBottom:user?"1px solid rgba(255,255,255,0.06)":"none"}}>
              Connect Wallet
            </button>
          ):(
            <button onClick={()=>{disconnect();setOpen(false);}}
              style={{width:"100%",padding:"0.625rem 1rem",background:"none",
                      border:"none",cursor:"pointer",textAlign:"left",
                      fontSize:"0.48rem",fontWeight:700,fontFamily:MONO,
                      color:"rgba(242,107,107,0.7)",
                      borderBottom:user?"1px solid rgba(255,255,255,0.06)":"none"}}>
              Disconnect Wallet
            </button>
          )}

          {user && (
            <button onClick={()=>{signOut();setOpen(false);}}
              style={{width:"100%",padding:"0.625rem 1rem",background:"none",
                      border:"none",cursor:"pointer",textAlign:"left",
                      fontSize:"0.48rem",fontWeight:700,fontFamily:MONO,
                      color:"rgba(242,107,107,0.7)"}}>
              Sign Out
            </button>
          )}
        </div>
      )}
    </div>
  );
}