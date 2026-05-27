// FILE: components/verification/AssetIntelligence.tsx
// Asset Intelligence Layer — lender confidence, fraud probability,
// liquidity estimate, volatility class, collateral readiness.
// Bloomberg terminal energy. Not marketplace energy.
"use client";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const GREEN="#10B981"; const AMBER="#ED8936"; const BLUE="#3182CE";
const RED="#f26b6b"; const BORDER="#1F2937"; const CARD="#0E1117";

export interface AssetIntelligenceData {
  lenderConfidenceScore:  number;   // 0-100
  fraudProbability:       number;   // 0-100 (lower = better)
  liquidityEstimate:      "HIGH" | "MEDIUM" | "LOW";
  volatilityClass:        "LOW" | "LOW-MEDIUM" | "MEDIUM" | "HIGH";
  collateralReadiness:    "READY" | "PENDING" | "INELIGIBLE";
  financeabilityScore:    number;   // 0-100 — THE CORE METRIC
  dataFreshnessDays:      number;
  lastIntelligenceUpdate: string;
  signals: {
    label:  string;
    value:  string;
    status: "positive" | "neutral" | "warning" | "negative";
  }[];
}

function ScoreRing({ value, size=72, label }: { value:number; size?:number; label:string }) {
  const r = (size/2) - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value/100) * circ;
  const color = value>=80 ? GREEN : value>=60 ? AMBER : RED;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.25rem" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={BORDER} strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition:"stroke-dashoffset 0.8s ease" }}/>
        <text x={size/2} y={size/2+5} textAnchor="middle"
          style={{ fontFamily:M, fontSize:18, fontWeight:900, fill:color }}>
          {value}
        </text>
      </svg>
      <span style={{ fontFamily:M, fontSize:"0.28rem",
                      color:"rgba(255,255,255,0.25)",
                      textTransform:"uppercase", letterSpacing:"0.1em" }}>
        {label}
      </span>
    </div>
  );
}

const STATUS_COLOR = {
  positive: GREEN, neutral:"rgba(255,255,255,0.4)",
  warning: AMBER,  negative: RED,
};
const STATUS_ICON = { positive:"▲", neutral:"—", warning:"⚠", negative:"▼" };

export function AssetIntelligence({ data }: { data: AssetIntelligenceData }) {
  const liqColor = data.liquidityEstimate === "HIGH" ? GREEN : data.liquidityEstimate === "MEDIUM" ? AMBER : RED;
  const volColor = data.volatilityClass.startsWith("LOW") ? GREEN : data.volatilityClass === "MEDIUM" ? AMBER : RED;
  const readyColor = data.collateralReadiness === "READY" ? GREEN : data.collateralReadiness === "PENDING" ? AMBER : RED;
  const freshColor = data.dataFreshnessDays <= 7 ? GREEN : data.dataFreshnessDays <= 30 ? AMBER : RED;

  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:"6px", padding:"1rem" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                     marginBottom:"1.25rem" }}>
        <span style={{ color:AMBER, fontSize:"0.7rem" }}>◎</span>
        <span style={{ fontFamily:M, fontSize:"0.36rem", fontWeight:700,
                        color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                        letterSpacing:"0.2em" }}>
          Asset Intelligence
        </span>
        <div style={{ marginLeft:"auto", fontFamily:M, fontSize:"0.28rem",
                       color:freshColor }}>
          UPDATED {data.dataFreshnessDays}D AGO
        </div>
      </div>

      {/* Core Financeability Statement */}
      <div style={{ padding:"1rem", background:`${GREEN}06`,
                     border:`1px solid ${GREEN}20`, borderRadius:"6px",
                     marginBottom:"1.25rem", textAlign:"center" }}>
        <div style={{ fontFamily:M, fontSize:"0.32rem", fontWeight:700,
                       color:"rgba(16,185,129,0.5)", textTransform:"uppercase",
                       letterSpacing:"0.15em", marginBottom:"0.5rem" }}>
          Financeability Assessment
        </div>
        <div style={{ fontFamily:M,
                       fontSize:"clamp(0.9rem,2.5vw,1.2rem)",
                       fontWeight:900, lineHeight:1.3, color:"#f0f0f0",
                       marginBottom:"0.5rem" }}>
          {data.financeabilityScore >= 80
            ? "This asset is financeable."
            : data.financeabilityScore >= 60
            ? "This asset is conditionally financeable."
            : "This asset requires additional verification."}
        </div>
        <div style={{ fontFamily:M, fontSize:"0.38rem",
                       color:"rgba(255,255,255,0.3)" }}>
          Abraxas verifies whether a real-world asset is financeable.
        </div>
      </div>

      {/* Score rings */}
      <div style={{ display:"flex", justifyContent:"space-around",
                     flexWrap:"wrap", gap:"1rem", marginBottom:"1.25rem" }}>
        <ScoreRing value={data.financeabilityScore}    label="Financeability" size={80}/>
        <ScoreRing value={data.lenderConfidenceScore}  label="Lender Confidence"/>
        <ScoreRing value={100 - data.fraudProbability} label="Fraud Safety" />
      </div>

      {/* Status grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                     gap:"0.5rem", marginBottom:"1rem" }}>
        {[
          { label:"Liquidity",            value:data.liquidityEstimate,    color:liqColor },
          { label:"Volatility Class",     value:data.volatilityClass,      color:volColor },
          { label:"Collateral Readiness", value:data.collateralReadiness,  color:readyColor },
          { label:"Data Freshness",       value:`${data.dataFreshnessDays}D`, color:freshColor },
        ].map(m => (
          <div key={m.label} style={{ padding:"0.625rem",
                                       background:"rgba(255,255,255,0.02)",
                                       border:`1px solid ${BORDER}`, borderRadius:"4px" }}>
            <div style={{ fontFamily:M, fontSize:"0.28rem",
                           color:"rgba(255,255,255,0.2)",
                           textTransform:"uppercase", letterSpacing:"0.1em",
                           marginBottom:"0.2rem" }}>
              {m.label}
            </div>
            <div style={{ fontFamily:M, fontSize:"0.52rem",
                           fontWeight:800, color:m.color }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Intelligence signals */}
      <div style={{ fontFamily:M, fontSize:"0.28rem",
                     color:"rgba(255,255,255,0.2)",
                     textTransform:"uppercase", letterSpacing:"0.1em",
                     marginBottom:"0.5rem" }}>
        Intelligence Signals
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
        {data.signals.map((s, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between",
                                  alignItems:"center", padding:"0.4rem 0.5rem",
                                  background: i%2===0 ? "rgba(255,255,255,0.01)" : "transparent",
                                  borderRadius:"3px" }}>
            <span style={{ fontFamily:M, fontSize:"0.38rem",
                            color:"rgba(255,255,255,0.4)" }}>
              {s.label}
            </span>
            <div style={{ display:"flex", alignItems:"center", gap:"0.25rem" }}>
              <span style={{ fontSize:"0.3rem",
                              color:STATUS_COLOR[s.status] }}>
                {STATUS_ICON[s.status]}
              </span>
              <span style={{ fontFamily:M, fontSize:"0.38rem",
                              fontWeight:700, color:STATUS_COLOR[s.status] }}>
                {s.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
