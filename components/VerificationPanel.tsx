// FILE: components/VerificationPanel.tsx
// Institutional verification pipeline display.
// Shows per-stage status, required documents, partner type, and timeline.
// Used in PortfolioTab (per-asset detail) and admin dashboard.
"use client";

import { ASSET_CLASS_REGISTRY } from "@/lib/protocol/assetClasses";
import type { AssetClassName }   from "@/lib/protocol/assetClasses";
import type { VerificationRecord, VerificationStageRecord } from "@/lib/protocol/verificationEngine";

const STAGE_STATUS_COLOR: Record<string,string> = {
  pending:     "rgba(255,255,255,0.18)",
  in_progress: "#FBBF24",
  passed:      "#14F195",
  failed:      "#f26b6b",
  skipped:     "rgba(255,255,255,0.12)",
};

const PARTNER_LABEL: Record<string,string> = {
  TRIBAL_COUNCIL:    "Tribal Council",
  BIA_AUTHORITY:     "BIA Federal Authority",
  STATE_GEOLOGICAL:  "State Geological Survey",
  PETROLEUM_ENGINEER:"Petroleum Engineer",
  TITLE_COMPANY:     "Licensed Title Company",
  COUNTY_RECORDER:   "County Recorder",
  CERTIFIED_APPRAISER:"Certified Appraiser",
  AUCTION_HOUSE:     "Authorized Auction House",
  GRADING_SERVICE:   "Grading Service",
  CUSTODY_VAULT:     "Institutional Vault",
  PROTOCOL_INTERNAL: "Abraxas Protocol",
};

// ── Stage card ────────────────────────────────────────────────────────────────
function StageCard({
  stage, isCurrent, stageNum, totalStages,
}: {
  stage:      VerificationStageRecord;
  isCurrent:  boolean;
  stageNum:   number;
  totalStages:number;
}) {
  const col    = STAGE_STATUS_COLOR[stage.status] ?? "rgba(255,255,255,0.2)";
  const isLast = stageNum === totalStages;

  return (
    <div style={{ display:"flex", gap:"0.75rem", position:"relative" }}>
      {/* Connector line */}
      {!isLast && (
        <div style={{
          position:"absolute", left:10, top:22,
          width:1, bottom:-8,
          background: stage.status==="passed"
            ? "rgba(20,241,149,0.3)"
            : "rgba(255,255,255,0.07)",
        }}/>
      )}

      {/* Stage indicator */}
      <div style={{
        width:20, height:20, borderRadius:"50%", flexShrink:0,
        background: stage.status==="passed" ? "rgba(20,241,149,0.15)"
          : stage.status==="failed"  ? "rgba(242,107,107,0.12)"
          : isCurrent                ? "rgba(251,191,36,0.12)"
          : "rgba(255,255,255,0.04)",
        border:`1px solid ${col}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        marginTop:2,
      }}>
        {stage.status==="passed"
          ? <span style={{ fontSize:"0.44rem", color:"#14F195" }}>✓</span>
          : stage.status==="failed"
          ? <span style={{ fontSize:"0.44rem", color:"#f26b6b" }}>✗</span>
          : <span style={{ fontSize:"0.32rem", fontWeight:700,
              color:"rgba(255,255,255,0.25)",
              fontFamily:"'JetBrains Mono',monospace" }}>
              {String(stageNum).padStart(2,"0")}
            </span>}
      </div>

      {/* Stage content */}
      <div style={{
        flex:1, paddingBottom:"1rem",
        opacity: stage.status==="pending" && !isCurrent ? 0.45 : 1,
        transition:"opacity 0.2s",
      }}>
        <div style={{
          display:"flex", justifyContent:"space-between",
          alignItems:"flex-start", gap:"0.5rem", marginBottom:"0.25rem",
          flexWrap:"wrap",
        }}>
          <div style={{
            fontWeight: isCurrent||stage.status==="passed" ? 700 : 500,
            fontSize:"0.6rem",
            color: stage.status==="passed" ? "#f0f0f0"
              : isCurrent ? "#FBBF24"
              : "rgba(255,255,255,0.5)",
          }}>{stage.stageName}</div>

          <div style={{
            display:"flex", alignItems:"center", gap:4,
            padding:"0.1rem 0.45rem", borderRadius:"3px",
            background:`${col}12`, border:`1px solid ${col}30`,
            flexShrink:0,
          }}>
            <div style={{ width:4, height:4, borderRadius:"50%",
              background:col, flexShrink:0,
              animation: isCurrent ? "pulse 1.5s ease-in-out infinite" : "none",
            }}/>
            <span style={{
              fontSize:"0.3rem", fontWeight:700, color:col,
              fontFamily:"'JetBrains Mono',monospace",
              textTransform:"uppercase", letterSpacing:"0.1em",
            }}>
              {stage.status.replace("_"," ")}
            </span>
          </div>
        </div>

        <div style={{
          fontSize:"0.44rem", color:"rgba(255,255,255,0.3)",
          marginBottom:"0.35rem", lineHeight:1.55,
        }}>{stage.description}</div>

        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
          <div style={{
            fontSize:"0.36rem", color:"rgba(255,255,255,0.2)",
            fontFamily:"'JetBrains Mono',monospace",
            background:"rgba(255,255,255,0.04)",
            padding:"0.15rem 0.4rem", borderRadius:"3px",
          }}>
            {PARTNER_LABEL[stage.partnerType] ?? stage.partnerType}
          </div>
          {stage.partnerName && (
            <div style={{
              fontSize:"0.36rem", color:"rgba(200,169,110,0.5)",
              fontFamily:"'JetBrains Mono',monospace",
              padding:"0.15rem 0.4rem", borderRadius:"3px",
              background:"rgba(200,169,110,0.06)",
            }}>{stage.partnerName}</div>
          )}
        </div>

        {/* Documents required */}
        {(stage.documentsRequired?.length > 0) && (
          <div style={{ marginTop:"0.5rem" }}>
            <div style={{
              fontSize:"0.32rem", fontWeight:700,
              color:"rgba(255,255,255,0.15)",
              fontFamily:"'JetBrains Mono',monospace",
              textTransform:"uppercase", letterSpacing:"0.12em",
              marginBottom:"0.25rem",
            }}>Required Documents</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0.25rem" }}>
              {stage.documentsRequired.map(doc => {
                const received = stage.documentsReceived?.includes(doc);
                return (
                  <span key={doc} style={{
                    fontSize:"0.32rem",
                    color: received ? "#14F195" : "rgba(255,255,255,0.25)",
                    fontFamily:"'JetBrains Mono',monospace",
                    padding:"0.1rem 0.375rem", borderRadius:"3px",
                    background: received
                      ? "rgba(20,241,149,0.07)"
                      : "rgba(255,255,255,0.04)",
                    border:`1px solid ${received
                      ? "rgba(20,241,149,0.2)"
                      : "rgba(255,255,255,0.06)"}`,
                  }}>
                    {received ? "✓ " : "○ "}{doc.replace(/_/g," ")}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Reviewer notes */}
        {stage.notes && (
          <div style={{
            marginTop:"0.5rem", padding:"0.4rem 0.625rem",
            background:"rgba(255,255,255,0.02)",
            border:"1px solid rgba(255,255,255,0.06)",
            borderRadius:"4px",
            fontSize:"0.44rem", color:"rgba(255,255,255,0.4)",
            lineHeight:1.55, fontStyle:"italic",
          }}>
            &ldquo;{stage.notes}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function VerificationPanel({
  record, compact = false,
}: {
  record:   VerificationRecord;
  compact?: boolean;
}) {
  const def       = ASSET_CLASS_REGISTRY[record.assetClass];
  const pct       = Math.round((record.currentStage / record.totalStages) * 100);
  const isTribal  = record.jurisdiction === "LA_TRIBAL" || record.jurisdiction === "OK_TRIBAL";

  const statusColor = record.status === "APPROVED"   ? "#14F195"
    : record.status === "REJECTED"                   ? "#f26b6b"
    : record.status === "SUSPENDED"                  ? "#f26b6b"
    : record.status === "PARTNER_REQUIRED"           ? "#FBBF24"
    : "#C8A96E";

  return (
    <div style={{ fontFamily:"'JetBrains Mono',monospace" }}>

      {/* Header */}
      <div style={{
        padding:"0.875rem 1rem",
        background:"rgba(255,255,255,0.02)",
        border:"1px solid rgba(255,255,255,0.07)",
        borderRadius:"7px", marginBottom:"1rem",
      }}>
        <div style={{
          display:"grid", gridTemplateColumns:"1fr auto",
          gap:"0.5rem", alignItems:"start", marginBottom:"0.75rem",
        }}>
          <div>
            <div style={{
              fontSize:"0.34rem", fontWeight:700,
              color:"rgba(255,255,255,0.2)",
              textTransform:"uppercase", letterSpacing:"0.15em",
              marginBottom:"0.25rem",
            }}>{record.assetClass} Verification</div>
            <div style={{
              display:"flex", alignItems:"center", gap:6,
            }}>
              <div style={{
                width:6, height:6, borderRadius:"50%",
                background:statusColor, flexShrink:0,
                animation: record.status==="PARTNER_REQUIRED"
                  ? "pulse 1.5s ease-in-out infinite" : "none",
              }}/>
              <span style={{
                fontSize:"0.46rem", fontWeight:700, color:statusColor,
                letterSpacing:"0.08em",
              }}>{record.status.replace(/_/g," ")}</span>
            </div>
          </div>

          {/* Confidence score */}
          <div style={{ textAlign:"right" }}>
            <div style={{
              fontSize:"0.28rem", color:"rgba(255,255,255,0.2)",
              textTransform:"uppercase", letterSpacing:"0.12em",
              marginBottom:2,
            }}>Confidence</div>
            <div style={{
              fontSize:"0.78rem", fontWeight:900,
              color: record.confidenceScore >= 80 ? "#14F195"
                : record.confidenceScore >= 50    ? "#FBBF24"
                : "#f26b6b",
            }}>{record.confidenceScore}%</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height:2, background:"rgba(255,255,255,0.07)",
          borderRadius:1, marginBottom:"0.35rem",
        }}>
          <div style={{
            height:"100%", borderRadius:1,
            background:`linear-gradient(90deg,#7c3aed,${statusColor})`,
            width:`${pct}%`, transition:"width 0.5s ease",
          }}/>
        </div>
        <div style={{
          display:"flex", justifyContent:"space-between",
          fontSize:"0.32rem", color:"rgba(255,255,255,0.2)",
        }}>
          <span>Stage {record.currentStage} of {record.totalStages}</span>
          <span>{pct}% complete</span>
        </div>

        {/* Tribal jurisdiction notice */}
        {isTribal && (
          <div style={{
            marginTop:"0.625rem", padding:"0.4rem 0.625rem",
            background:"rgba(200,169,110,0.06)",
            border:"1px solid rgba(200,169,110,0.18)",
            borderRadius:"4px",
            fontSize:"0.38rem", color:"rgba(200,169,110,0.6)",
            lineHeight:1.55,
          }}>
            ⚠ This asset falls under{" "}
            {record.jurisdiction === "LA_TRIBAL" ? "Louisiana" : "Oklahoma"}{" "}
            tribal jurisdiction. BIA approval and tribal council resolution required.
            Timeline extended accordingly.
          </div>
        )}

        {/* Fraud flags */}
        {record.fraudFlags?.length > 0 && (
          <div style={{
            marginTop:"0.5rem", padding:"0.4rem 0.625rem",
            background:"rgba(242,107,107,0.08)",
            border:"1px solid rgba(242,107,107,0.25)",
            borderRadius:"4px",
            fontSize:"0.38rem", color:"#f26b6b",
          }}>
            ⚠ {record.fraudFlags.length} fraud flag{record.fraudFlags.length > 1 ? "s" : ""} detected.
            Manual review required before advancement.
          </div>
        )}
      </div>

      {/* Stages — show condensed if compact */}
      {!compact && (
        <div style={{
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"7px", padding:"1rem",
        }}>
          <div style={{
            fontSize:"0.32rem", fontWeight:700,
            color:"rgba(255,255,255,0.18)",
            textTransform:"uppercase", letterSpacing:"0.18em",
            marginBottom:"1rem",
          }}>Verification Pipeline</div>

          {record.stages.map((stage, i) => (
            <StageCard
              key={stage.stageNumber}
              stage={stage}
              isCurrent={i + 1 === record.currentStage}
              stageNum={i + 1}
              totalStages={record.totalStages}
            />
          ))}
        </div>
      )}

      {/* Regulatory notes */}
      {!compact && def?.regulatoryNotes && (
        <div style={{
          marginTop:"1rem", padding:"0.875rem",
          background:"rgba(255,255,255,0.02)",
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"7px",
        }}>
          <div style={{
            fontSize:"0.32rem", fontWeight:700,
            color:"rgba(255,255,255,0.18)",
            textTransform:"uppercase", letterSpacing:"0.18em",
            marginBottom:"0.4rem",
          }}>Regulatory Notes</div>
          <div style={{
            fontSize:"0.44rem", color:"rgba(255,255,255,0.3)",
            lineHeight:1.7,
          }}>{def.regulatoryNotes}</div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}