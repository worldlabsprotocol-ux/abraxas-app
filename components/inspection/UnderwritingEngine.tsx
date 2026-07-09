// FILE: components/inspection/UnderwritingEngine.tsx
// Risk score breakdown. explicit math, not a random number.
// Shows weighted modular inputs + dynamic data-freshness degradation.
"use client";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

interface RiskFactor {
  label:   string;
  points:  number;
  status:  "verified" | "pending" | "degraded" | "negative";
  detail:  string;
  fresh:   boolean;
}

interface Asset {
  id?: string;
  assetClass?: string;
  status?: string;
  collateralScore?: number;
  ltv?: number;
  estimatedUsd?: number;
  createdAt?: string;
}

function getFactors(asset?: Asset): RiskFactor[] {
  const isVerified = ["verified","collateral_eligible","borrowed"].includes(asset?.status ?? "");
  const isPending  = ["pending_verification","pending_custody"].includes(asset?.status ?? "");
  
  // Check data freshness (> 30 days = degraded)
  const ageMs = asset?.createdAt
    ? Date.now() - new Date(asset.createdAt).getTime()
    : 0;
  const ageDays  = Math.floor(ageMs / 86_400_000);
  const isFresh  = ageDays < 30;

  return [
    {
      label:"Custody Method",
      points: isVerified ? 15 : 0,
      status: isVerified ? "verified" : "pending",
      detail: isVerified ? "MPC Secured. Brinks / Certified Vault" : "Custody pending",
      fresh: true,
    },
    {
      label:"Jurisdictional Attestation",
      points: isVerified ? 20 : 0,
      status: isVerified ? "verified" : "pending",
      detail: isVerified ? "AAS-1 Partner Signed" : "Awaiting partner review",
      fresh: true,
    },
    {
      label:"Telemetry Recency",
      points: isFresh ? 10 : 5,
      status: isFresh ? "verified" : "degraded",
      detail: asset?.createdAt
        ? `Last ingest: ${ageDays}d ago${isFresh ? "" : ". STALE"}`
        : "No data ingest",
      fresh: isFresh,
    },
    {
      label:"Asset Provenance Chain",
      points: asset?.id ? 25 : 0,
      status: asset?.id ? "verified" : "pending",
      detail: asset?.id ? "Immutable anchor. SHA256 committed" : "Provenance uncommitted",
      fresh: true,
    },
    {
      label:"Secondary Liquidity",
      points: -5,
      status: "negative",
      detail: "Limited secondary market depth",
      fresh: true,
    },
  ];
}

const STATUS_STYLE: Record<string, { color: string; badge: string }> = {
  verified:  { color:"#10B981", badge:"VERIFIED" },
  pending:   { color:"#ED8936", badge:"PENDING"  },
  degraded:  { color:"#ED8936", badge:"STALE"    },
  negative:  { color:"#f26b6b", badge:"RISK"     },
};

export function UnderwritingEngine({ asset }: { asset?: Asset }) {
  const factors  = getFactors(asset);
  const total    = factors.reduce((s, f) => s + f.points, 0);
  const maxScore = 100;
  const ltv      = asset?.ltv ?? 60;
  const value    = asset?.estimatedUsd ?? 0;
  const borrowCap = Math.round(value * ltv / 100);

  const scoreColor = total >= 80 ? "#10B981" : total >= 60 ? "#ED8936" : "#f26b6b";

  return (
    <div style={{ background:"#0E1117", border:"1px solid #1F2937",
                   borderRadius:"6px", padding:"1rem" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                     marginBottom:"0.875rem" }}>
        <span style={{ color:"#ED8936", fontSize:"0.56rem" }}>◆</span>
        <span style={{ fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                        color:"rgba(255,255,255,0.5)", textTransform:"uppercase",
                        letterSpacing:"0.15em" }}>
          Underwriting Engine
        </span>
      </div>

      {/* Score block */}
      <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem",
                     padding:"0.875rem", background:"rgba(255,255,255,0.02)",
                     border:"1px solid #1F2937", borderRadius:"5px",
                     marginBottom:"0.875rem" }}>
        <span style={{ fontFamily:M, fontSize:"2.4rem", fontWeight:900,
                        color:scoreColor, lineHeight:1 }}>
          {total > 0 ? total : "-"}
        </span>
        <span style={{ fontFamily:M, fontSize:"0.9rem",
                        color:"rgba(255,255,255,0.2)" }}>
          /{maxScore}
        </span>
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
          <div style={{ fontSize:"0.3rem", color:"rgba(255,255,255,0.25)",
                         fontFamily:M, textTransform:"uppercase",
                         letterSpacing:"0.1em" }}>Collateral Health Score</div>
          <div style={{ fontSize:"0.46rem", color:scoreColor, fontFamily:M,
                         fontWeight:700 }}>
            {total >= 80 ? "AAA INSTITUTIONAL" : total >= 60 ? "BBB STANDARD" : "PENDING REVIEW"}
          </div>
        </div>
      </div>

      {/* Breakdown grid */}
      <div style={{ marginBottom:"0.875rem" }}>
        <div style={{
          display:"grid",
          gridTemplateColumns:"1fr auto 80px",
          gap:"0 0.5rem",
          padding:"0.4rem 0",
          borderBottom:"1px solid #1F2937",
          fontSize:"0.28rem", color:"rgba(255,255,255,0.2)",
          fontFamily:M, textTransform:"uppercase", letterSpacing:"0.1em",
        }}>
          <span>METRIC</span>
          <span style={{ textAlign:"right" }}>STATUS</span>
          <span style={{ textAlign:"right" }}>IMPACT</span>
        </div>
        {factors.map((f, i) => {
          const s = STATUS_STYLE[f.status];
          return (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"1fr auto 80px",
              gap:"0 0.5rem", alignItems:"center",
              padding:"0.5rem 0",
              borderBottom:"1px solid rgba(31,41,55,0.5)",
            }}>
              <div>
                <div style={{ fontFamily:M, fontSize:"0.42rem",
                               color: f.fresh ? "rgba(255,255,255,0.65)" : "#ED8936",
                               fontWeight:600 }}>
                  {f.label}
                </div>
                <div style={{ fontFamily:M, fontSize:"0.3rem",
                               color:"rgba(255,255,255,0.2)", marginTop:2 }}>
                  {f.detail}
                </div>
              </div>
              <span style={{
                fontSize:"0.28rem", fontWeight:700, fontFamily:M,
                color:s.color, textAlign:"right", whiteSpace:"nowrap",
              }}>
                {s.badge}
              </span>
              <span style={{
                fontSize:"0.5rem", fontWeight:900, fontFamily:M,
                color: f.points > 0 ? "#10B981" : "#f26b6b",
                textAlign:"right",
              }}>
                {f.points > 0 ? `+${f.points}` : f.points}
              </span>
            </div>
          );
        })}
        <div style={{
          display:"grid", gridTemplateColumns:"1fr auto 80px",
          padding:"0.5rem 0", borderTop:"1px solid #1F2937",
          fontFamily:M,
        }}>
          <span style={{ fontSize:"0.38rem", fontWeight:700,
                          color:"rgba(255,255,255,0.5)", textTransform:"uppercase",
                          letterSpacing:"0.1em" }}>
            TOTAL COLLATERAL HEALTH SCORE
          </span>
          <span/>
          <span style={{ fontSize:"0.7rem", fontWeight:900,
                          color:scoreColor, textAlign:"right" }}>
            {total}/{maxScore}
          </span>
        </div>
      </div>

      {/* Credit header */}
      {value > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                       gap:"0.4rem" }}>
          {[
            { label:"Collateral Value",     value:`$${value.toLocaleString()}` },
            { label:"LTV Ratio",            value:`${ltv}%` },
            { label:"Max Borrow Capacity",  value:`$${borrowCap.toLocaleString()} USDC` },
            { label:"Liquidation Buffer",   value:`${100 - ltv}%` },
          ].map(m => (
            <div key={m.label} style={{
              padding:"0.5rem 0.625rem", background:"rgba(255,255,255,0.02)",
              border:"1px solid #1F2937", borderRadius:"4px",
            }}>
              <div style={{ fontSize:"0.28rem", color:"rgba(255,255,255,0.2)",
                             fontFamily:M, textTransform:"uppercase",
                             letterSpacing:"0.1em", marginBottom:2 }}>
                {m.label}
              </div>
              <div style={{ fontSize:"0.56rem", fontWeight:800,
                             color:"#f0f0f0", fontFamily:M }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
