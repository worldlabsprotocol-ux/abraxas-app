// FILE: components/onboarding/AssetOwnerOnboarding.tsx
// Door 1 — Asset Owner guided onboarding. No wallet required.
// Institutional, transparent, guided. Not crypto-native.
"use client";
import { useState } from "react";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const BG = "#0C0E12"; const CARD = "#0E1117"; const BORDER = "#1F2937";
const GREEN = "#10B981"; const AMBER = "#ED8936"; const BLUE = "#3182CE";

// ── Step definitions ─────────────────────────────────────────────────
const ASSET_TYPES = [
  { id:"real_estate",    label:"Real Estate",       sub:"Residential, commercial, vacation, land",       icon:"⬛" },
  { id:"minerals",       label:"Mineral Rights",    sub:"Oil, gas, coal, royalty interests",             icon:"◆" },
  { id:"energy",         label:"Energy Reserves",   sub:"Producing wells, reserves, working interests",  icon:"◈" },
  { id:"metals",         label:"Precious Metals",   sub:"Gold, silver, platinum, LBMA-grade bullion",    icon:"◎" },
  { id:"land",           label:"Land & Timber",     sub:"Agricultural, timber, conservation easements",  icon:"◭" },
  { id:"other",          label:"Other Asset",       sub:"Family office assets, structured instruments",  icon:"⬡" },
] as const;
type AssetType = typeof ASSET_TYPES[number]["id"];

const DOCS_REQUIRED: Record<AssetType, string[]> = {
  real_estate:  ["Deed / title document", "Title insurance or commitment", "Appraisal report (< 12 months)", "Property tax certificate", "Lien search report", "Entity formation documents (if LLC)"],
  minerals:     ["Division order", "Lease agreement", "Reserve report (independent engineer)", "Production history (12 months)", "Title opinion", "Operator authorization"],
  energy:       ["Working interest documentation", "Engineering reserve report", "Production & revenue statements (12 months)", "Lease agreement", "Environmental compliance certificate"],
  metals:       ["LBMA-certified assay report", "Chain of custody documentation", "Vault/custodian receipt", "Insurance certificate", "Purchase documentation"],
  land:         ["Deed / survey", "Appraisal or timber valuation", "Environmental assessment", "Title report", "Zoning compliance letter"],
  other:        ["Asset description & valuation", "Legal ownership documentation", "Third-party appraisal or audit", "Custody documentation", "Entity formation documents"],
};

const TIMELINE: Record<AssetType, { stage: string; days: string }[]> = {
  real_estate:  [
    { stage:"Document submission",          days:"Day 1" },
    { stage:"Title & ownership review",     days:"Days 2–5" },
    { stage:"Custodian verification",       days:"Days 5–8" },
    { stage:"Legal attestation",            days:"Days 8–12" },
    { stage:"Auditor sign-off",             days:"Days 12–15" },
    { stage:"On-chain attestation",         days:"Day 15" },
    { stage:"Collateral activation",        days:"Day 16" },
  ],
  minerals:     [
    { stage:"Document submission",          days:"Day 1" },
    { stage:"Title opinion review",         days:"Days 2–6" },
    { stage:"Reserve report verification",  days:"Days 6–12" },
    { stage:"Legal attestation",            days:"Days 12–16" },
    { stage:"Auditor sign-off",             days:"Days 16–20" },
    { stage:"On-chain attestation",         days:"Day 20" },
    { stage:"Collateral activation",        days:"Day 21" },
  ],
  energy:       [
    { stage:"Document submission",          days:"Day 1" },
    { stage:"Engineering review",           days:"Days 2–7" },
    { stage:"Production verification",      days:"Days 7–12" },
    { stage:"Legal attestation",            days:"Days 12–17" },
    { stage:"Auditor sign-off",             days:"Days 17–22" },
    { stage:"On-chain attestation",         days:"Day 22" },
    { stage:"Collateral activation",        days:"Day 23" },
  ],
  metals:       [
    { stage:"Document submission",          days:"Day 1" },
    { stage:"Assay & custody verification", days:"Days 2–4" },
    { stage:"Custodian confirmation",       days:"Days 4–6" },
    { stage:"Insurance verification",       days:"Days 6–8" },
    { stage:"Auditor sign-off",             days:"Days 8–10" },
    { stage:"On-chain attestation",         days:"Day 10" },
    { stage:"Collateral activation",        days:"Day 11" },
  ],
  land:         [
    { stage:"Document submission",          days:"Day 1" },
    { stage:"Title & survey review",        days:"Days 2–6" },
    { stage:"Valuation verification",       days:"Days 6–10" },
    { stage:"Legal attestation",            days:"Days 10–14" },
    { stage:"Auditor sign-off",             days:"Days 14–18" },
    { stage:"On-chain attestation",         days:"Day 18" },
    { stage:"Collateral activation",        days:"Day 19" },
  ],
  other:        [
    { stage:"Document submission",          days:"Day 1" },
    { stage:"Asset classification",         days:"Days 2–5" },
    { stage:"Ownership verification",       days:"Days 5–10" },
    { stage:"Legal attestation",            days:"Days 10–15" },
    { stage:"Auditor sign-off",             days:"Days 15–20" },
    { stage:"On-chain attestation",         days:"Day 20" },
    { stage:"Collateral activation",        days:"Day 21" },
  ],
};

const LTV_GUIDE: Record<AssetType, { ltv: string; note: string }> = {
  real_estate:  { ltv:"Up to 60–70%",   note:"Based on independent appraisal. Clear title required." },
  minerals:     { ltv:"Up to 50–60%",   note:"Based on independent reserve report (P50 or better)." },
  energy:       { ltv:"Up to 50–60%",   note:"Based on proved developed producing reserves." },
  metals:       { ltv:"Up to 75–80%",   note:"LBMA-certified bullion in approved vault. Highest LTV class." },
  land:         { ltv:"Up to 45–55%",   note:"Based on appraisal. Timber and conservation factors apply." },
  other:        { ltv:"Case by case",   note:"Determined by asset class classification and review." },
};

type Step = "type" | "info" | "docs" | "summary";

interface FormData {
  assetType:      AssetType | null;
  estimatedValue: string;
  hasLiens:       string;
  hasAppraisal:   string;
  jurisdiction:   string;
  hasCustody:     string;
}

export function AssetOwnerOnboarding({ onEnterTerminal }: { onEnterTerminal?: () => void }) {
  const [step, setStep] = useState<Step>("type");
  const [form, setForm] = useState<FormData>({
    assetType: null, estimatedValue:"", hasLiens:"unknown",
    hasAppraisal:"no", jurisdiction:"", hasCustody:"no",
  });

  const T = form.assetType;
  const docs     = T ? DOCS_REQUIRED[T]  : [];
  const timeline = T ? TIMELINE[T]       : [];
  const ltv      = T ? LTV_GUIDE[T]      : null;

  function Field({ label, children }: { label:string; children:React.ReactNode }) {
    return (
      <div style={{ marginBottom:"1rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.32rem", fontWeight:700,
                       color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                       letterSpacing:"0.12em", marginBottom:"0.4rem" }}>
          {label}
        </div>
        {children}
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"0.75rem 1rem", borderRadius:"5px",
    border:"1px solid " + BORDER, background:"rgba(255,255,255,0.03)",
    color:"#f0f0f0", fontSize:"16px", fontFamily:S, outline:"none",
    boxSizing:"border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor:"pointer", appearance:"none" as const,
  };

  return (
    <div style={{ maxWidth:640, margin:"0 auto",
                   padding:"clamp(1.5rem,4vw,3rem) clamp(1rem,3vw,1.5rem)" }}>

      {/* Header */}
      <div style={{ marginBottom:"2.5rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.32rem", fontWeight:700,
                       color:"rgba(16,185,129,0.5)", textTransform:"uppercase",
                       letterSpacing:"0.2em", marginBottom:"0.75rem" }}>
          ABRAXAS VERIFICATION PROTOCOL
        </div>
        <h1 style={{ fontFamily:S, fontSize:"clamp(1.4rem,4vw,2.2rem)",
                      fontWeight:800, color:"#f0f0f0", margin:"0 0 0.75rem",
                      lineHeight:1.15, letterSpacing:"-0.02em" }}>
          Bring your asset<br/>into verifiable collateral.
        </h1>
        <p style={{ fontFamily:S, fontSize:"clamp(0.8rem,2vw,1rem)",
                     color:"rgba(255,255,255,0.35)", lineHeight:1.75,
                     margin:0, maxWidth:520 }}>
          Abraxas verifies whether a real-world asset is financeable.
          No wallet required to begin. Learn your requirements,
          timeline, and collateral eligibility in three minutes.
        </p>
      </div>

      {/* Progress */}
      <div style={{ display:"flex", gap:"0.375rem", marginBottom:"2.5rem" }}>
        {([
          { id:"type",    label:"Asset Type"   },
          { id:"info",    label:"Asset Details" },
          { id:"docs",    label:"Requirements"  },
          { id:"summary", label:"Summary"       },
        ] as { id:Step; label:string }[]).map((s, i) => {
          const steps: Step[] = ["type","info","docs","summary"];
          const idx = steps.indexOf(step);
          const sIdx = steps.indexOf(s.id);
          const done = sIdx < idx;
          const active = s.id === step;
          return (
            <div key={s.id} style={{ flex:1 }}>
              <div style={{ height:2, borderRadius:1, marginBottom:"0.3rem",
                             background: active ? GREEN : done ? GREEN + "60" : BORDER }}/>
              <div style={{ fontFamily:M, fontSize:"0.28rem",
                             color: active ? GREEN : done ? GREEN + "80" : "rgba(255,255,255,0.2)",
                             textTransform:"uppercase", letterSpacing:"0.08em" }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Asset Type ──────────────────────────────────────── */}
      {step === "type" && (
        <div>
          <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.5vw,1.3rem)",
                         fontWeight:700, color:"#f0f0f0", marginBottom:"1.25rem" }}>
            What type of asset are you bringing to the protocol?
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.625rem" }}>
            {ASSET_TYPES.map(a => (
              <button key={a.id} onClick={() => {
                setForm(f => ({ ...f, assetType: a.id }));
                setStep("info");
              }} style={{
                padding:"1rem", borderRadius:"6px", border:"1px solid",
                borderColor: form.assetType === a.id ? GREEN : BORDER,
                background: form.assetType === a.id ? GREEN + "10" : CARD,
                cursor:"pointer", textAlign:"left", transition:"all 0.15s",
              }}>
                <div style={{ fontSize:"1rem", marginBottom:"0.35rem" }}>{a.icon}</div>
                <div style={{ fontFamily:S, fontSize:"clamp(0.75rem,2vw,0.9rem)",
                               fontWeight:700, color:"#f0f0f0", marginBottom:"0.2rem" }}>
                  {a.label}
                </div>
                <div style={{ fontFamily:S, fontSize:"clamp(0.6rem,1.5vw,0.72rem)",
                               color:"rgba(255,255,255,0.3)", lineHeight:1.5 }}>
                  {a.sub}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2: Asset Info ──────────────────────────────────────── */}
      {step === "info" && (
        <div>
          <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.5vw,1.3rem)",
                         fontWeight:700, color:"#f0f0f0", marginBottom:"1.5rem" }}>
            Tell us about the asset.
          </div>

          <Field label="Estimated Asset Value (USD)">
            <input type="text" placeholder="e.g. 1,200,000"
              value={form.estimatedValue}
              onChange={e => setForm(f => ({ ...f, estimatedValue:e.target.value }))}
              style={inputStyle}/>
            <div style={{ fontFamily:M, fontSize:"0.28rem",
                           color:"rgba(255,255,255,0.2)", marginTop:"0.3rem" }}>
              Used to estimate collateral capacity. Not binding.
            </div>
          </Field>

          <Field label="Jurisdiction / Location">
            <input type="text" placeholder="e.g. Texas, USA or Georgia, USA"
              value={form.jurisdiction}
              onChange={e => setForm(f => ({ ...f, jurisdiction:e.target.value }))}
              style={inputStyle}/>
          </Field>

          <Field label="Existing liens or encumbrances?">
            <select value={form.hasLiens}
              onChange={e => setForm(f => ({ ...f, hasLiens:e.target.value }))}
              style={selectStyle}>
              <option value="no">No known liens</option>
              <option value="yes">Yes — mortgage, lien, or encumbrance exists</option>
              <option value="unknown">Unsure — title search required</option>
            </select>
          </Field>

          <Field label="Do you have an independent appraisal or reserve report?">
            <select value={form.hasAppraisal}
              onChange={e => setForm(f => ({ ...f, hasAppraisal:e.target.value }))}
              style={selectStyle}>
              <option value="no">No — we can guide you to approved appraisers</option>
              <option value="recent">Yes — within the last 12 months</option>
              <option value="old">Yes — older than 12 months (new report required)</option>
            </select>
          </Field>

          <Field label="Is the asset in a custody arrangement?">
            <select value={form.hasCustody}
              onChange={e => setForm(f => ({ ...f, hasCustody:e.target.value }))}
              style={selectStyle}>
              <option value="no">No — sole ownership or LLC</option>
              <option value="yes">Yes — vault, escrow, or trust structure</option>
              <option value="partial">Partial — some custody documentation exists</option>
            </select>
          </Field>

          <div style={{ display:"flex", gap:"0.625rem", marginTop:"1.5rem" }}>
            <button onClick={() => setStep("type")} style={{
              flex:1, padding:"0.875rem", borderRadius:"5px",
              border:"1px solid " + BORDER, background:"transparent",
              color:"rgba(255,255,255,0.4)", fontFamily:M, fontSize:"0.44rem",
              cursor:"pointer",
            }}>← Back</button>
            <button onClick={() => setStep("docs")} style={{
              flex:2, padding:"0.875rem", borderRadius:"5px", border:"none",
              background: GREEN, color:"#000", fontFamily:M,
              fontSize:"0.52rem", fontWeight:900, cursor:"pointer",
              letterSpacing:"0.04em",
            }}>VIEW REQUIREMENTS →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Requirements ────────────────────────────────────── */}
      {step === "docs" && T && (
        <div>
          <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.5vw,1.3rem)",
                         fontWeight:700, color:"#f0f0f0", marginBottom:"1.5rem" }}>
            Required documentation for verification.
          </div>

          <div style={{ padding:"1rem", background:CARD,
                         border:"1px solid " + BORDER, borderRadius:"6px",
                         marginBottom:"1.25rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                           textTransform:"uppercase", letterSpacing:"0.12em",
                           marginBottom:"0.625rem" }}>
              REQUIRED DOCUMENTS
            </div>
            {docs.map((d, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center",
                                     gap:"0.5rem", padding:"0.4rem 0",
                                     borderBottom: i < docs.length-1 ? "1px solid rgba(31,41,55,0.4)" : "none" }}>
                <span style={{ color:GREEN, flexShrink:0, fontSize:"0.5rem" }}>◉</span>
                <span style={{ fontFamily:S, fontSize:"clamp(0.72rem,1.8vw,0.84rem)",
                                color:"rgba(255,255,255,0.6)" }}>{d}</span>
              </div>
            ))}
          </div>

          {/* LTV guidance */}
          {ltv && (
            <div style={{ padding:"1rem", background:"rgba(16,185,129,0.05)",
                           border:"1px solid rgba(16,185,129,0.2)", borderRadius:"6px",
                           marginBottom:"1.25rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(16,185,129,0.5)",
                             textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"0.4rem" }}>
                COLLATERAL CAPACITY ESTIMATE
              </div>
              <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.5vw,1.3rem)",
                             fontWeight:800, color:GREEN, marginBottom:"0.25rem" }}>
                {ltv.ltv}
              </div>
              <div style={{ fontFamily:S, fontSize:"clamp(0.68rem,1.6vw,0.8rem)",
                             color:"rgba(255,255,255,0.3)" }}>
                {ltv.note}
              </div>
              {form.estimatedValue && (
                <div style={{ marginTop:"0.625rem", fontFamily:M,
                               fontSize:"0.36rem", color:"rgba(255,255,255,0.4)" }}>
                  Estimated value: ${form.estimatedValue}
                  {form.hasLiens === "yes" && (
                    <span style={{ color:AMBER, marginLeft:"0.5rem" }}>
                      · Liens present — net equity review required
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display:"flex", gap:"0.625rem", marginTop:"0.5rem" }}>
            <button onClick={() => setStep("info")} style={{
              flex:1, padding:"0.875rem", borderRadius:"5px",
              border:"1px solid " + BORDER, background:"transparent",
              color:"rgba(255,255,255,0.4)", fontFamily:M, fontSize:"0.44rem",
              cursor:"pointer",
            }}>← Back</button>
            <button onClick={() => setStep("summary")} style={{
              flex:2, padding:"0.875rem", borderRadius:"5px", border:"none",
              background:BLUE, color:"#fff", fontFamily:M,
              fontSize:"0.52rem", fontWeight:900, cursor:"pointer",
              letterSpacing:"0.04em",
            }}>VIEW TIMELINE + NEXT STEPS →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Summary ─────────────────────────────────────────── */}
      {step === "summary" && T && (
        <div>
          <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.5vw,1.3rem)",
                         fontWeight:700, color:"#f0f0f0", marginBottom:"1.5rem" }}>
            Your verification pathway.
          </div>

          {/* Timeline */}
          <div style={{ marginBottom:"1.5rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                           textTransform:"uppercase", letterSpacing:"0.12em",
                           marginBottom:"0.75rem" }}>
              VERIFICATION TIMELINE
            </div>
            <div style={{ position:"relative", paddingLeft:"1.25rem" }}>
              <div style={{ position:"absolute", left:"0.25rem", top:0, bottom:0,
                             width:1, background:"rgba(16,185,129,0.2)" }}/>
              {timeline.map((t, i) => (
                <div key={i} style={{ position:"relative", marginBottom:"0.75rem" }}>
                  <div style={{ position:"absolute", left:"-1.15rem", top:3,
                                 width:8, height:8, borderRadius:"50%",
                                 background: i === 0 ? GREEN : i < 4 ? BLUE : AMBER,
                                 border:"2px solid " + BG }}/>
                  <div style={{ display:"flex", justifyContent:"space-between",
                                 alignItems:"baseline" }}>
                    <span style={{ fontFamily:S, fontSize:"clamp(0.72rem,1.8vw,0.84rem)",
                                    fontWeight: i === 6 ? 700 : 400,
                                    color: i === 6 ? GREEN : "rgba(255,255,255,0.6)" }}>
                      {t.stage}
                    </span>
                    <span style={{ fontFamily:M, fontSize:"0.3rem",
                                    color:"rgba(255,255,255,0.25)", flexShrink:0 }}>
                      {t.days}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What stands behind the collateral */}
          <div style={{ padding:"1rem", background:CARD,
                         border:"1px solid " + BORDER, borderRadius:"6px",
                         marginBottom:"1.25rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                           textTransform:"uppercase", letterSpacing:"0.12em",
                           marginBottom:"0.75rem" }}>
              WHAT STANDS BEHIND THE COLLATERAL
            </div>
            {[
              "The underlying real-world asset — verified ownership",
              "Legal entity or trust structure — jurisdiction-compliant",
              "Independent appraisal or reserve report",
              "Custody relationship — vault or legal escrow",
              "Auditor sign-off on documentation chain",
              "On-chain attestation — anchored to Solana",
              "Insurance coverage where applicable",
            ].map((item, i) => (
              <div key={i} style={{ display:"flex", gap:"0.5rem",
                                     padding:"0.35rem 0",
                                     borderBottom: i < 6 ? "1px solid rgba(31,41,55,0.3)" : "none" }}>
                <span style={{ color:GREEN, flexShrink:0, marginTop:1 }}>✓</span>
                <span style={{ fontFamily:S, fontSize:"clamp(0.68rem,1.6vw,0.8rem)",
                                color:"rgba(255,255,255,0.5)" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap" }}>
            <button onClick={onEnterTerminal} style={{
              flex:2, minWidth:200, padding:"1rem 1.5rem", borderRadius:"5px",
              border:"none", background:GREEN, color:"#000",
              fontFamily:M, fontSize:"0.56rem", fontWeight:900,
              cursor:"pointer", letterSpacing:"0.04em", textTransform:"uppercase",
            }}>
              ENTER COLLATERAL TERMINAL →
            </button>
            <button onClick={() => setStep("type")} style={{
              flex:1, padding:"1rem", borderRadius:"5px",
              border:"1px solid " + BORDER, background:"transparent",
              color:"rgba(255,255,255,0.4)", fontFamily:M, fontSize:"0.44rem",
              cursor:"pointer",
            }}>Start Over</button>
          </div>
          <p style={{ fontFamily:S, fontSize:"clamp(0.6rem,1.4vw,0.72rem)",
                       color:"rgba(255,255,255,0.2)", marginTop:"0.875rem",
                       lineHeight:1.7 }}>
            Wallet connection is required when submitting your asset for verification.
            You can review requirements and eligibility without connecting a wallet.
          </p>
        </div>
      )}
    </div>
  );
}
