// FILE: components/LoopscaleBorrowSimulator.tsx
"use client";
// Capital tab — borrow against tokenized RWAs via Loopscale.
// Reads ONLY from Zustand store (no Supabase, no API).
"use client";

import { useState, useEffect } from "react";
import { useAbraStore, type AbraAsset } from "@/lib/abraxasStore";

const fmtUsd = (v:number) =>
  v>=1_000_000 ? `$${(v/1_000_000).toFixed(2)}M`
  : v>=1_000   ? `$${(v/1_000).toFixed(1)}K`
                 : `$${v.toFixed(0)}`;

const CAT_COLOR: Record<string,string> = {
  Watches:"#6b8cff", Spirits:"#FF8C00", "Cards (PSA/BGS)":"#FBBF24",
  "Comics (CGC)":"#a855f7", Racehorses:"#22c55e", Metals:"#D4AF37",
  Art:"#f26b6b", Other:"#C8A96E",
};

export function LoopscaleBorrowSimulator() {
  const [mounted,   setMounted]  = useState(false);
  const [selected,  setSelected] = useState<string|null>(null);
  const assets = useAbraStore(s => s.assets);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const eligible = assets.filter(a =>
    a.status === "listed" || a.status === "pending_verification" || a.status === "verified"
  );

  const totalBorrowable = eligible.reduce(
    (s, a) => s + Math.round(a.estimatedUsd * a.ltv / 100), 0
  );
  const sel = eligible.find(a => a.id === selected);

  return (
    <div style={{ maxWidth:760, margin:"0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom:"1.5rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                      marginBottom:"0.35rem", flexWrap:"wrap" }}>
          <h2 style={{ fontWeight:900, fontSize:"1.2rem", color:"#f0f0f0",
                       margin:0, letterSpacing:"-0.02em" }}>
            Borrow Against Your RWAs
          </h2>
          <span style={{ padding:"0.15rem 0.5rem", borderRadius:"5px",
                         background:"rgba(107,140,255,0.1)",
                         border:"1px solid rgba(107,140,255,0.25)",
                         fontSize:"0.42rem", fontWeight:700, color:"#6b8cff",
                         fontFamily:"'JetBrains Mono',monospace" }}>
            Powered by Loopscale
          </span>
        </div>
        <p style={{ fontSize:"0.54rem", color:"rgba(255,255,255,0.38)",
                    margin:0, lineHeight:1.65 }}>
          Verified tokenized assets unlock immediate USDC borrowing via Loopscale.
          No selling. Capital on demand.
        </p>
      </div>

      {/* Stats strip */}
      {eligible.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
                      gap:"0.5rem", marginBottom:"1.5rem",
                      padding:"0.75rem 1rem",
                      background:"rgba(6,8,16,0.98)",
                      border:"1px solid rgba(255,255,255,0.06)",
                      borderRadius:"10px" }}>
          {([
            ["Assets",         eligible.length.toString(),  "#f0f0f0"],
            ["Total Borrowable",fmtUsd(totalBorrowable),    "#14F195"],
            ["Fixed APR",      "5.2%",                      "#14F195"],
            ["Settlement",     "USDC",                      "#6b8cff"],
          ] as [string,string,string][]).map(([l,v,c]) => (
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:"0.75rem", fontWeight:900, color:c,
                            fontFamily:"'JetBrains Mono',monospace",
                            lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.28)",
                            fontFamily:"'JetBrains Mono',monospace",
                            textTransform:"uppercase", marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {eligible.length === 0 ? (
        <div style={{ padding:"3rem 2rem", textAlign:"center",
                      background:"rgba(6,8,16,0.97)",
                      border:"1px solid rgba(255,255,255,0.06)",
                      borderRadius:"12px", marginBottom:"1.5rem" }}>
          <div style={{ fontSize:"2rem", opacity:0.25, marginBottom:"0.75rem" }}>◈</div>
          <div style={{ fontSize:"0.62rem", color:"rgba(255,255,255,0.35)",
                        marginBottom:"0.3rem", fontWeight:700 }}>
            No eligible assets yet
          </div>
          <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.2)" }}>
            Tokenize an asset in Studio — it becomes borrow-eligible here once minted
          </div>
        </div>
      ) : (
        <div style={{ display:"grid",
                      gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,210px),1fr))",
                      gap:"0.625rem", marginBottom:"1.25rem" }}>
          {eligible.map(a => {
            const c    = CAT_COLOR[a.assetClass] ?? "#C8A96E";
            const borrow = Math.round(a.estimatedUsd * a.ltv / 100);
            const isSel  = selected === a.id;
            return (
              <div key={a.id} onClick={() => setSelected(isSel ? null : a.id)}
                   style={{ background:`${c}${isSel?"12":"07"}`,
                            border:`1px solid ${c}${isSel?"50":"20"}`,
                            borderRadius:"12px", padding:"0.875rem",
                            cursor:"pointer", transition:"all 0.18s",
                            transform:isSel?"translateY(-2px)":"none",
                            boxShadow:isSel?`0 0 20px ${c}18`:"none" }}>
                {a.imagePreview
                  ? <img src={a.imagePreview} alt={a.name}
                         style={{ width:"100%", height:80, objectFit:"contain",
                                  borderRadius:6, background:"rgba(6,8,16,0.98)",
                                  marginBottom:"0.5rem" }}/>
                  : <div style={{ height:60, background:`${c}0a`,
                                  borderRadius:6, display:"flex",
                                  alignItems:"center", justifyContent:"center",
                                  fontSize:"1.25rem", color:c, opacity:0.5,
                                  marginBottom:"0.5rem" }}>◈</div>
                }
                <div style={{ fontSize:"0.4rem", fontWeight:800, color:c,
                              fontFamily:"'JetBrains Mono',monospace",
                              textTransform:"uppercase", marginBottom:2 }}>
                  {a.assetClass}
                </div>
                <div style={{ fontWeight:800, fontSize:"0.62rem", color:"#f0f0f0",
                              overflow:"hidden", textOverflow:"ellipsis",
                              whiteSpace:"nowrap", marginBottom:3 }}>{a.name}</div>
                <div style={{ fontSize:"0.7rem", fontWeight:900, color:"#f0f0f0",
                              fontFamily:"'JetBrains Mono',monospace",
                              marginBottom:2 }}>{fmtUsd(a.estimatedUsd)}</div>
                <div style={{ fontSize:"0.46rem", color:isSel?"#14F195":"rgba(20,241,149,0.5)",
                              fontFamily:"'JetBrains Mono',monospace" }}>
                  Up to {fmtUsd(borrow)} USDC · {a.ltv}% LTV
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected preview */}
      {sel && (
        <div style={{ padding:"1rem", background:"rgba(107,140,255,0.06)",
                      border:"1px solid rgba(107,140,255,0.2)",
                      borderRadius:"12px", marginBottom:"1rem" }}>
          <div style={{ fontSize:"0.44rem", fontWeight:700, color:"rgba(107,140,255,0.7)",
                        fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase",
                        marginBottom:"0.5rem" }}>
            Borrow Preview — {sel.name}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
                        gap:"0.4rem" }}>
            {([
              ["Asset Value",   fmtUsd(sel.estimatedUsd),                                "#f0f0f0"],
              ["Max Borrow",    `${fmtUsd(Math.round(sel.estimatedUsd*sel.ltv/100))} USDC`,"#14F195"],
              ["Fixed APR",     "5.2%",                                                   "#14F195"],
              ["LTV Cap",       `${sel.ltv}%`,                                            "#6b8cff"],
            ] as [string,string,string][]).map(([l,v,c]) => (
              <div key={l} style={{ padding:"0.35rem 0.5rem",
                                    background:"rgba(6,8,16,0.97)",
                                    border:"1px solid rgba(255,255,255,0.06)",
                                    borderRadius:"6px", textAlign:"center" }}>
                <div style={{ fontSize:"0.64rem", fontWeight:900, color:c,
                              fontFamily:"'JetBrains Mono',monospace",
                              lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.28)",
                              fontFamily:"'JetBrains Mono',monospace",
                              textTransform:"uppercase", marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <button onClick={() => window.open("https://app.loopscale.com","_blank","noopener")}
              style={{ width:"100%", padding:"1rem", borderRadius:"12px", border:"none",
                       cursor:"pointer", fontWeight:900, fontSize:"0.8rem",
                       fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em",
                       background:"linear-gradient(135deg,#6b8cff,#14F195)", color:"#000",
                       boxShadow:"0 0 28px rgba(107,140,255,0.3)",
                       marginBottom:"0.625rem" }}>
        Continue in Loopscale App →
      </button>
      <p style={{ fontSize:"0.42rem", color:"rgba(255,255,255,0.22)",
                  textAlign:"center", margin:0, lineHeight:1.6 }}>
        Connect your wallet in the Loopscale app to execute the borrow.
        LTVs and rates are powered by Loopscale markets.
      </p>
    </div>
  );
}