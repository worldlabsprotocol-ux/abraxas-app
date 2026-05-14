// FILE: app/admin/page.tsx
// Admin dashboard — all tokenization events. Wallet-gated.
// Shows: wallet, asset name, class, ABRA spent, vault, validation status, timestamp.
"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useWallet }           from "@solana/wallet-adapter-react";
import { useAbraStore }        from "@/lib/abraxasStore";

// Admin wallet — update to your wallet address
const ADMIN_WALLETS = [
  "pabloretroworld",   // placeholder — replace with real pubkey
].map(w => w.toLowerCase());

const VAULT_MAP: Record<string,string> = {
  Watches:         "CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf",
  Spirits:         "CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk",
  "Cards (PSA/BGS)":"8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58",
  Metals:          "Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf",
  default:         "63LGWS2JSK5CawZt6iPchVU6wj63v3DtsTR1jaRnjMaY",
};

const STATUS_COLOR: Record<string,string> = {
  created:"#C8A96E", pending_soft:"#FBBF24", pending_standard:"#FBBF24",
  verified:"#14F195", collateral_eligible:"#14F195", borrowed:"#6b8cff",
  pending_verification:"#FBBF24", listed:"#14F195", closed:"rgba(255,255,255,0.2)",
};

function shortKey(k:string):string { return k ? `${k.slice(0,6)}…${k.slice(-4)}` : "—"; }
function fmtUsd(n:number):string { return n>=1000?`$${(n/1000).toFixed(0)}K`:`$${n.toFixed(0)}`; }

export default function AdminPage() {
  const [mounted, setMounted]   = useState(false);
  const [authed,  setAuthed]    = useState(false);
  const [bypass,  setBypass]    = useState(false);
  const [pin,     setPin]       = useState("");
  const { publicKey, connected } = useWallet();
  const assets    = useAbraStore(s => s.assets);
  const storeABRA = useAbraStore(s => s.abraBalance);

  const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? "abraxas2026";

  useEffect(() => {
    setMounted(true);
    if (connected && publicKey) {
      const pk = publicKey.toBase58().toLowerCase();
      if (ADMIN_WALLETS.some(w => pk.includes(w)) || ADMIN_WALLETS.includes(pk)) {
        setAuthed(true);
      }
    }
  }, [connected, publicKey]);

  if (!mounted) return null;

  const isAdmin = authed || bypass;

  // ── PIN gate ───────────────────────────────────────────────────────────────
  if (!isAdmin) return (
    <div style={{ minHeight:"100vh", background:"#060810",
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", gap:"1rem" }}>
      <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.3)",
                    fontFamily:"'JetBrains Mono',monospace",
                    textTransform:"uppercase", letterSpacing:"0.2em" }}>
        ABRAXAS — Admin Access
      </div>
      <input value={pin} onChange={e=>setPin(e.target.value)}
             placeholder="Enter admin PIN" type="password"
             style={{ padding:"0.625rem 1rem", borderRadius:"8px",
                      background:"rgba(255,255,255,0.04)",
                      border:"1px solid rgba(255,255,255,0.12)",
                      color:"#f0f0f0", fontSize:"0.62rem",
                      fontFamily:"'JetBrains Mono',monospace",
                      outline:"none", width:240, textAlign:"center" }}
             onKeyDown={e => { if(e.key==="Enter" && pin===ADMIN_PIN) setBypass(true); }}/>
      <button onClick={() => { if(pin===ADMIN_PIN) setBypass(true); }}
              style={{ padding:"0.5rem 1.25rem", borderRadius:"7px",
                       border:"none", cursor:"pointer",
                       background:"#7c3aed", color:"#fff",
                       fontSize:"0.58rem", fontWeight:700,
                       fontFamily:"'JetBrains Mono',monospace" }}>
        Enter
      </button>
      <div style={{ fontSize:"0.42rem", color:"rgba(255,255,255,0.18)",
                    fontFamily:"'JetBrains Mono',monospace" }}>
        Or connect admin wallet for automatic access
      </div>
    </div>
  );

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const totalAbra  = assets.reduce((s,a) => s+a.mintCostAbra, 0);
  const totalValue = assets.reduce((s,a) => s+a.estimatedUsd, 0);

  return (
    <div style={{ minHeight:"100vh", background:"#060810", padding:"1.5rem" }}>
      {/* Header */}
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", marginBottom:"1.5rem",
                      flexWrap:"wrap", gap:"0.75rem" }}>
          <div>
            <div style={{ fontSize:"0.4rem", color:"rgba(255,255,255,0.2)",
                          fontFamily:"'JetBrains Mono',monospace",
                          textTransform:"uppercase", letterSpacing:"0.2em",
                          marginBottom:"0.2rem" }}>
              ABRAXAS PROTOCOL — ADMIN
            </div>
            <h1 style={{ fontWeight:900, fontSize:"1.5rem", color:"#f0f0f0",
                         margin:0, letterSpacing:"-0.025em" }}>
              Tokenization Registry
            </h1>
          </div>
          <a href="/" style={{ padding:"0.4rem 0.875rem", borderRadius:"7px",
                               background:"rgba(255,255,255,0.04)",
                               border:"1px solid rgba(255,255,255,0.08)",
                               color:"rgba(255,255,255,0.4)",
                               fontSize:"0.54rem", textDecoration:"none",
                               fontFamily:"'JetBrains Mono',monospace" }}>
            ← Back to App
          </a>
        </div>

        {/* Stats */}
        <div style={{ display:"grid",
                      gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
                      gap:"0.625rem", marginBottom:"1.5rem" }}>
          {([
            ["Total Events",   assets.length.toString(),          "#f0f0f0"],
            ["Total Value",    fmtUsd(totalValue),                "#C8A96E"],
            ["ABRA Consumed",  `${totalAbra.toLocaleString()} $ABRA`,"#C8A96E"],
            ["Pending Review", assets.filter(a=>a.status.includes("pending")).length.toString(),"#FBBF24"],
            ["Verified",       assets.filter(a=>a.status==="verified"||a.status==="collateral_eligible").length.toString(),"#14F195"],
            ["Store Balance",  `${storeABRA.toLocaleString()} $ABRA`,"rgba(255,255,255,0.5)"],
          ] as [string,string,string][]).map(([l,v,c]) => (
            <div key={l} style={{ padding:"0.75rem 1rem",
                                  background:"rgba(255,255,255,0.03)",
                                  border:"1px solid rgba(255,255,255,0.06)",
                                  borderRadius:"9px" }}>
              <div style={{ fontSize:"0.88rem", fontWeight:900, color:c,
                            fontFamily:"'JetBrains Mono',monospace",
                            lineHeight:1, marginBottom:4 }}>{v || "—"}</div>
              <div style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.28)",
                            fontFamily:"'JetBrains Mono',monospace",
                            textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Events table */}
        {assets.length === 0 ? (
          <div style={{ padding:"3rem", textAlign:"center",
                        background:"rgba(255,255,255,0.02)",
                        border:"1px solid rgba(255,255,255,0.05)",
                        borderRadius:"10px" }}>
            <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.25)" }}>
              No tokenization events recorded
            </div>
          </div>
        ) : (
          <div style={{ background:"rgba(6,8,16,0.98)",
                        border:"1px solid rgba(255,255,255,0.06)",
                        borderRadius:"12px", overflow:"hidden" }}>
            {/* Table header */}
            <div style={{ display:"grid",
                          gridTemplateColumns:"2fr 1.4fr 1fr 1fr 1.8fr 1fr",
                          padding:"0.625rem 1rem",
                          borderBottom:"1px solid rgba(255,255,255,0.06)",
                          gap:"0.5rem" }}>
              {["Asset","Wallet","Class","ABRA Spent","Vault","Status"].map(h => (
                <div key={h} style={{ fontSize:"0.38rem", fontWeight:700,
                                      color:"rgba(255,255,255,0.25)",
                                      fontFamily:"'JetBrains Mono',monospace",
                                      textTransform:"uppercase",
                                      letterSpacing:"0.1em" }}>{h}</div>
              ))}
            </div>
            {/* Rows */}
            {assets.map((a,i) => {
              const vault  = VAULT_MAP[a.assetClass] ?? VAULT_MAP.default;
              const stColor= STATUS_COLOR[a.status]  ?? "#C8A96E";
              return (
                <div key={a.id} style={{
                  display:"grid",
                  gridTemplateColumns:"2fr 1.4fr 1fr 1fr 1.8fr 1fr",
                  padding:"0.75rem 1rem",
                  borderBottom:i<assets.length-1?"1px solid rgba(255,255,255,0.04)":"none",
                  gap:"0.5rem", alignItems:"center",
                  transition:"background 0.1s",
                }}>
                  {/* Asset */}
                  <div>
                    <div style={{ fontWeight:700, fontSize:"0.6rem", color:"#f0f0f0",
                                  overflow:"hidden", textOverflow:"ellipsis",
                                  whiteSpace:"nowrap" }}>{a.name}</div>
                    <div style={{ fontSize:"0.38rem",
                                  color:"rgba(255,255,255,0.25)",
                                  fontFamily:"'JetBrains Mono',monospace",
                                  marginTop:1 }}>{fmtUsd(a.estimatedUsd)}</div>
                  </div>
                  {/* Wallet */}
                  <div style={{ fontSize:"0.46rem",
                                color:"rgba(255,255,255,0.45)",
                                fontFamily:"'JetBrains Mono',monospace",
                                overflow:"hidden", textOverflow:"ellipsis" }}>
                    {shortKey(a.ownerWallet)}
                  </div>
                  {/* Class */}
                  <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.55)",
                                fontFamily:"'JetBrains Mono',monospace" }}>
                    {a.assetClass.split(" ")[0]}
                  </div>
                  {/* ABRA */}
                  <div style={{ fontSize:"0.52rem", fontWeight:700,
                                color:"#C8A96E",
                                fontFamily:"'JetBrains Mono',monospace" }}>
                    {a.mintCostAbra.toLocaleString()}
                  </div>
                  {/* Vault */}
                  <div style={{ fontSize:"0.38rem",
                                color:"rgba(255,255,255,0.3)",
                                fontFamily:"'JetBrains Mono',monospace",
                                overflow:"hidden", textOverflow:"ellipsis" }}>
                    {shortKey(vault)}
                  </div>
                  {/* Status */}
                  <div style={{ padding:"2px 8px",
                                borderRadius:5, display:"inline-flex",
                                alignItems:"center", gap:4,
                                background:`${stColor}12`,
                                border:`1px solid ${stColor}30`,
                                width:"fit-content" }}>
                    <div style={{ width:4, height:4, borderRadius:"50%",
                                  background:stColor, flexShrink:0 }}/>
                    <span style={{ fontSize:"0.38rem", fontWeight:700,
                                   color:stColor,
                                   fontFamily:"'JetBrains Mono',monospace",
                                   textTransform:"uppercase",
                                   letterSpacing:"0.05em",
                                   whiteSpace:"nowrap" }}>
                      {a.status.replace(/_/g," ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:"1rem", fontSize:"0.42rem",
                      color:"rgba(255,255,255,0.12)",
                      fontFamily:"'JetBrains Mono',monospace",
                      textAlign:"center" }}>
          ABRAXAS PROTOCOL ADMIN · $ABRA: 5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
        </div>
      </div>
    </div>
  );
}