// FILE: components/BorrowPage.tsx
// Borrow tab — clean Loopscale redirect.
// No fake data. No static numbers. Institutional only.
"use client";

export function BorrowPage() {
  return (
    <div style={{ maxWidth:580, margin:"4rem auto", padding:"0 1rem" }}>
      <div style={{
        fontSize:"0.38rem", color:"rgba(255,255,255,0.2)",
        fontFamily:"'JetBrains Mono',monospace",
        textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:"0.5rem",
      }}>Capital · DeFi Lending</div>
      <h1 style={{
        fontWeight:900, fontSize:"1.5rem", color:"#f0f0f0",
        margin:"0 0 0.75rem", letterSpacing:"-0.03em",
      }}>Borrow Against Your Assets</h1>
      <p style={{
        fontSize:"0.52rem", color:"rgba(255,255,255,0.35)",
        lineHeight:1.75, margin:"0 0 2rem",
      }}>
        Abraxas tokenized assets are eligible for USDC borrowing on Loopscale.
        Connect your wallet on the Loopscale platform to access liquidity
        at a fixed APR — without selling your underlying asset.
        Ownership remains on-chain under your wallet address.
      </p>

      <div style={{
        padding:"1.25rem",
        background:"rgba(255,255,255,0.02)",
        border:"1px solid rgba(255,255,255,0.07)",
        borderRadius:"8px", marginBottom:"1.5rem",
      }}>
        {([
          ["Protocol",    "Loopscale"],
          ["Collateral",  "Abraxas Token-2022 positions"],
          ["Settlement",  "USDC"],
          ["Fixed APR",   "5.2%"],
          ["LTV",         "Asset class dependent (45–80%)"],
          ["Custody",     "Asset held by verified partner during loan"],
        ] as [string,string][]).map(([k,v]) => (
          <div key={k} style={{
            display:"flex", justifyContent:"space-between",
            padding:"0.5rem 0",
            borderBottom:"1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{
              fontSize:"0.44rem", color:"rgba(255,255,255,0.28)",
              fontFamily:"'JetBrains Mono',monospace",
              textTransform:"uppercase", letterSpacing:"0.1em",
            }}>{k}</span>
            <span style={{
              fontSize:"0.46rem", fontWeight:600, color:"rgba(255,255,255,0.65)",
              fontFamily:"'JetBrains Mono',monospace",
            }}>{v}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => window.open("https://app.loopscale.com","_blank","noopener")}
        style={{
          width:"100%", padding:"0.875rem", borderRadius:"7px",
          border:"1px solid rgba(107,140,255,0.4)",
          cursor:"pointer", fontWeight:700, fontSize:"0.66rem",
          fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em",
          background:"rgba(107,140,255,0.08)", color:"#6b8cff",
          marginBottom:"0.625rem", transition:"all 0.15s",
        }}
      >
        Open Loopscale App →
      </button>
      <div style={{
        fontSize:"0.38rem", color:"rgba(255,255,255,0.15)",
        textAlign:"center", fontFamily:"'JetBrains Mono',monospace",
        lineHeight:1.6,
      }}>
        Connect your wallet on Loopscale to authenticate and execute the borrow.
        Your Abraxas tokenized positions are automatically recognized.
      </div>
    </div>
  );
}