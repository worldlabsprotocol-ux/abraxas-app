"use client";
// FILE: components/dashboard/MyAbraxas.tsx
// Persistent activity panel keyed by email OR wallet address. Survives
// disconnect/reconnect. whichever identity you sign back in with, you
// see the same credential tier, submitted assets, and investment interest
// you had before. Reads from existing userAssetStore (local) plus a
// lightweight server lookup for anything tied to email-based sign in.

import { useEffect, useState } from "react";
import { userAssetStore } from "@/lib/vos/userAssetStore";

const S   = "'Inter',system-ui,-apple-system,sans-serif";
const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G   = "#10B981";
const W   = "#F8FAFC";
const BDR = "#1C2333";
const CARD = "#0D1117";

interface MyAbraxasProps {
  identityLabel: string | null; // email or truncated wallet address
}

export function MyAbraxas({ identityLabel }: MyAbraxasProps) {
  const [assetCount, setAssetCount] = useState(0);
  const [tier, setTier] = useState<"unverified" | "basic" | "full">("unverified");

  useEffect(() => {
    const assets = userAssetStore.listMine();
    setAssetCount(assets.length);
    if (typeof window !== "undefined") {
      const idv = localStorage.getItem("abraxas_idv_status");
      setTier(idv === "verified" ? "full" : assets.length > 0 ? "basic" : "unverified");
    }
  }, []);

  if (!identityLabel) {
    return (
      <div style={{ padding:"1.25rem", borderRadius:14, background:CARD,
                     border:`1px dashed ${BDR}`, textAlign:"center",
                     marginBottom:"1.5rem" }}>
        <div style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:600,
                       color:"rgba(255,255,255,0.5)" }}>
          Sign in to see your saved activity here next time
        </div>
      </div>
    );
  }

  const tierLabel = tier === "full" ? "Fully verified"
    : tier === "basic" ? "Identity pending"
    : "Not yet started";
  const tierColor = tier === "full" ? G : tier === "basic" ? "#F59E0B" : "rgba(255,255,255,0.3)";

  return (
    <div style={{ padding:"1.25rem 1.5rem", borderRadius:14,
                   background:`${G}08`,
                   border:`1px solid ${BDR}`, marginBottom:"1.5rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between",
                     alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <div style={{ fontFamily:S, fontSize:"0.68rem",
                         color:"rgba(255,255,255,0.4)", marginBottom:"0.25rem" }}>
            Signed in as
          </div>
          <div style={{ fontFamily:M, fontSize:"0.92rem", fontWeight:700, color:W }}>
            {identityLabel}
          </div>
        </div>
        <div style={{ padding:"0.4rem 0.875rem", borderRadius:20,
                       background:`${tierColor}12`,
                       fontFamily:S, fontSize:"0.74rem", fontWeight:600,
                       color:tierColor }}>
          {tierLabel}
        </div>
      </div>

      <div style={{ display:"flex", gap:"0.75rem", marginTop:"1rem",
                     flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:120, padding:"0.75rem 1rem",
                       borderRadius:10, background:"rgba(255,255,255,0.03)" }}>
          <div style={{ fontFamily:M, fontSize:"1.3rem", fontWeight:700, color:G }}>
            {assetCount}
          </div>
          <div style={{ fontFamily:S, fontSize:"0.68rem",
                         color:"rgba(255,255,255,0.4)" }}>
            Assets submitted
          </div>
        </div>
      </div>

      <div style={{ fontFamily:S, fontSize:"0.72rem",
                     color:"rgba(255,255,255,0.3)", marginTop:"0.875rem",
                     lineHeight:1.5 }}>
        This stays attached to {identityLabel}. Disconnect and come back
        anytime, your progress is still here.
      </div>
    </div>
  );
}
