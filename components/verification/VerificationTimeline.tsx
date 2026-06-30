// FILE: components/verification/VerificationTimeline.tsx
// Verification lifecycle — Submitted → Minted
// Every asset shows this. The protocol's trust infrastructure made visual.
"use client";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const GREEN = "#10B981"; const AMBER = "#ED8936"; const GRAY = "rgba(255,255,255,0.15)";
const BORDER = "#1F2937";

export type VerificationStage =
  | "submitted" | "ownership_verified" | "custody_confirmed"
  | "revenue_audited" | "risk_scored" | "collateral_eligible" | "certificate_minted";

interface TimelineStep {
  id:     VerificationStage;
  label:  string;
  icon:   string;
  actor?: string;
  date?:  string;
  hash?:  string;
  txLink?:string;
}

const STEPS: TimelineStep[] = [
  { id:"submitted",           label:"Asset Submitted",        icon:"01", actor:"Asset Owner" },
  { id:"ownership_verified",  label:"Ownership Verified",     icon:"02", actor:"Title & Deed Network" },
  { id:"custody_confirmed",   label:"Custody Confirmed",      icon:"03", actor:"Certified Custody Vault" },
  { id:"revenue_audited",     label:"Revenue Audited",        icon:"04", actor:"STR Revenue Verification" },
  { id:"risk_scored",         label:"Risk Scored",            icon:"05", actor:"Abraxas Risk Engine" },
  { id:"collateral_eligible", label:"Collateral Eligible",    icon:"06", actor:"Abraxas Protocol" },
  { id:"certificate_minted",  label:"Certificate Minted",     icon:"07", actor:"Sui Devnet" },
];

interface Props {
  currentStage: VerificationStage;
  completedStages?: Partial<Record<VerificationStage, { date: string; hash?: string; txLink?: string }>>;
  compact?: boolean;
}

const STAGE_ORDER: VerificationStage[] = [
  "submitted","ownership_verified","custody_confirmed",
  "revenue_audited","risk_scored","collateral_eligible","certificate_minted",
];

export function VerificationTimeline({ currentStage, completedStages = {}, compact }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div style={{ padding: compact ? "0" : "1rem",
                   background: compact ? "transparent" : "#0E1117",
                   border: compact ? "none" : `1px solid ${BORDER}`,
                   borderRadius:"6px" }}>
      {!compact && (
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                       marginBottom:"1.25rem" }}>
          <span style={{ color:GREEN, fontSize:"0.7rem" }}>◈</span>
          <span style={{ fontFamily:M, fontSize:"0.36rem", fontWeight:700,
                          color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                          letterSpacing:"0.2em" }}>
            Verification Lifecycle
          </span>
          <div style={{ marginLeft:"auto", padding:"2px 8px", borderRadius:"3px",
                         background:`${GREEN}15`, border:`1px solid ${GREEN}30` }}>
            <span style={{ fontFamily:M, fontSize:"0.28rem", fontWeight:900,
                            color:GREEN, textTransform:"uppercase", letterSpacing:"0.1em" }}>
              {STAGE_ORDER.indexOf(currentStage) + 1}/{STAGE_ORDER.length} COMPLETE
            </span>
          </div>
        </div>
      )}

      <div style={{ position:"relative" }}>
        {/* Connector line */}
        <div style={{ position:"absolute", left: compact ? 10 : 14, top:16,
                       bottom:16, width:1,
                       background:`linear-gradient(180deg, ${GREEN} ${Math.round((currentIdx/(STAGE_ORDER.length-1))*100)}%, ${BORDER} 0%)` }}/>

        {STEPS.map((step, i) => {
          const done    = i <= currentIdx;
          const current = i === currentIdx;
          const info    = completedStages[step.id];
          const dotColor = done ? GREEN : i === currentIdx + 1 ? AMBER : GRAY;

          return (
            <div key={step.id} style={{
              display:"flex", gap: compact ? "0.625rem" : "0.875rem",
              paddingLeft: compact ? 0 : "0.25rem",
              marginBottom: i < STEPS.length - 1 ? (compact ? "0.875rem" : "1.25rem") : 0,
              position:"relative",
            }}>
              {/* Dot */}
              <div style={{
                width: compact ? 20 : 28, height: compact ? 20 : 28,
                borderRadius:"50%", flexShrink:0,
                background: done ? `${GREEN}20` : "rgba(255,255,255,0.03)",
                border:`2px solid ${dotColor}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                zIndex:1,
                boxShadow: current ? `0 0 12px ${GREEN}40` : "none",
              }}>
                {done ? (
                  <span style={{ color:GREEN, fontSize: compact ? "0.5rem" : "0.6rem", lineHeight:1 }}>✓</span>
                ) : (
                  <span style={{ fontFamily:M, fontSize:"0.26rem", color:dotColor, fontWeight:700 }}>
                    {step.icon}
                  </span>
                )}
              </div>

              {/* Content */}
              <div style={{ flex:1, paddingTop:"0.1rem" }}>
                <div style={{ display:"flex", alignItems:"center",
                               gap:"0.5rem", marginBottom:done && info?.date ? "0.2rem" : 0 }}>
                  <span style={{ fontFamily:M,
                                  fontSize: compact ? "0.4rem" : "0.48rem",
                                  fontWeight: done ? 700 : 400,
                                  color: done ? "#f0f0f0" : "rgba(255,255,255,0.25)" }}>
                    {step.label}
                  </span>
                  {current && (
                    <span style={{ padding:"1px 5px", borderRadius:"2px",
                                    background:`${AMBER}15`, border:`1px solid ${AMBER}30`,
                                    fontFamily:M, fontSize:"0.26rem", fontWeight:700,
                                    color:AMBER, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                      ACTIVE
                    </span>
                  )}
                </div>

                {done && !compact && (
                  <div style={{ fontFamily:M, fontSize:"0.32rem",
                                 color:"rgba(255,255,255,0.2)" }}>
                    {step.actor}
                    {info?.date && (
                      <span style={{ marginLeft:"0.5rem", color:"rgba(255,255,255,0.15)" }}>
                        · {info.date}
                      </span>
                    )}
                  </div>
                )}

                {info?.hash && !compact && (
                  <div style={{ marginTop:"0.2rem", display:"flex",
                                 alignItems:"center", gap:"0.35rem" }}>
                    <code style={{ fontFamily:M, fontSize:"0.3rem", color:GREEN }}>
                      {info.hash.slice(0,32)}…
                    </code>
                    {info.txLink && (
                      <a href={info.txLink} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily:M, fontSize:"0.28rem", color:"#3182CE",
                                  textDecoration:"none" }}>
                        EXPLORER →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
