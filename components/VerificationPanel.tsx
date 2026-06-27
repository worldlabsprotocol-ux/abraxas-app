// FILE: components/VerificationPanel.tsx
// Institutional verification pipeline display.
// Shows per-stage status, required documents, partner type, and timeline.
// Used in PortfolioTab (per-asset detail) and admin dashboard.
//
// LIGHT MODE PASS (June 2026)
// — Same structure/props/exports as before. Panels are now white cards with
//   a soft shadow instead of near-invisible rgba(255,255,255,0.02) tints,
//   matching the verification/checklist panels in the reference screenshots.
// — STAGE_STATUS_COLOR values are still plain hex (not rgba) on purpose —
//   the file leans on a `${col}NN` string-concat alpha trick everywhere
//   (e.g. `${col}12`), and hex6 + 2 hex chars = a valid hex8 color. Keeping
//   hex here means none of those call sites needed to change.
// — Swapped the progress-bar gradient's hardcoded purple (#7c3aed, unused
//   anywhere else in the brand palette) for the brand gold so it's
//   consistent with AssetCard. Flag if that purple was intentional brand
//   color elsewhere and I'll put it back.
"use client";

import { ASSET_CLASS_REGISTRY } from "@/lib/protocol/assetClasses";
import type { AssetClassName }   from "@/lib/protocol/assetClasses";
import type { VerificationRecord, VerificationStageRecord } from "@/lib/protocol/verificationEngine";

const STAGE_STATUS_COLOR: Record<string,string> = {
  pending:     "#DDE1E8",   // var(--abx-border-default) equivalent
  in_progress: "#D97706",
  passed:      "#1FAE6B",
  failed:      "#E0524F",
  skipped:     "#E7E9EE",   // var(--abx-border-subtle) equivalent
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
  const col    = STAGE_STATUS_COLOR[stage.status] ?? "#DDE1E8";
  const isLast = stageNum === totalStages;

  return (
    <div style={{ display:"flex", gap:"0.75rem", position:"relative" }}>
      {/* Connector line */}
      {!isLast && (
        <div style={{
          position:"absolute", left:10, top:22,
          width:1, bottom:-8,
          background: stage.status==="passed"
            ? "rgba(31,174,107,0.35)"
            : "var(--abx-border-subtle, #E7E9EE)",
        }}/>
      )}

      {/* Stage indicator */}
      <div style={{
        width:20, height:20, borderRadius:"50%", flexShrink:0,
        background: stage.status==="passed" ? "rgba(31,174,107,0.14)"
          : stage.status==="failed"  ? "rgba(224,82,79,0.12)"
          : isCurrent                ? "rgba(217,119,6,0.12)"
          : "var(--abx-bg-surface-alt, #F3F4F7)",
        border:`1px solid ${col}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        marginTop:2,
      }}>
        {stage.status==="passed"
          ? <span style={{ fontSize:"0.44rem", color:"#1FAE6B" }}>✓</span>
          : stage.status==="failed"
          ? <span style={{ fontSize:"0.44rem", color:"#E0524F" }}>✗</span>
          : <span style={{ fontSize:"0.32rem", fontWeight:700,
              color:"var(--abx-text-tertiary, #9AA1AE)",
              fontFamily:"'JetBrains Mono',monospace" }}>
              {String(stageNum).padStart(2,"0")}
            </span>}
      </div>

      {/* Stage content */}
      <div style={{
        flex:1, paddingBottom:"1rem",
        opacity: stage.status==="pending" && !isCurrent ? 0.55 : 1,
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
            color: stage.status==="passed" ? "var(--abx-text-primary, #14171F)"
              : isCurrent ? "#D97706"
              : "var(--abx-text-secondary, #5B6270)",
          }}>{stage.stageName}</div>

          <div style={{
            display:"flex", alignItems:"center", gap:4,
            padding:"0.1rem 0.45rem", borderRadius:"999px",
            background:`${col}1A`, border:`1px solid ${col}40`,
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
          fontSize:"0.44rem", color:"var(--abx-text-secondary, #5B6270)",
          marginBottom:"0.35rem", lineHeight:1.55,
        }}>{stage.description}</div>

        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
          <div style={{
            fontSize:"0.36rem", color:"var(--abx-text-tertiary, #9AA1AE)",
            fontFamily:"'JetBrains Mono',monospace",
            background:"var(--abx-bg-surface-alt, #F3F4F7)",
            padding:"0.15rem 0.4rem", borderRadius:"4px",
          }}>
            {PARTNER_LABEL[stage.partnerType] ?? stage.partnerType}
          </div>
          {stage.partnerName && (
            <div style={{
              fontSize:"0.36rem", color:"#B68A4E",
              fontFamily:"'JetBrains Mono',monospace",
              padding:"0.15rem 0.4rem", borderRadius:"4px",
              background:"rgba(182,138,78,0.08)",
            }}>{stage.partnerName}</div>
          )}
        </div>

        {/* Documents required */}
        {(stage.documentsRequired?.length > 0) && (
          <div style={{ marginTop:"0.5rem" }}>
            <div style={{
              fontSize:"0.32rem", fontWeight:700,
              color:"var(--abx-text-tertiary, #9AA1AE)",
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
                    color: received ? "#1FAE6B" : "var(--abx-text-tertiary, #9AA1AE)",
                    fontFamily:"'JetBrains Mono',monospace",
                    padding:"0.1rem 0.375rem", borderRadius:"4px",
                    background: received
                      ? "rgba(31,174,107,0.08)"
                      : "var(--abx-bg-surface-alt, #F3F4F7)",
                    border:`1px solid ${received
                      ? "rgba(31,174,107,0.25)"
                      : "var(--abx-border-subtle, #E7E9EE)"}`,
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
            background:"var(--abx-bg-surface-alt, #F3F4F7)",
            border:"1px solid var(--abx-border-subtle, #E7E9EE)",
            borderRadius:"6px",
            fontSize:"0.44rem", color:"var(--abx-text-secondary, #5B6270)",
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

  const statusColor = record.status === "APPROVED"   ? "#1FAE6B"
    : record.status === "REJECTED"                   ? "#E0524F"
    : record.status === "SUSPENDED"                  ? "#E0524F"
    : record.status === "PARTNER_REQUIRED"           ? "#D97706"
    : "#B68A4E";

  return (
    <div style={{ fontFamily:"'JetBrains Mono',monospace" }}>

      {/* Header */}
      <div style={{
        padding:"0.875rem 1rem",
        background:"var(--abx-bg-surface, #FFFFFF)",
        border:"1px solid var(--abx-border-subtle, #E7E9EE)",
        borderRadius:"14px", marginBottom:"1rem",
        boxShadow:"var(--abx-shadow-card, 0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06))",
      }}>
        <div style={{
          display:"grid", gridTemplateColumns:"1fr auto",
          gap:"0.5rem", alignItems:"start", marginBottom:"0.75rem",
        }}>
          <div>
            <div style={{
              fontSize:"0.34rem", fontWeight:700,
              color:"var(--abx-text-tertiary, #9AA1AE)",
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
              fontSize:"0.28rem", color:"var(--abx-text-tertiary, #9AA1AE)",
              textTransform:"uppercase", letterSpacing:"0.12em",
              marginBottom:2,
            }}>Confidence</div>
            <div style={{
              fontSize:"0.78rem", fontWeight:900,
              color: record.confidenceScore >= 80 ? "#1FAE6B"
                : record.confidenceScore >= 50    ? "#D97706"
                : "#E0524F",
            }}>{record.confidenceScore}%</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height:3, background:"var(--abx-border-subtle, #E7E9EE)",
          borderRadius:2, marginBottom:"0.35rem",
        }}>
          <div style={{
            height:"100%", borderRadius:2,
            background:`linear-gradient(90deg,#B68A4E,${statusColor})`,
            width:`${pct}%`, transition:"width 0.5s ease",
          }}/>
        </div>
        <div style={{
          display:"flex", justifyContent:"space-between",
          fontSize:"0.32rem", color:"var(--abx-text-tertiary, #9AA1AE)",
        }}>
          <span>Stage {record.currentStage} of {record.totalStages}</span>
          <span>{pct}% complete</span>
        </div>

        {/* Tribal jurisdiction notice */}
        {isTribal && (
          <div style={{
            marginTop:"0.625rem", padding:"0.4rem 0.625rem",
            background:"rgba(182,138,78,0.07)",
            borderLeft:"3px solid #B68A4E",
            border:"1px solid rgba(182,138,78,0.22)",
            borderRadius:"6px",
            fontSize:"0.38rem", color:"#9C7440",
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
            background:"rgba(224,82,79,0.08)",
            borderLeft:"3px solid #E0524F",
            border:"1px solid rgba(224,82,79,0.3)",
            borderRadius:"6px",
            fontSize:"0.38rem", color:"#E0524F",
          }}>
            ⚠ {record.fraudFlags.length} fraud flag{record.fraudFlags.length > 1 ? "s" : ""} detected.
            Manual review required before advancement.
          </div>
        )}
      </div>

      {/* Stages — show condensed if compact */}
      {!compact && (
        <div style={{
          border:"1px solid var(--abx-border-subtle, #E7E9EE)",
          background:"var(--abx-bg-surface, #FFFFFF)",
          borderRadius:"14px", padding:"1rem",
          boxShadow:"var(--abx-shadow-card, 0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06))",
        }}>
          <div style={{
            fontSize:"0.32rem", fontWeight:700,
            color:"var(--abx-text-tertiary, #9AA1AE)",
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
          background:"var(--abx-bg-surface-alt, #F3F4F7)",
          border:"1px solid var(--abx-border-subtle, #E7E9EE)",
          borderRadius:"14px",
        }}>
          <div style={{
            fontSize:"0.32rem", fontWeight:700,
            color:"var(--abx-text-tertiary, #9AA1AE)",
            textTransform:"uppercase", letterSpacing:"0.18em",
            marginBottom:"0.4rem",
          }}>Regulatory Notes</div>
          <div style={{
            fontSize:"0.44rem", color:"var(--abx-text-secondary, #5B6270)",
            lineHeight:1.7,
          }}>{def.regulatoryNotes}</div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
