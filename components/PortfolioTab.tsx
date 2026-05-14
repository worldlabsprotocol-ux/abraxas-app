// FILE: components/PortfolioTab.tsx
"use client";
// Complete Portfolio tab — institutional, billboard-style, zero fake data.
// Sections: Hero · ABRA token · FOMO · Verification pipeline · 
//           Portfolio registry · Pending feed · Studio
"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet }                   from "@solana/wallet-adapter-react";
import { useWalletModal }              from "@solana/wallet-adapter-react-ui";
import { useAbraStore }                from "@/lib/abraxasStore";
import { useAbraBalance, ABRA_GATE }  from "@/lib/hooks/useAbraBalance";
import { IssuanceEngine }             from "@/components/IssuanceEngine";

const ABRA_CA     = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
const RAYDIUM_URL = `https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${ABRA_CA}`;
const JUPITER_URL = `https://jup.ag/swap/SOL-${ABRA_CA}`;
const BAGS_URL    = `https://bags.fm/t/${ABRA_CA}`;

type AbraAsset = ReturnType<typeof useAbraStore.getState>["assets"][0];

const STATUS_MAP: Record<string,{label:string;color:string;pct:number}> = {
  created:              {label:"Submitted",        color:"#C8A96E",pct:20},
  pending_soft:         {label:"Initial Review",   color:"#FBBF24",pct:40},
  pending_standard:     {label:"Custody Check",    color:"#FBBF24",pct:60},
  pending_verification: {label:"Pending",          color:"#FBBF24",pct:35},
  verified:             {label:"Verified",         color:"#14F195",pct:85},
  collateral_eligible:  {label:"Borrow Ready",    color:"#14F195",pct:100},
  borrowed:             {label:"Active Loan",      color:"#6b8cff",pct:100},
  listed:               {label:"Listed",           color:"#14F195",pct:100},
  closed:               {label:"Closed",           color:"rgba(255,255,255,0.2)",pct:0},
};

function fmtUsd(n:number) {
  if(!n) return "—";
  return n>=1_000_000?`$${(n/1e6).toFixed(2)}M`:n>=1000?`$${(n/1000).toFixed(1)}K`:`$${n.toFixed(0)}`;
}
function shortKey(k:string) {
  return k&&k.length>12?`${k.slice(0,6)}…${k.slice(-4)}`:k||"—";
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Rule({label}:{label:string}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"0.875rem",margin:"3rem 0 1.5rem"}}>
      <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.07)"}}/>
      <span style={{
        fontSize:"0.36rem",fontWeight:700,letterSpacing:"0.22em",
        color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",
        textTransform:"uppercase",whiteSpace:"nowrap",
      }}>{label}</span>
      <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.07)"}}/>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({text}:{text:string}) {
  const [copied,setCopied] = useState(false);
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1800);}}
      style={{
        padding:"0.2rem 0.5rem",borderRadius:"4px",border:"1px solid rgba(255,255,255,0.1)",
        background:"rgba(255,255,255,0.04)",color:copied?"#14F195":"rgba(255,255,255,0.35)",
        fontSize:"0.38rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",
        transition:"all 0.2s",whiteSpace:"nowrap",
      }}>
      {copied?"Copied":"Copy"}
    </button>
  );
}

// ── Asset row (registry table) ────────────────────────────────────────────────
function AssetRow({a}:{a:AbraAsset}) {
  const st = STATUS_MAP[a.status] ?? STATUS_MAP["created"];
  const borrow = a.estimatedUsd>0 ? Math.round(a.estimatedUsd*a.ltv/100) : 0;
  return (
    <div style={{
      display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",
      padding:"0.75rem 1rem",gap:"0.5rem",alignItems:"center",
      borderBottom:"1px solid rgba(255,255,255,0.04)",
    }}>
      <div>
        <div style={{fontWeight:700,fontSize:"0.62rem",color:"#f0f0f0",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
        <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.22)",
          fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>
          {a.assetClass} · {shortKey(a.txSignature)}
        </div>
      </div>
      <div style={{fontSize:"0.56rem",fontWeight:700,color:"#f0f0f0",
        fontFamily:"'JetBrains Mono',monospace"}}>
        {a.estimatedUsd>0?fmtUsd(a.estimatedUsd):"—"}
      </div>
      <div style={{fontSize:"0.54rem",color:borrow>0?"#14F195":"rgba(255,255,255,0.2)",
        fontFamily:"'JetBrains Mono',monospace"}}>
        {borrow>0?fmtUsd(borrow):"—"}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <div style={{width:5,height:5,borderRadius:"50%",background:st.color,flexShrink:0}}/>
        <span style={{fontSize:"0.38rem",fontWeight:600,color:st.color,
          fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em"}}>
          {st.label}
        </span>
      </div>
    </div>
  );
}

// ── Pending asset card ────────────────────────────────────────────────────────
function PendingCard({a}:{a:AbraAsset}) {
  const st = STATUS_MAP[a.status] ?? STATUS_MAP["created"];
  return (
    <div style={{
      padding:"0.875rem",border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:"8px",background:"rgba(255,255,255,0.01)",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",marginBottom:"0.625rem",gap:"0.5rem"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:"0.62rem",color:"#f0f0f0",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
          <div style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.25)",
            fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{a.assetClass}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0,
          padding:"0.18rem 0.5rem",borderRadius:"4px",
          background:`${st.color}10`,border:`1px solid ${st.color}30`}}>
          <div style={{width:4,height:4,borderRadius:"50%",background:st.color,
            animation:st.pct<100?"pulse 1.5s ease-in-out infinite":"none"}}/>
          <span style={{fontSize:"0.36rem",fontWeight:700,color:st.color,
            fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
            letterSpacing:"0.06em"}}>{st.label}</span>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{height:"2px",background:"rgba(255,255,255,0.06)",borderRadius:1}}>
        <div style={{height:"100%",borderRadius:1,background:st.color,
          width:`${st.pct}%`,transition:"width 1s ease"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:"0.35rem"}}>
        <span style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.2)",
          fontFamily:"'JetBrains Mono',monospace"}}>Verification progress</span>
        <span style={{fontSize:"0.34rem",fontWeight:700,color:st.color,
          fontFamily:"'JetBrains Mono',monospace"}}>{st.pct}%</span>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function PortfolioTab() {
  const [mounted,    setMounted]   = useState(false);
  const [showStudio, setShowStudio]= useState(false);
  const studioRef = useRef<HTMLDivElement>(null);

  const { connected, publicKey }      = useWallet();
  const { setVisible }                = useWalletModal();
  const assets                        = useAbraStore(s => s.assets);
  const {
    balance: realBalance,
    loading: balLoading,
    meetsGate,
  } = useAbraBalance();

  useEffect(()=>{ setMounted(true); },[]);
  if(!mounted) return null;

  const hasAssets      = assets.length > 0;
  const pending        = assets.filter(a=>!["verified","collateral_eligible","borrowed","listed","closed"].includes(a.status));
  const verified       = assets.filter(a=>["verified","collateral_eligible","borrowed","listed"].includes(a.status));
  const totalBorrowable= verified.reduce((s,a)=>s+Math.round(a.estimatedUsd*a.ltv/100),0);

  function openStudio() {
    setShowStudio(true);
    setTimeout(()=>studioRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),100);
  }

  return (
    <div style={{maxWidth:860,margin:"0 auto"}}>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — BILLBOARD HERO
      ══════════════════════════════════════════════════════ */}
      <div style={{
        padding:"3rem 0 2rem",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        marginBottom:"0",
      }}>
        {/* Eyebrow */}
        <div style={{
          display:"inline-flex",alignItems:"center",gap:"0.5rem",
          padding:"0.2rem 0.75rem",borderRadius:"4px",
          border:"1px solid rgba(200,169,110,0.25)",
          background:"rgba(200,169,110,0.06)",
          marginBottom:"1.25rem",
        }}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#C8A96E",
            animation:"pulse 2s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.38rem",fontWeight:700,color:"#C8A96E",
            fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
            letterSpacing:"0.18em"}}>Real-World Asset Protocol · Solana</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontWeight:900,fontSize:"clamp(1.8rem,4vw,2.8rem)",color:"#f0f0f0",
          margin:"0 0 0.875rem",letterSpacing:"-0.04em",lineHeight:1.08,
          maxWidth:680,
        }}>
          Every asset you own<br/>
          <span style={{color:"#C8A96E"}}>has untapped capital.</span>
        </h1>

        {/* Subhead */}
        <p style={{
          fontSize:"0.6rem",color:"rgba(255,255,255,0.45)",lineHeight:1.75,
          maxWidth:540,margin:"0 0 2rem",
        }}>
          Abraxas is the verification layer for real-world assets on Solana.
          Tokenize your physical assets — watches, spirits, metals, art, collectibles —
          and unlock immediate access to on-chain capital through Loopscale lending.
          No middlemen. No liquidation without consent. Full transparency.
        </p>

        {/* CTA row */}
        {!connected ? (
          <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center"}}>
            <button onClick={()=>setVisible(true)} style={{
              padding:"0.75rem 1.5rem",borderRadius:"6px",border:"none",
              cursor:"pointer",fontWeight:800,fontSize:"0.64rem",
              fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",
              background:"#7c3aed",color:"#fff",
            }}>Connect Wallet to Begin</button>
            <button onClick={openStudio} style={{
              padding:"0.75rem 1.5rem",borderRadius:"6px",
              border:"1px solid rgba(200,169,110,0.3)",
              cursor:"pointer",fontWeight:700,fontSize:"0.62rem",
              fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",
              background:"rgba(200,169,110,0.07)",color:"#C8A96E",
            }}>Explore Tokenization Studio →</button>
          </div>
        ) : (
          <div style={{
            display:"inline-flex",alignItems:"center",gap:"0.625rem",
            padding:"0.5rem 0.875rem",borderRadius:"6px",
            border:"1px solid rgba(20,241,149,0.2)",
            background:"rgba(20,241,149,0.05)",
          }}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#14F195"}}/>
            <span style={{fontSize:"0.46rem",fontWeight:700,color:"rgba(255,255,255,0.6)",
              fontFamily:"'JetBrains Mono',monospace"}}>
              {publicKey?.toBase58().slice(0,6)}…{publicKey?.toBase58().slice(-4)}
            </span>
            <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.25)",
              fontFamily:"'JetBrains Mono',monospace"}}>Connected · Mainnet</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — ABRA TOKEN INFO
      ══════════════════════════════════════════════════════ */}
      <Rule label="ABRA Token" />

      <div style={{
        display:"grid",gridTemplateColumns:"1fr 1fr",
        gap:"0.75rem",marginBottom:"0.75rem",
      }}>
        {/* Contract address */}
        <div style={{
          padding:"1rem 1.125rem",
          border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:"8px",background:"rgba(255,255,255,0.01)",
          gridColumn:"1 / -1",
        }}>
          <div style={{
            fontSize:"0.36rem",fontWeight:700,color:"rgba(255,255,255,0.2)",
            fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
            letterSpacing:"0.15em",marginBottom:"0.4rem",
          }}>Contract Address · Solana SPL Token</div>
          <div style={{display:"flex",alignItems:"center",gap:"0.625rem",flexWrap:"wrap"}}>
            <span style={{
              fontSize:"0.52rem",color:"rgba(255,255,255,0.6)",
              fontFamily:"'JetBrains Mono',monospace",wordBreak:"break-all",flex:1,
            }}>{ABRA_CA}</span>
            <CopyBtn text={ABRA_CA} />
          </div>
        </div>

        {/* Required to mint */}
        <div style={{
          padding:"1rem 1.125rem",border:"1px solid rgba(200,169,110,0.18)",
          borderRadius:"8px",background:"rgba(200,169,110,0.04)",
        }}>
          <div style={{
            fontSize:"0.36rem",fontWeight:700,color:"rgba(200,169,110,0.5)",
            fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
            letterSpacing:"0.15em",marginBottom:"0.35rem",
          }}>Required to Mint</div>
          <div style={{
            fontSize:"1.1rem",fontWeight:900,color:"#C8A96E",
            fontFamily:"'JetBrains Mono',monospace",lineHeight:1,
            marginBottom:"0.25rem",
          }}>100,000</div>
          <div style={{fontSize:"0.42rem",color:"rgba(200,169,110,0.45)",
            fontFamily:"'JetBrains Mono',monospace"}}>ABRA minimum balance</div>
          {connected && !balLoading && (
            <div style={{
              marginTop:"0.5rem",fontSize:"0.44rem",fontWeight:700,
              color:meetsGate?"#14F195":"#f26b6b",
              fontFamily:"'JetBrains Mono',monospace",
            }}>
              {meetsGate?"✓ Eligible to mint":"✗ Insufficient balance"}
            </div>
          )}
        </div>

        {/* Buy ABRA */}
        <div style={{
          padding:"1rem 1.125rem",border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:"8px",background:"rgba(255,255,255,0.01)",
        }}>
          <div style={{
            fontSize:"0.36rem",fontWeight:700,color:"rgba(255,255,255,0.2)",
            fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
            letterSpacing:"0.15em",marginBottom:"0.625rem",
          }}>Acquire ABRA</div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
            {([
              ["Raydium",  RAYDIUM_URL, "#14F195"],
              ["Jupiter",  JUPITER_URL, "#6b8cff"],
              ["Bags",     BAGS_URL,    "#C8A96E"],
            ] as [string,string,string][]).map(([name,url,col])=>(
              <a key={name} href={url} target="_blank" rel="noopener noreferrer"
                style={{
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"0.35rem 0.5rem",borderRadius:"5px",
                  border:`1px solid ${col}20`,background:`${col}06`,
                  textDecoration:"none",transition:"background 0.15s",
                }}>
                <span style={{fontSize:"0.48rem",fontWeight:700,color:col,
                  fontFamily:"'JetBrains Mono',monospace"}}>{name}</span>
                <span style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.2)",
                  fontFamily:"'JetBrains Mono',monospace"}}>Trade →</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — FOMO / CAPITAL UNLOCK
      ══════════════════════════════════════════════════════ */}
      <Rule label="Why Tokenize Now" />

      <div style={{
        padding:"1.75rem 2rem",
        border:"1px solid rgba(255,255,255,0.07)",
        borderRadius:"8px",background:"rgba(255,255,255,0.01)",
        marginBottom:"0.75rem",
      }}>
        <h2 style={{
          fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",
          margin:"0 0 0.75rem",letterSpacing:"-0.03em",lineHeight:1.1,
        }}>
          Off-chain assets are<br/>
          <span style={{color:"rgba(255,255,255,0.35)"}}>
            invisible to DeFi.
          </span>
        </h2>
        <p style={{
          fontSize:"0.52rem",color:"rgba(255,255,255,0.38)",
          lineHeight:1.75,margin:"0 0 1.75rem",maxWidth:560,
        }}>
          A watch worth $50,000, a case of rare spirits, a graded card collection —
          these assets exist in the real world but generate zero capital on-chain.
          Tokenization changes that. The moment your asset is verified on Abraxas,
          it becomes collateral. It becomes liquid. It becomes part of the global
          financial system on your terms.
        </p>

        {/* 3-step protocol loop */}
        <div style={{
          display:"grid",gridTemplateColumns:"repeat(3,1fr)",
          gap:"1px",background:"rgba(255,255,255,0.06)",
          borderRadius:"8px",overflow:"hidden",
        }}>
          {([
            ["01", "Tokenize",  "Submit your asset. Pay the ABRA mint fee. Token-2022 position created on Solana in minutes.", "#C8A96E"],
            ["02", "Verify",    "Custody partner authenticates ownership and physical condition. Your asset is co-signed on-chain.", "#FBBF24"],
            ["03", "Borrow",    "Verified assets unlock USDC borrowing via Loopscale at 5.2% fixed APR. Capital without selling.", "#14F195"],
          ] as [string,string,string,string][]).map(([n,title,desc,col])=>(
            <div key={n} style={{padding:"1.25rem 1rem",background:"rgba(6,8,16,0.98)"}}>
              <div style={{
                fontSize:"0.36rem",fontWeight:700,color:`${col}50`,
                fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:"0.15em",marginBottom:"0.5rem",
              }}>{n}</div>
              <div style={{
                fontSize:"0.72rem",fontWeight:900,color:col,
                marginBottom:"0.4rem",
              }}>{title}</div>
              <div style={{
                fontSize:"0.46rem",color:"rgba(255,255,255,0.3)",
                lineHeight:1.65,
              }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — VERIFICATION PROCESS
      ══════════════════════════════════════════════════════ */}
      <Rule label="How Verification Works" />

      <div style={{
        border:"1px solid rgba(255,255,255,0.07)",
        borderRadius:"8px",overflow:"hidden",
        marginBottom:"0.75rem",
      }}>
        <div style={{
          padding:"1.25rem 1.25rem 0.75rem",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
        }}>
          <h3 style={{
            fontWeight:900,fontSize:"0.88rem",color:"#f0f0f0",
            margin:"0 0 0.35rem",
          }}>
            The Abraxas Authentication Standard
          </h3>
          <p style={{
            fontSize:"0.48rem",color:"rgba(255,255,255,0.35)",
            lineHeight:1.7,margin:0,maxWidth:620,
          }}>
            The fundamental problem with RWA tokenization since 2020 has been
            unverified claims — anyone could mint an NFT and call it backed by
            a real asset. Abraxas solves this with a structured, multi-party
            verification pipeline that creates a provable, auditable chain of
            custody for every tokenized asset.
          </p>
        </div>

        {([
          {
            n:"01", col:"#C8A96E",
            title:"Asset Submission + Metadata Hash",
            tech:"On-chain metadata anchored via Token-2022 extensions",
            plain:"You upload documentation, images, and provenance records. This data is hashed and permanently recorded on Solana — creating an immutable fingerprint of what you claimed to own at the moment of submission.",
          },
          {
            n:"02", col:"#FBBF24",
            title:"Custody Partner Authentication",
            tech:"Co-signature required from verified custodian (Baxus / Courtyard / LBMA / Metropolis)",
            plain:"A specialized custody partner physically inspects and takes possession of your asset. They verify it matches your submission. Only after this step can the token be upgraded from 'pending' to 'verified'. No custodian sign-off, no token upgrade — period.",
          },
          {
            n:"03", col:"#14F195",
            title:"On-Chain State Transition",
            tech:"Atomic status update: pending_standard → verified → collateral_eligible",
            plain:"The verification event triggers an on-chain state change. The token now carries verified status — anyone can audit this on Solana Explorer. This is what separates a real on-chain asset from a speculative JPEG.",
          },
          {
            n:"04", col:"#6b8cff",
            title:"Borrow Eligibility + Loopscale Integration",
            tech:"LTV assigned per asset class · Loopscale liquidity markets",
            plain:"Once verified, your asset is assigned a loan-to-value ratio based on its class and declared value. Loopscale reads this on-chain status and allows you to borrow USDC instantly. The asset stays in custody. You keep the token. You get the cash.",
          },
          {
            n:"05", col:"#a855f7",
            title:"Transfer Protection",
            tech:"Custody partner co-signature required for any transfer or liquidation",
            plain:"No one can move your underlying physical asset without your wallet signature AND the custody partner's co-signature. A stolen private key cannot unlock physical delivery. This is institutional-grade protection for real-world ownership.",
          },
        ]).map((step,i,arr)=>(
          <div key={step.n} style={{
            display:"grid",gridTemplateColumns:"2rem 1fr",
            gap:"1rem",padding:"1rem 1.25rem",
            borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,0.04)":"none",
            alignItems:"start",
          }}>
            {/* Step number */}
            <div style={{
              fontWeight:900,fontSize:"0.36rem",color:`${step.col}50`,
              fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em",
              paddingTop:"3px",
            }}>{step.n}</div>
            <div>
              <div style={{
                fontWeight:800,fontSize:"0.66rem",color:"#f0f0f0",
                marginBottom:"0.2rem",
              }}>{step.title}</div>
              <div style={{
                fontSize:"0.38rem",fontWeight:600,color:step.col,
                fontFamily:"'JetBrains Mono',monospace",
                marginBottom:"0.35rem",opacity:0.7,
              }}>{step.tech}</div>
              <div style={{
                fontSize:"0.48rem",color:"rgba(255,255,255,0.32)",
                lineHeight:1.7,
              }}>{step.plain}</div>
            </div>
          </div>
        ))}

        {/* Bottom note */}
        <div style={{
          padding:"0.875rem 1.25rem",
          background:"rgba(255,255,255,0.02)",
          borderTop:"1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            fontSize:"0.44rem",color:"rgba(255,255,255,0.25)",
            lineHeight:1.65,fontStyle:"italic",
          }}>
            Every step above is auditable on-chain via Solana Explorer using the
            token's transaction history. Abraxas makes the verification trail public —
            because transparency is the foundation of trust in asset-backed finance.
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 5 — PORTFOLIO REGISTRY (wallet connected)
      ══════════════════════════════════════════════════════ */}
      <Rule label="Your Portfolio" />

      {!connected ? (
        <div style={{
          padding:"2.5rem 2rem",textAlign:"center",
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"8px",background:"rgba(255,255,255,0.01)",
        }}>
          <div style={{
            fontSize:"0.6rem",fontWeight:700,color:"rgba(255,255,255,0.18)",
            marginBottom:"0.4rem",
          }}>Connect wallet to view your positions</div>
          <div style={{
            fontSize:"0.46rem",color:"rgba(255,255,255,0.12)",
            lineHeight:1.65,maxWidth:340,margin:"0 auto 1rem",
          }}>
            Your tokenized asset registry, ABRA balance, and borrow capacity
            will appear here once connected.
          </div>
          <button onClick={()=>setVisible(true)} style={{
            padding:"0.6rem 1.25rem",borderRadius:"6px",border:"none",
            cursor:"pointer",fontWeight:700,fontSize:"0.58rem",
            fontFamily:"'JetBrains Mono',monospace",
            background:"#7c3aed",color:"#fff",
          }}>Connect Wallet</button>
        </div>
      ) : !hasAssets ? (
        <div style={{
          padding:"2.5rem 2rem",textAlign:"center",
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"8px",background:"rgba(255,255,255,0.01)",
        }}>
          <div style={{
            fontSize:"0.6rem",fontWeight:700,color:"rgba(255,255,255,0.18)",
            marginBottom:"0.4rem",
          }}>No assets tokenized yet</div>
          <div style={{
            fontSize:"0.46rem",color:"rgba(255,255,255,0.12)",
            lineHeight:1.65,maxWidth:360,margin:"0 auto 1rem",
          }}>
            Use the tokenization studio below to issue your first on-chain position.
            Once verified, it will appear here with its borrow capacity and status.
          </div>
          <button onClick={openStudio} style={{
            padding:"0.6rem 1.25rem",borderRadius:"6px",
            border:"1px solid rgba(200,169,110,0.3)",
            cursor:"pointer",fontWeight:700,fontSize:"0.58rem",
            fontFamily:"'JetBrains Mono',monospace",
            background:"rgba(200,169,110,0.07)",color:"#C8A96E",
          }}>Begin Tokenization →</button>
        </div>
      ) : (
        <>
          {/* Metrics — only real computed numbers */}
          {totalBorrowable>0&&(
            <div style={{
              padding:"0.875rem 1rem",
              border:"1px solid rgba(20,241,149,0.15)",
              borderRadius:"8px",background:"rgba(20,241,149,0.04)",
              marginBottom:"0.75rem",
              display:"flex",justifyContent:"space-between",
              alignItems:"center",flexWrap:"wrap",gap:"0.5rem",
            }}>
              <div>
                <div style={{fontSize:"0.36rem",color:"rgba(20,241,149,0.4)",
                  fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
                  letterSpacing:"0.12em",marginBottom:3}}>Borrow Capacity Available</div>
                <div style={{fontSize:"1rem",fontWeight:900,color:"#14F195",
                  fontFamily:"'JetBrains Mono',monospace"}}>{fmtUsd(totalBorrowable)} USDC</div>
              </div>
              <button onClick={()=>window.open("https://app.loopscale.com","_blank","noopener")}
                style={{
                  padding:"0.5rem 1rem",borderRadius:"6px",
                  border:"1px solid rgba(107,140,255,0.35)",
                  cursor:"pointer",fontWeight:700,fontSize:"0.54rem",
                  fontFamily:"'JetBrains Mono',monospace",
                  background:"rgba(107,140,255,0.07)",color:"#6b8cff",
                }}>Borrow via Loopscale →</button>
            </div>
          )}

          {/* Asset table */}
          <div style={{
            border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:"8px",overflow:"hidden",
          }}>
            <div style={{
              display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",
              padding:"0.5rem 1rem",gap:"0.5rem",
              borderBottom:"1px solid rgba(255,255,255,0.07)",
            }}>
              {["Asset","Value","Borrow","Status"].map(h=>(
                <div key={h} style={{
                  fontSize:"0.34rem",fontWeight:700,
                  color:"rgba(255,255,255,0.18)",
                  fontFamily:"'JetBrains Mono',monospace",
                  textTransform:"uppercase",letterSpacing:"0.12em",
                }}>{h}</div>
              ))}
            </div>
            {verified.map(a=><AssetRow key={a.id} a={a}/>)}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 6 — PENDING VERIFICATION FEED
      ══════════════════════════════════════════════════════ */}
      {pending.length>0&&(
        <>
          <Rule label="Pending Verification" />
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,260px),1fr))",
            gap:"0.625rem",
          }}>
            {pending.map(a=><PendingCard key={a.id} a={a}/>)}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          SECTION 7 — TOKENIZATION STUDIO
      ══════════════════════════════════════════════════════ */}
      <Rule label="Tokenization Studio" />

      <div ref={studioRef}>
        {!showStudio?(
          <div style={{
            padding:"2rem",
            border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:"8px",background:"rgba(255,255,255,0.01)",
          }}>
            <div style={{
              display:"grid",gridTemplateColumns:"1fr auto",
              gap:"1.5rem",alignItems:"center",flexWrap:"wrap",
              marginBottom:"1.5rem",
            }}>
              <div>
                <h3 style={{fontWeight:900,fontSize:"0.9rem",color:"#f0f0f0",
                  margin:"0 0 0.35rem"}}>Issue a New On-Chain Position</h3>
                <p style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",
                  lineHeight:1.7,margin:0}}>
                  Submit any physical asset to begin verification.
                  Watches, spirits, metals, art, graded cards, racehorses —
                  if it has provable real-world value, it can be tokenized.
                  Requires {ABRA_GATE.toLocaleString()} ABRA minimum balance.
                </p>
              </div>
              <button onClick={openStudio} style={{
                padding:"0.75rem 1.5rem",borderRadius:"6px",border:"none",
                cursor:"pointer",fontWeight:800,fontSize:"0.62rem",
                fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",
                background:"linear-gradient(135deg,#7c3aed,#C8A96E)",
                color:"#fff",whiteSpace:"nowrap",
              }}>Begin Tokenization →</button>
            </div>

            {/* Asset class grid */}
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,130px),1fr))",
              gap:"0.5rem",
            }}>
              {([
                ["Watches",          "#6b8cff","◎","Courtyard · up to 65% LTV"],
                ["Spirits",          "#FF8C00","◈","Baxus · up to 55% LTV"],
                ["Cards (PSA/BGS)",  "#FBBF24","⬡","Collector Crypt · 55% LTV"],
                ["Comics (CGC)",     "#a855f7","◫","Metropolis · 65% LTV"],
                ["Metals",           "#D4AF37","◆","LBMA · up to 80% LTV"],
                ["Art",              "#f26b6b","◭","Verified Custodian · 50% LTV"],
                ["Racehorses",       "#22c55e","◉","Jockey Club · 55% LTV"],
                ["Other",            "#C8A96E","⬢","Manual Review · 45% LTV"],
              ] as [string,string,string,string][]).map(([name,col,icon,sub])=>(
                <div key={name} onClick={openStudio} style={{
                  padding:"0.75rem 0.875rem",borderRadius:"7px",cursor:"pointer",
                  border:`1px solid ${col}20`,background:`${col}06`,
                  transition:"all 0.15s",
                }}
                onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=`${col}12`;(e.currentTarget as HTMLDivElement).style.borderColor=`${col}40`;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background=`${col}06`;(e.currentTarget as HTMLDivElement).style.borderColor=`${col}20`;}}>
                  <div style={{fontSize:"1rem",color:col,opacity:0.7,
                    marginBottom:"0.25rem",lineHeight:1}}>{icon}</div>
                  <div style={{fontWeight:800,fontSize:"0.54rem",color:"#f0f0f0",
                    marginBottom:"2px"}}>{name}</div>
                  <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.2)",
                    fontFamily:"'JetBrains Mono',monospace",lineHeight:1.4}}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        ):(
          <div style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",overflow:"hidden"}}>
            <div style={{
              padding:"0.625rem 1rem",
              borderBottom:"1px solid rgba(255,255,255,0.06)",
              display:"flex",justifyContent:"space-between",alignItems:"center",
            }}>
              <span style={{fontSize:"0.38rem",fontWeight:700,
                color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",
                textTransform:"uppercase",letterSpacing:"0.15em"}}>
                Tokenization Studio
              </span>
              <button onClick={()=>setShowStudio(false)} style={{
                background:"none",border:"none",cursor:"pointer",
                color:"rgba(255,255,255,0.25)",fontSize:"0.8rem",padding:"0 0.25rem",
              }}>×</button>
            </div>
            <div style={{padding:"0.5rem"}}>
              <IssuanceEngine onSuccess={()=>{
                setShowStudio(false);
                window.scrollTo({top:0,behavior:"smooth"});
              }}/>
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacer */}
      <div style={{height:"2rem"}}/>
    </div>
  );
}