// FILE: components/PortfolioTab.tsx
"use client";
// Post-mint dashboard: all user's tokenized assets, ABRA spent, validation timeline,
// Loopscale borrowing CTA. Reads from Zustand store.
"use client";

import { useState, useEffect } from "react";
import { useWallet }         from "@solana/wallet-adapter-react";
import { useAbraStore }      from "@/lib/abraxasStore";
import { useAbraBalance, ABRA_GATE } from "@/lib/hooks/useAbraBalance";

const STATUS_LABEL: Record<string,{label:string;color:string;pct:number}> = {
  created:             { label:"Submitted",           color:"#C8A96E", pct:20  },
  pending_soft:        { label:"Initial Review",      color:"#FBBF24", pct:40  },
  pending_standard:    { label:"Custody Verification",color:"#FBBF24", pct:60  },
  verified:            { label:"Verified",            color:"#14F195", pct:80  },
  collateral_eligible: { label:"Borrow-Eligible",     color:"#14F195", pct:100 },
  borrowed:            { label:"Active Loan",         color:"#6b8cff", pct:100 },
  pending_verification:{ label:"Pending Verification",color:"#FBBF24", pct:40  },
  listed:              { label:"Listed",              color:"#14F195", pct:100 },
  closed:              { label:"Closed",              color:"rgba(255,255,255,0.3)", pct:0 },
};

const CAT_COLOR: Record<string,string> = {
  Watches:"#6b8cff", Spirits:"#FF8C00", "Cards (PSA/BGS)":"#FBBF24",
  "Comics (CGC)":"#a855f7", Racehorses:"#22c55e", Metals:"#D4AF37",
  Art:"#f26b6b", Other:"#C8A96E",
};

function fmt(n:number) { return n>=1000?`${(n/1000).toFixed(0)}K`:String(n); }
function fmtUsd(n:number) { return n>=1_000_000?`$${(n/1_000_000).toFixed(2)}M`:n>=1000?`$${(n/1000).toFixed(0)}K`:`$${n.toFixed(0)}`; }

export function PortfolioTab({ onTokenize }: { onTokenize?: () => void }) {
  const [mounted, setMounted] = useState(false);
  const { publicKey, connected } = useWallet();
  const { balance, loading: balLoading, meetsGate } = useAbraBalance();
  const assets    = useAbraStore(s => s.assets);
  const storeABRA = useAbraStore(s => s.abraBalance);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const totalSpent    = assets.reduce((s,a) => s + a.mintCostAbra, 0);
  const totalValue    = assets.reduce((s,a) => s + a.estimatedUsd, 0);
  const totalBorrowable = assets.reduce((s,a) => s + Math.round(a.estimatedUsd*a.ltv/100), 0);

  // Display balance: real SPL if wallet connected, else demo store balance
  const displayBalance = connected ? balance : storeABRA;
  const qualifies      = connected ? meetsGate : storeABRA >= 100_000;

  return (
    <div style={{ maxWidth:860, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom:"1.75rem" }}>
        <h2 style={{ fontWeight:900, fontSize:"1.25rem", color:"#f0f0f0",
                     margin:"0 0 0.3rem", letterSpacing:"-0.025em" }}>
          Portfolio
        </h2>
        <p style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.35)", margin:0, lineHeight:1.6 }}>
          Your on-chain position registry. Every tokenized asset with its validation status,
          declared value, and available liquidity — all in one place.
        </p>
      </div>

      {/* ABRA status card */}
      <div style={{ padding:"1rem 1.25rem",
                    background: qualifies ? "rgba(20,241,149,0.05)" : "rgba(242,107,107,0.05)",
                    border:`1px solid ${qualifies?"rgba(20,241,149,0.2)":"rgba(242,107,107,0.25)"}`,
                    borderRadius:"10px", marginBottom:"1.25rem",
                    display:"flex", justifyContent:"space-between",
                    alignItems:"center", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <div style={{ fontSize:"0.42rem", color:"rgba(255,255,255,0.35)",
                        fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase",
                        letterSpacing:"0.1em", marginBottom:3 }}>
            {connected ? "Wallet ABRA Balance" : "Demo Balance"}
          </div>
          <div style={{ fontSize:"1.1rem", fontWeight:900, color: qualifies?"#14F195":"#f26b6b",
                        fontFamily:"'JetBrains Mono',monospace" }}>
            {balLoading ? "…" : fmt(displayBalance)} ABRA
          </div>
          {!qualifies && (
            <div style={{ fontSize:"0.46rem", color:"#f26b6b", marginTop:3 }}>
              {ABRA_GATE.toLocaleString()} ABRA required to mint.
              {!connected && " Connect wallet to check live balance."}
            </div>
          )}
        </div>
        {!connected && (
          <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.3)",
                        fontFamily:"'JetBrains Mono',monospace",
                        padding:"0.3rem 0.625rem",
                        background:"rgba(255,255,255,0.03)",
                        border:"1px solid rgba(255,255,255,0.07)",
                        borderRadius:"5px" }}>
            DEMO MODE
          </div>
        )}
      </div>

      {/* Protocol metrics */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",
                    gap:"0.5rem", marginBottom:"1.75rem" }}>
        {([
          ["Assets Tokenized", assets.length.toString(),     "#f0f0f0"],
          ["Total Value",      fmtUsd(totalValue),           "#C8A96E"],
          ["ABRA Spent",       `${fmt(totalSpent)} $ABRA`,   "#C8A96E"],
          ["Borrow Capacity",  fmtUsd(totalBorrowable)+" USDC","#14F195"],
        ] as [string,string,string][]).map(([l,v,c]) => (
          <div key={l} style={{ padding:"0.75rem 0.875rem",
                                background:"rgba(6,8,16,0.98)",
                                border:"1px solid rgba(255,255,255,0.06)",
                                borderRadius:"9px" }}>
            <div style={{ fontSize:"0.88rem", fontWeight:900, color:c,
                          fontFamily:"'JetBrains Mono',monospace",
                          lineHeight:1, marginBottom:4 }}>{v}</div>
            <div style={{ fontSize:"0.4rem", color:"rgba(255,255,255,0.3)",
                          fontFamily:"'JetBrains Mono',monospace",
                          textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Asset list */}
      {assets.length === 0 ? (
        <div style={{ padding:"3rem 2rem", textAlign:"center",
                      background:"rgba(6,8,16,0.97)",
                      border:"1px solid rgba(255,255,255,0.06)",
                      borderRadius:"12px", marginBottom:"1.5rem" }}>
          <div style={{ fontSize:"0.72rem", fontWeight:700,
                        color:"rgba(255,255,255,0.28)", marginBottom:"0.5rem" }}>
            No assets tokenized yet
          </div>
          <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.2)",
                        marginBottom:"1.25rem", lineHeight:1.7, maxWidth:380 }}>
            Real-world assets — watches, spirits, metals, art — were once locked behind
            institutions. Tokenize your first asset to bring it on-chain and unlock
            immediate capital access via Loopscale lending.
          </div>
          <button onClick={onTokenize} style={{
            padding:"0.625rem 1.25rem", borderRadius:"8px", border:"none",
            cursor:"pointer", fontWeight:800, fontSize:"0.58rem",
            fontFamily:"'JetBrains Mono',monospace",
            background:"linear-gradient(135deg,#C8A96E,#FBBF24)", color:"#000",
          }}>Tokenize Your First Asset</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem",
                      marginBottom:"1.5rem" }}>
          {assets.map(a => {
            const st  = STATUS_LABEL[a.status] ?? STATUS_LABEL["created"];
            const col = CAT_COLOR[a.assetClass] ?? "#C8A96E";
            const maxBorrow = Math.round(a.estimatedUsd * a.ltv / 100);
            return (
              <div key={a.id} style={{ background:`${col}07`,
                                       border:`1px solid ${col}20`,
                                       borderRadius:"12px", overflow:"hidden" }}>
                <div style={{ display:"flex", gap:"1rem",
                              padding:"0.875rem 1rem", flexWrap:"wrap" }}>
                  {/* Image */}
                  <div style={{ width:72, height:72, flexShrink:0,
                                background:`${col}0a`, borderRadius:8,
                                overflow:"hidden", display:"flex",
                                alignItems:"center", justifyContent:"center" }}>
                    {a.imagePreview
                      ? <img src={a.imagePreview} alt={a.name}
                             style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                      : <span style={{ fontSize:"1.25rem", color:col, opacity:0.5 }}>◈</span>
                    }
                  </div>
                  {/* Details */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center",
                                  gap:"0.5rem", marginBottom:3, flexWrap:"wrap" }}>
                      <span style={{ fontSize:"0.4rem", fontWeight:800, color:col,
                                     fontFamily:"'JetBrains Mono',monospace",
                                     textTransform:"uppercase" }}>{a.assetClass}</span>
                      <span style={{ fontSize:"0.4rem", fontWeight:700,
                                     color:st.color,
                                     fontFamily:"'JetBrains Mono',monospace",
                                     padding:"1px 6px",
                                     background:`${st.color}12`,
                                     border:`1px solid ${st.color}30`,
                                     borderRadius:4 }}>{st.label}</span>
                    </div>
                    <div style={{ fontWeight:800, fontSize:"0.76rem", color:"#f0f0f0",
                                  overflow:"hidden", textOverflow:"ellipsis",
                                  whiteSpace:"nowrap" }}>{a.name}</div>
                    <div style={{ fontSize:"0.44rem",
                                  color:"rgba(255,255,255,0.3)",
                                  fontFamily:"'JetBrains Mono',monospace",
                                  marginTop:3, wordBreak:"break-all" }}>
                      Tx: {a.txSignature.slice(0,14)}…
                    </div>
                  </div>
                  {/* Financials */}
                  <div style={{ display:"flex", flexDirection:"column",
                                gap:"0.35rem", alignItems:"flex-end",
                                flexShrink:0, minWidth:100 }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:"0.82rem", fontWeight:900, color:"#f0f0f0",
                                    fontFamily:"'JetBrains Mono',monospace",
                                    lineHeight:1 }}>{fmtUsd(a.estimatedUsd)}</div>
                      <div style={{ fontSize:"0.38rem",
                                    color:"rgba(255,255,255,0.28)",
                                    fontFamily:"'JetBrains Mono',monospace" }}>
                        declared value
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:"0.66rem", fontWeight:800, color:"#14F195",
                                    fontFamily:"'JetBrains Mono',monospace" }}>
                        {fmtUsd(maxBorrow)}
                      </div>
                      <div style={{ fontSize:"0.38rem",
                                    color:"rgba(255,255,255,0.28)",
                                    fontFamily:"'JetBrains Mono',monospace" }}>
                        max borrow USDC
                      </div>
                    </div>
                    <div style={{ fontSize:"0.42rem",
                                  color:"rgba(200,169,110,0.7)",
                                  fontFamily:"'JetBrains Mono',monospace" }}>
                      {a.mintCostAbra} $ABRA spent
                    </div>
                  </div>
                </div>
                {/* Validation progress bar */}
                <div style={{ padding:"0.5rem 1rem 0.625rem",
                              borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                                marginBottom:"0.3rem" }}>
                    <span style={{ fontSize:"0.4rem",
                                   color:"rgba(255,255,255,0.3)",
                                   fontFamily:"'JetBrains Mono',monospace",
                                   textTransform:"uppercase",
                                   letterSpacing:"0.08em" }}>
                      Validation Progress
                    </span>
                    <span style={{ fontSize:"0.4rem", fontWeight:700,
                                   color:st.color,
                                   fontFamily:"'JetBrains Mono',monospace" }}>
                      {st.pct}%
                    </span>
                  </div>
                  <div style={{ height:2, background:"rgba(255,255,255,0.05)",
                                borderRadius:1, overflow:"hidden" }}>
                    <div style={{ height:"100%", background:st.color,
                                  width:`${st.pct}%`, borderRadius:1,
                                  transition:"width 0.8s ease" }}/>
                  </div>
                  <div style={{ display:"flex", gap:"0.5rem", marginTop:"0.4rem",
                                flexWrap:"wrap" }}>
                    {["Submitted","Reviewed","Custody Verified","Borrow-Eligible"].map((s,i) => (
                      <div key={s} style={{ display:"flex", alignItems:"center", gap:3 }}>
                        <div style={{ width:5, height:5, borderRadius:"50%",
                                      background: st.pct > i*25
                                        ? st.color : "rgba(255,255,255,0.12)" }}/>
                        <span style={{ fontSize:"0.38rem",
                                       color: st.pct > i*25
                                         ? "rgba(255,255,255,0.55)"
                                         : "rgba(255,255,255,0.2)",
                                       fontFamily:"'JetBrains Mono',monospace" }}>
                          {s}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Loopscale CTA */}
      {assets.length > 0 && totalBorrowable > 0 && (
        <div style={{ padding:"1.25rem",
                      background:"linear-gradient(145deg,rgba(107,140,255,0.07),rgba(6,8,16,0.99))",
                      border:"1px solid rgba(107,140,255,0.2)",
                      borderRadius:"12px" }}>
          <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"flex-start", gap:"1rem", flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:"0.44rem", fontWeight:700,
                            color:"rgba(107,140,255,0.7)",
                            fontFamily:"'JetBrains Mono',monospace",
                            textTransform:"uppercase", letterSpacing:"0.1em",
                            marginBottom:"0.3rem" }}>
                Liquidity Available
              </div>
              <div style={{ fontSize:"1.2rem", fontWeight:900, color:"#14F195",
                            fontFamily:"'JetBrains Mono',monospace",
                            marginBottom:"0.2rem" }}>
                {fmtUsd(totalBorrowable)} USDC
              </div>
              <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.38)",
                            lineHeight:1.6, maxWidth:340 }}>
                Your verified assets unlock institutional-grade USDC liquidity via Loopscale
                at 5.2% fixed APR. Retain ownership. Access capital. No liquidation without consent.
              </div>
            </div>
            <button onClick={() => window.open("https://app.loopscale.com","_blank","noopener")}
                    style={{ padding:"0.75rem 1.5rem", borderRadius:"9px",
                             border:"none", cursor:"pointer",
                             fontWeight:900, fontSize:"0.68rem",
                             fontFamily:"'JetBrains Mono',monospace",
                             background:"linear-gradient(135deg,#6b8cff,#14F195)",
                             color:"#000", whiteSpace:"nowrap",
                             flexShrink:0 }}>
              Borrow via Loopscale →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}