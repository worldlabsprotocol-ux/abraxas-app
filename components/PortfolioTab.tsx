// FILE: components/PortfolioTab.tsx
"use client";
// SINGLE CONSOLIDATED TAB — Portfolio + Studio + Loopscale borrow button.
// NO static data. NO fake numbers. NO placeholder cards.
// If user has zero assets: clean empty institutional state only.
// Hyperliquid-style: minimal, data-first, monospace, no emojis.
"use client";

import { useState, useEffect }          from "react";
import { useWallet }                    from "@solana/wallet-adapter-react";
import { useAbraStore }                 from "@/lib/abraxasStore";
import { useAbraBalance, ABRA_GATE }    from "@/lib/hooks/useAbraBalance";
import { IssuanceEngine }               from "@/components/IssuanceEngine";

type AbraAsset = ReturnType<typeof useAbraStore.getState>["assets"][0];

// ── Status display map ────────────────────────────────────────────────────────
const STATUS: Record<string,{label:string;color:string}> = {
  created:              { label:"Submitted",       color:"#C8A96E" },
  pending_soft:         { label:"Under Review",    color:"#FBBF24" },
  pending_standard:     { label:"Verifying",       color:"#FBBF24" },
  pending_verification: { label:"Pending",         color:"#FBBF24" },
  verified:             { label:"Verified",        color:"#14F195" },
  collateral_eligible:  { label:"Borrow Ready",   color:"#14F195" },
  borrowed:             { label:"Active Loan",     color:"#6b8cff" },
  listed:               { label:"Listed",          color:"#14F195" },
  closed:               { label:"Closed",          color:"rgba(255,255,255,0.2)" },
};

function fmtUsd(n:number):string {
  if (!n) return "—";
  return n>=1_000_000 ? `$${(n/1_000_000).toFixed(2)}M`
       : n>=1_000     ? `$${(n/1_000).toFixed(1)}K`
                       : `$${n.toFixed(0)}`;
}
function shortKey(k:string):string {
  return k && k.length > 12 ? `${k.slice(0,6)}…${k.slice(-4)}` : (k || "—");
}
function fmtAbra(n:number):string {
  return n ? `${n.toLocaleString()} ABRA` : "—";
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider({ label }:{ label:string }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:"0.75rem",
      margin:"2rem 0 1.25rem",
    }}>
      <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }}/>
      <span style={{
        fontSize:"0.38rem", fontWeight:700, color:"rgba(255,255,255,0.22)",
        fontFamily:"'JetBrains Mono',monospace",
        textTransform:"uppercase", letterSpacing:"0.18em",
      }}>{label}</span>
      <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }}/>
    </div>
  );
}

// ── Asset row ─────────────────────────────────────────────────────────────────
function AssetRow({ a }: { a:AbraAsset }) {
  const st  = STATUS[a.status] ?? STATUS["created"];
  const borrow = a.estimatedUsd > 0 ? Math.round(a.estimatedUsd * a.ltv / 100) : 0;
  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",
      padding:"0.75rem 0.875rem",
      borderBottom:"1px solid rgba(255,255,255,0.04)",
      alignItems:"center", gap:"0.5rem",
    }}>
      {/* Name */}
      <div>
        <div style={{
          fontWeight:700, fontSize:"0.62rem", color:"#f0f0f0",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        }}>{a.name || "Unnamed"}</div>
        <div style={{
          fontSize:"0.38rem", color:"rgba(255,255,255,0.25)",
          fontFamily:"'JetBrains Mono',monospace", marginTop:2,
        }}>{a.assetClass} · {shortKey(a.txSignature)}</div>
      </div>
      {/* Declared value */}
      <div style={{
        fontSize:"0.58rem", fontWeight:700, color:"#f0f0f0",
        fontFamily:"'JetBrains Mono',monospace",
      }}>{a.estimatedUsd > 0 ? fmtUsd(a.estimatedUsd) : "—"}</div>
      {/* ABRA spent */}
      <div style={{
        fontSize:"0.54rem", color:"#C8A96E",
        fontFamily:"'JetBrains Mono',monospace",
      }}>{fmtAbra(a.mintCostAbra)}</div>
      {/* Borrow capacity */}
      <div style={{
        fontSize:"0.54rem", color: borrow > 0 ? "#14F195" : "rgba(255,255,255,0.25)",
        fontFamily:"'JetBrains Mono',monospace",
      }}>{borrow > 0 ? fmtUsd(borrow) : "—"}</div>
      {/* Status */}
      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
        <div style={{
          width:5, height:5, borderRadius:"50%",
          background:st.color, flexShrink:0,
        }}/>
        <span style={{
          fontSize:"0.4rem", fontWeight:600, color:st.color,
          fontFamily:"'JetBrains Mono',monospace",
          textTransform:"uppercase", letterSpacing:"0.06em",
        }}>{st.label}</span>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function PortfolioTab() {
  const [mounted,      setMounted]     = useState(false);
  const [showStudio,   setShowStudio]  = useState(false);
  const { connected, publicKey }       = useWallet();
  const assets                         = useAbraStore(s => s.assets);
  const storeBalance                   = useAbraStore(s => s.abraBalance);
  const { balance: realBalance, loading: balLoading, meetsGate } = useAbraBalance();

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const displayBalance = connected ? realBalance : storeBalance;
  const qualifies      = connected ? meetsGate   : storeBalance >= ABRA_GATE;

  // Real computed totals — only when user has data
  const totalValue     = assets.reduce((s,a) => s + a.estimatedUsd,    0);
  const totalSpent     = assets.reduce((s,a) => s + a.mintCostAbra,    0);
  const totalBorrowable= assets.reduce((s,a) => s + Math.round(a.estimatedUsd * a.ltv / 100), 0);

  const hasAssets = assets.length > 0;

  return (
    <div style={{ maxWidth:860, margin:"0 auto" }}>

      {/* ── Page title ──────────────────────────────────────────────── */}
      <div style={{ marginBottom:"1.75rem" }}>
        <h1 style={{
          fontWeight:900, fontSize:"1.4rem", color:"#f0f0f0",
          margin:"0 0 0.3rem", letterSpacing:"-0.03em",
        }}>Portfolio</h1>
        <p style={{
          fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", margin:0,
          fontFamily:"'JetBrains Mono',monospace",
        }}>
          On-chain asset registry · ABRA issuance · Loopscale liquidity
        </p>
      </div>

      {/* ── ABRA qualification bar ──────────────────────────────────── */}
      <div style={{
        padding:"0.75rem 1rem",
        background: qualifies ? "rgba(255,255,255,0.02)" : "rgba(242,107,107,0.04)",
        border:`1px solid ${qualifies ? "rgba(255,255,255,0.07)" : "rgba(242,107,107,0.2)"}`,
        borderRadius:"8px", marginBottom:"1.5rem",
        display:"flex", justifyContent:"space-between",
        alignItems:"center", flexWrap:"wrap", gap:"0.5rem",
      }}>
        <div>
          <div style={{
            fontSize:"0.38rem", color:"rgba(255,255,255,0.25)",
            fontFamily:"'JetBrains Mono',monospace",
            textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:3,
          }}>
            {connected ? "Wallet · ABRA Balance" : "Demo Balance"}
          </div>
          <div style={{
            fontSize:"0.88rem", fontWeight:900,
            color: qualifies ? "#f0f0f0" : "#f26b6b",
            fontFamily:"'JetBrains Mono',monospace",
          }}>
            {balLoading ? "…" : displayBalance.toLocaleString()} <span style={{ fontSize:"0.5rem", fontWeight:400, color:"rgba(255,255,255,0.35)" }}>ABRA</span>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{
            fontSize:"0.38rem", color:"rgba(255,255,255,0.25)",
            fontFamily:"'JetBrains Mono',monospace",
            textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:3,
          }}>Required to mint</div>
          <div style={{
            fontSize:"0.66rem", fontWeight:700,
            color: qualifies ? "rgba(255,255,255,0.35)" : "#f26b6b",
            fontFamily:"'JetBrains Mono',monospace",
          }}>{ABRA_GATE.toLocaleString()}</div>
        </div>
      </div>

      {/* ── Metrics strip — ONLY if user has real data ──────────────── */}
      {hasAssets && (
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(4,1fr)",
          gap:1, background:"rgba(255,255,255,0.06)",
          borderRadius:"8px", overflow:"hidden", marginBottom:"1.5rem",
        }}>
          {([
            ["Assets",         assets.length.toString()],
            ["Total Value",    fmtUsd(totalValue)],
            ["ABRA Spent",     fmtAbra(totalSpent)],
            ["Borrow Capacity",fmtUsd(totalBorrowable)],
          ] as [string,string][]).map(([l,v]) => (
            <div key={l} style={{
              padding:"0.875rem 1rem",
              background:"rgba(6,8,16,0.98)",
            }}>
              <div style={{
                fontSize:"0.82rem", fontWeight:900, color:"#f0f0f0",
                fontFamily:"'JetBrains Mono',monospace", lineHeight:1, marginBottom:4,
              }}>{v}</div>
              <div style={{
                fontSize:"0.36rem", color:"rgba(255,255,255,0.25)",
                fontFamily:"'JetBrains Mono',monospace",
                textTransform:"uppercase", letterSpacing:"0.1em",
              }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Asset registry ──────────────────────────────────────────── */}
      <Divider label="Asset Registry" />

      {!hasAssets ? (
        /* Empty state — no fake data, just clean institutional copy */
        <div style={{
          padding:"3rem 2rem", textAlign:"center",
          background:"rgba(255,255,255,0.01)",
          border:"1px solid rgba(255,255,255,0.05)",
          borderRadius:"8px",
        }}>
          <div style={{
            fontSize:"0.62rem", fontWeight:700, color:"rgba(255,255,255,0.2)",
            marginBottom:"0.5rem", letterSpacing:"-0.01em",
          }}>No assets on record</div>
          <div style={{
            fontSize:"0.48rem", color:"rgba(255,255,255,0.15)",
            lineHeight:1.7, maxWidth:380, margin:"0 auto",
          }}>
            Tokenize a real-world asset below to create your first on-chain position.
            Once verified, it becomes eligible for USDC borrowing via Loopscale.
          </div>
        </div>
      ) : (
        <div style={{
          background:"rgba(255,255,255,0.01)",
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"8px", overflow:"hidden",
        }}>
          {/* Table header */}
          <div style={{
            display:"grid",
            gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",
            padding:"0.5rem 0.875rem",
            borderBottom:"1px solid rgba(255,255,255,0.07)",
            gap:"0.5rem",
          }}>
            {["Asset","Value","ABRA Spent","Borrow","Status"].map(h => (
              <div key={h} style={{
                fontSize:"0.36rem", fontWeight:700,
                color:"rgba(255,255,255,0.2)",
                fontFamily:"'JetBrains Mono',monospace",
                textTransform:"uppercase", letterSpacing:"0.12em",
              }}>{h}</div>
            ))}
          </div>
          {assets.map(a => <AssetRow key={a.id} a={a} />)}
        </div>
      )}

      {/* ── Borrow section — no fake data ───────────────────────────── */}
      <Divider label="Borrow" />

      <div style={{
        padding:"1.25rem",
        background:"rgba(255,255,255,0.01)",
        border:"1px solid rgba(255,255,255,0.06)",
        borderRadius:"8px",
      }}>
        <div style={{ marginBottom:"1rem" }}>
          <div style={{
            fontSize:"0.72rem", fontWeight:800, color:"#f0f0f0",
            marginBottom:"0.3rem",
          }}>Borrow Against Your Assets</div>
          <div style={{
            fontSize:"0.48rem", color:"rgba(255,255,255,0.3)",
            lineHeight:1.7,
          }}>
            Verified tokenized assets are eligible for USDC borrowing via Loopscale
            at a fixed 5.2% APR. Hold your asset in custody, access capital immediately.
            No selling required.
          </div>
        </div>

        {/* Real numbers only if assets exist */}
        {hasAssets && totalBorrowable > 0 && (
          <div style={{
            display:"grid", gridTemplateColumns:"repeat(3,1fr)",
            gap:1, background:"rgba(255,255,255,0.04)",
            borderRadius:"6px", overflow:"hidden", marginBottom:"1rem",
          }}>
            {([
              ["Available",  fmtUsd(totalBorrowable)+" USDC"],
              ["Fixed APR",  "5.2%"],
              ["Settlement", "USDC"],
            ] as [string,string][]).map(([l,v]) => (
              <div key={l} style={{
                padding:"0.625rem 0.75rem",
                background:"rgba(6,8,16,0.98)",
              }}>
                <div style={{
                  fontSize:"0.72rem", fontWeight:900, color:"#14F195",
                  fontFamily:"'JetBrains Mono',monospace", lineHeight:1, marginBottom:3,
                }}>{v}</div>
                <div style={{
                  fontSize:"0.34rem", color:"rgba(255,255,255,0.22)",
                  fontFamily:"'JetBrains Mono',monospace",
                  textTransform:"uppercase", letterSpacing:"0.1em",
                }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => window.open("https://app.loopscale.com","_blank","noopener")}
          style={{
            padding:"0.75rem 1.5rem", borderRadius:"6px",
            border:"1px solid rgba(107,140,255,0.4)",
            cursor:"pointer", fontWeight:700, fontSize:"0.6rem",
            fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em",
            background:"rgba(107,140,255,0.08)", color:"#6b8cff",
            transition:"all 0.15s",
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.background = "rgba(107,140,255,0.15)";
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.background = "rgba(107,140,255,0.08)";
          }}
        >
          Continue in Loopscale App →
        </button>
        <div style={{
          fontSize:"0.38rem", color:"rgba(255,255,255,0.15)",
          marginTop:"0.5rem", fontFamily:"'JetBrains Mono',monospace",
        }}>
          Connect your wallet in the Loopscale app to execute the borrow.
        </div>
      </div>

      {/* ── Tokenize section — IssuanceEngine embedded ──────────────── */}
      <Divider label="Issue New Asset" />

      {!showStudio ? (
        <div style={{
          padding:"1.25rem",
          background:"rgba(255,255,255,0.01)",
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"8px",
        }}>
          <div style={{
            fontSize:"0.72rem", fontWeight:800, color:"#f0f0f0",
            marginBottom:"0.3rem",
          }}>Tokenize a Real-World Asset</div>
          <div style={{
            fontSize:"0.48rem", color:"rgba(255,255,255,0.3)",
            lineHeight:1.7, marginBottom:"1rem",
          }}>
            Submit a physical asset — watches, spirits, metals, art, collectibles —
            to create a verified Token-2022 position on Solana.
            Requires {ABRA_GATE.toLocaleString()} ABRA minimum balance.
          </div>
          <button
            onClick={() => setShowStudio(true)}
            style={{
              padding:"0.65rem 1.25rem", borderRadius:"6px",
              border:"1px solid rgba(200,169,110,0.35)",
              cursor:"pointer", fontWeight:700, fontSize:"0.58rem",
              fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em",
              background:"rgba(200,169,110,0.07)", color:"#C8A96E",
              transition:"all 0.15s",
            }}
          >
            Begin Tokenization →
          </button>
        </div>
      ) : (
        <div style={{
          border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:"8px", overflow:"hidden",
        }}>
          <div style={{
            padding:"0.5rem 1rem",
            borderBottom:"1px solid rgba(255,255,255,0.06)",
            display:"flex", justifyContent:"space-between", alignItems:"center",
          }}>
            <span style={{
              fontSize:"0.38rem", fontWeight:700,
              color:"rgba(255,255,255,0.2)",
              fontFamily:"'JetBrains Mono',monospace",
              textTransform:"uppercase", letterSpacing:"0.15em",
            }}>Tokenization Studio</span>
            <button onClick={() => setShowStudio(false)} style={{
              background:"none", border:"none", cursor:"pointer",
              color:"rgba(255,255,255,0.25)", fontSize:"0.7rem",
              padding:"0 0.25rem",
            }}>×</button>
          </div>
          <div style={{ padding:"0.25rem" }}>
            <IssuanceEngine onSuccess={() => {
              setShowStudio(false);
              window.scrollTo({ top:0, behavior:"smooth" });
            }} />
          </div>
        </div>
      )}
    </div>
  );
}