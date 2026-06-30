// FILE: components/onboarding/AssetOwnerOnboarding.tsx
// Sophisticated asset intake, collects everything needed for V5 audit.
// Uncontrolled text inputs prevent Android keyboard dismissal on each keystroke.
"use client";

import { useState, useRef }          from "react";
import { userAssetStore }            from "@/lib/vos/userAssetStore";
import type { UserAsset }            from "@/lib/vos/userAssetStore";
import { DocumentUpload }            from "@/components/DocumentUpload";
import type { UploadedFile }         from "@/components/DocumentUpload";

const M     = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S     = "system-ui,-apple-system,sans-serif";
const G     = "#10B981";
const A     = "#F59E0B";
const B     = "#3B82F6";
const R     = "#EF4444";
const BDR   = "#E5E5E0";
const CARD  = "#FFFFFF";
const W     = "#15151A";
const GREEN = "#10B981";
const BLUE  = "#3B82F6";
const BORDER = "#1C2333";

type Step = "type"|"details"|"legal"|"docs"|"summary";

const ASSET_TYPES = [
  { id:"real_estate",       label:"Real Estate",             sub:"Residential or commercial property" },
  { id:"mineral_rights",    label:"Mineral Rights",          sub:"Oil, gas, water, or mining rights" },
  { id:"wyoming_llc",       label:"Wyoming LLC",             sub:"Business entity tokenization" },
  { id:"music_royalties",   label:"Music / Royalties",       sub:"Catalog, publishing, or streaming income" },
  { id:"books_publishing",  label:"Books & Publishing Rights",sub:"Book catalog, royalty streams, publishing deals" },
  { id:"intellectual_prop", label:"Intellectual Property",   sub:"Patents, trademarks, licensing revenue, digital catalogs" },
  { id:"equipment",         label:"Equipment / Machinery",   sub:"Industrial or commercial equipment" },
  { id:"precious_metals",   label:"Precious Metals",         sub:"Gold, silver, platinum vault holdings" },
  { id:"affordable_housing",label:"Affordable Housing",      sub:"Community land trust or Section 8" },
  { id:"other",             label:"Other Asset",             sub:"Describe in details step" },
] as const;

type AssetTypeId = typeof ASSET_TYPES[number]["id"];

const inp: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.75rem", borderRadius: 5,
  border: `1px solid ${BDR}`, background: "rgba(255,255,255,0.03)",
  color: W, fontFamily: S, fontSize: "16px", outline: "none",
  boxSizing: "border-box",
};
const sel: React.CSSProperties = { ...inp };
const lbl: React.CSSProperties = {
  fontFamily: M, fontSize: "0.58rem", fontWeight: 700,
  color:"rgba(21,21,26,0.35)", textTransform: "uppercase",
  letterSpacing: "0.12em", marginBottom: "0.2rem", display: "block",
};

const STEPS: Step[] = ["type","details","legal","docs","summary"];
const STEP_LABELS: Record<Step,string> = {
  type: "Asset Type", details: "Details", legal: "Legal", docs: "Documents", summary: "Summary",
};

export function AssetOwnerOnboarding({
  onEnterTerminal,
}: { onEnterTerminal?: () => void }) {
  const [step,  setStep]  = useState<Step>("type");
  const [T,     setT]     = useState<AssetTypeId | "">("");
  const [form,  setForm]  = useState({
    // Details step
    hasLiens:     "unknown" as "yes"|"no"|"unknown",
    hasAppraisal: "no"      as "yes"|"no"|"in_progress",
    hasCustody:   "no"      as "yes"|"no",
    titleHeld:    "individual" as string,
    currentUse:   "" as string,
    ownershipYears: "" as string,
    hasDisputes:  "no" as "yes"|"no",
    annualIncome: "" as string,
    // Legal step
    lienAmount:   "" as string,
    lienLender:   "" as string,
  });
  const [savedAsset,    setSavedAsset]    = useState<UserAsset | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Uncontrolled refs, prevents Android keyboard dismissal on each keystroke
  const nameRef        = useRef<HTMLInputElement>(null);
  const valueRef       = useRef<HTMLInputElement>(null);
  const addressRef     = useRef<HTMLInputElement>(null);
  const jurisRef       = useRef<HTMLInputElement>(null);
  const descRef        = useRef<HTMLTextAreaElement>(null);
  const emailRef       = useRef<HTMLInputElement>(null);
  const walletRef      = useRef<HTMLInputElement>(null);
  const incomeRef      = useRef<HTMLInputElement>(null);
  const lienAmtRef     = useRef<HTMLInputElement>(null);
  const lienLenderRef  = useRef<HTMLInputElement>(null);

  function captureRefs() {
    return {
      assetName:    nameRef.current?.value       ?? "",
      estimatedValue: valueRef.current?.value    ?? "",
      address:      addressRef.current?.value    ?? "",
      jurisdiction: jurisRef.current?.value      ?? "",
      description:  descRef.current?.value       ?? "",
      email:        emailRef.current?.value      ?? "",
      wallet:       walletRef.current?.value     ?? "",
      annualIncome: incomeRef.current?.value     ?? "",
      lienAmount:   lienAmtRef.current?.value    ?? "",
      lienLender:   lienLenderRef.current?.value ?? "",
    };
  }

  function advance() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }
  function back() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  function submitForReview() {
    if (!T) return;
    const refs = captureRefs();
    const asset = userAssetStore.create({
      assetType:      T,
      estimatedValue: refs.estimatedValue || "Not specified",
      jurisdiction:   refs.jurisdiction   || "Not specified",
      hasLiens:       form.hasLiens,
      hasAppraisal:   form.hasAppraisal,
      hasCustody:     form.hasCustody,
    });
    setSavedAsset(asset);
    // Persist to Supabase + email Pablo (non-blocking)
    fetch("/api/assets/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id:      asset.sessionId,
        local_asset_id:  asset.id,
        asset_type:      T,
        asset_name:      refs.assetName,
        estimated_value: refs.estimatedValue,
        address:         refs.address,
        jurisdiction:    refs.jurisdiction,
        description:     refs.description,
        annual_income:   refs.annualIncome,
        has_liens:       form.hasLiens,
        has_appraisal:   form.hasAppraisal,
        has_custody:     form.hasCustody,
        title_held:      form.titleHeld,
        current_use:     form.currentUse,
        has_disputes:    form.hasDisputes,
        lien_amount:     refs.lienAmount,
        lien_lender:     refs.lienLender,
        contact_email:   refs.email,
        contact_wallet:  refs.wallet,
      }),
    }).catch(() => null);
    setStep("summary");
  }

  const curIdx = STEPS.indexOf(step);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", fontFamily: M, color: W,
                   padding: "1rem" }}>

      {/* Step indicator */}
      {step !== "summary" && (
        <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1.25rem" }}>
          {STEPS.filter(s => s !== "summary").map((s, i) => {
            const done   = i < curIdx;
            const active = s === step;
            return (
              <div key={s} style={{ flex: 1 }}>
                <div style={{ height: 2, borderRadius: 1, marginBottom: 3,
                               background: active ? G : done ? `${G}50` : BDR }}/>
                <div style={{ fontFamily: M, fontSize: "0.5rem", fontWeight: 700,
                               color: active ? G : done ? `${G}70` : "rgba(255,255,255,0.2)",
                               textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {done ? "✓ " : ""}{STEP_LABELS[s]}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TYPE ── */}
      {step === "type" && (
        <div>
          <div style={{ fontFamily: "Georgia,serif",
                         fontSize: "clamp(1rem,2.5vw,1.3rem)",
                         fontWeight: 700, color: W, marginBottom: "0.375rem" }}>
            What are you submitting?
          </div>
          <p style={{ fontFamily: S, fontSize: "0.75rem",
                       color:"rgba(21,21,26,0.4)", lineHeight: 1.65,
                       margin: "0 0 1rem" }}>
            Select the asset class. The verification requirements and
            documentation checklist will be tailored to your selection.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem",
                         marginBottom: "1rem" }}>
            {ASSET_TYPES.map(at => (
              <button key={at.id} onClick={() => setT(at.id)} style={{
                padding: "0.75rem 0.875rem", borderRadius: 5, textAlign: "left",
                cursor: "pointer",
                border: `1px solid ${T === at.id ? G : BDR}`,
                borderLeft: `3px solid ${T === at.id ? G : BDR}`,
                background: T === at.id ? `${G}10` : "rgba(255,255,255,0.02)",
              }}>
                <div style={{ fontFamily: M, fontSize: "0.68rem", fontWeight: 700,
                               color: T === at.id ? G : W, marginBottom: 2 }}>
                  {at.label}
                </div>
                <div style={{ fontFamily: S, fontSize: "0.65rem",
                               color:"rgba(21,21,26,0.35)" }}>{at.sub}</div>
              </button>
            ))}
          </div>
          <button onClick={advance} disabled={!T} style={{
            width: "100%", padding: "0.65rem", borderRadius: 5, border: "none",
            background: T ? G : `${G}40`, color: "#000",
            fontFamily: M, fontSize: "0.78rem", fontWeight: 900, cursor: "pointer",
          }}>CONTINUE →</button>
        </div>
      )}

      {/* ── DETAILS ── */}
      {step === "details" && (
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "clamp(0.95rem,2vw,1.15rem)",
                         fontWeight: 700, color: W, marginBottom: "0.875rem" }}>
            Tell us about the asset.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <div>
              <label style={lbl}>Asset Name / Title *</label>
              <input ref={nameRef} type="text" defaultValue=""
                placeholder={T === "real_estate" ? "e.g. 1234 Main St Property" : T === "wyoming_llc" ? "e.g. Acme Holdings LLC" : "Asset name"}
                style={inp} autoComplete="off"/>
            </div>
            <div>
              <label style={lbl}>Estimated Value (USD) *</label>
              <input ref={valueRef} type="text" defaultValue=""
                placeholder="e.g. 1,200,000" inputMode="decimal"
                style={inp} autoComplete="off"/>
            </div>
            {(T === "real_estate" || T === "mineral_rights" || T === "affordable_housing") && (
              <div>
                <label style={lbl}>Property Address</label>
                <input ref={addressRef} type="text" defaultValue=""
                  placeholder="Street address, city, state" style={inp} autoComplete="off"/>
              </div>
            )}
            <div>
              <label style={lbl}>Jurisdiction / State *</label>
              <input ref={jurisRef} type="text" defaultValue=""
                placeholder="e.g. Wyoming, USA or Georgia, USA"
                style={inp} autoComplete="off"/>
            </div>
            {(T === "real_estate" || T === "equipment" || T === "affordable_housing") && (
              <div>
                <label style={lbl}>Current Use</label>
                <select value={form.currentUse} style={sel}
                  onChange={e => setForm(f => ({...f, currentUse: e.target.value}))}>
                  <option value="">Select use</option>
                  {["Residential rental","Short-term rental (Airbnb)","Commercial lease",
                    "Owner-occupied","Vacant / development","Mixed-use","Industrial"].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            )}
            {(T === "real_estate" || T === "music_royalties" || T === "mineral_rights") && (
              <div>
                <label style={lbl}>Annual Income / NOI (USD)</label>
                <input ref={incomeRef} type="text" defaultValue=""
                  placeholder="e.g. 109,500" inputMode="decimal"
                  style={inp} autoComplete="off"/>
              </div>
            )}
            <div>
              <label style={lbl}>Brief Description</label>
              <textarea ref={descRef} defaultValue="" rows={3}
                placeholder="Key details about this asset, condition, history, any unique features..."
                style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}/>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button onClick={back} style={{
              flex: 1, padding: "0.65rem", borderRadius: 5,
              border: `1px solid ${BDR}`, background: "transparent",
              color:"rgba(21,21,26,0.4)", fontFamily: M,
              fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
            }}>← Back</button>
            <button onClick={advance} style={{
              flex: 2, padding: "0.65rem", borderRadius: 5, border: "none",
              background: G, color: "#000", fontFamily: M,
              fontSize: "0.78rem", fontWeight: 900, cursor: "pointer",
            }}>CONTINUE →</button>
          </div>
        </div>
      )}

      {/* ── LEGAL ── */}
      {step === "legal" && (
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "clamp(0.95rem,2vw,1.15rem)",
                         fontWeight: 700, color: W, marginBottom: "0.875rem" }}>
            Legal & ownership details.
          </div>
          <p style={{ fontFamily: S, fontSize: "0.72rem",
                       color:"rgba(21,21,26,0.4)", lineHeight: 1.65,
                       margin: "0 0 0.875rem" }}>
            This information determines your verification tier and lender eligibility.
            Be as accurate as possible, our team verifies every detail.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <div>
              <label style={lbl}>How is title held?</label>
              <select value={form.titleHeld} style={sel}
                onChange={e => setForm(f => ({...f, titleHeld: e.target.value}))}>
                {["individual","single_member_llc","multi_member_llc",
                  "trust","corporation","partnership","other"].map(v => (
                  <option key={v} value={v}>
                    {v.replace(/_/g," ").replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Any existing liens or encumbrances?</label>
              <select value={form.hasLiens} style={sel}
                onChange={e => setForm(f => ({...f, hasLiens: e.target.value as "yes"|"no"|"unknown"}))}>
                <option value="no">No, clear title</option>
                <option value="yes">Yes, mortgage or lien exists</option>
                <option value="unknown">Unknown / needs title search</option>
              </select>
            </div>
            {form.hasLiens === "yes" && (
              <>
                <div>
                  <label style={lbl}>Approximate lien amount (USD)</label>
                  <input ref={lienAmtRef} type="text" defaultValue=""
                    placeholder="e.g. 450,000" inputMode="decimal" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Lender / lienholder</label>
                  <input ref={lienLenderRef} type="text" defaultValue=""
                    placeholder="Bank or institution name" style={inp} autoComplete="off"/>
                </div>
              </>
            )}
            <div>
              <label style={lbl}>Independent appraisal status</label>
              <select value={form.hasAppraisal} style={sel}
                onChange={e => setForm(f => ({...f, hasAppraisal: e.target.value as "yes"|"no"|"in_progress"}))}>
                <option value="no">No appraisal yet</option>
                <option value="yes">Yes, have a recent appraisal</option>
                <option value="in_progress">In progress</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Custody / control arrangement</label>
              <select value={form.hasCustody} style={sel}
                onChange={e => setForm(f => ({...f, hasCustody: e.target.value as "yes"|"no"}))}>
                <option value="yes">Yes, I have direct custody/control</option>
                <option value="no">No, managed by third party</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Any active legal disputes?</label>
              <select value={form.hasDisputes} style={sel}
                onChange={e => setForm(f => ({...f, hasDisputes: e.target.value as "yes"|"no"}))}>
                <option value="no">No, no pending disputes</option>
                <option value="yes">Yes, disclose in documents step</option>
              </select>
            </div>
            <div style={{ borderTop: `1px solid ${BDR}`, paddingTop: "0.625rem", marginTop: "0.25rem" }}>
              <label style={lbl}>Your contact email</label>
              <input ref={emailRef} type="email" defaultValue=""
                placeholder="For verification follow-up" style={inp} inputMode="email"/>
            </div>
            <div>
              <label style={lbl}>Sui wallet address (for token delivery — or sign in on /passport)</label>
              <input ref={walletRef} type="text" defaultValue=""
                placeholder="Optional, tokens sent here after minting" style={inp} autoComplete="off"/>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button onClick={back} style={{
              flex: 1, padding: "0.65rem", borderRadius: 5,
              border: `1px solid ${BDR}`, background: "transparent",
              color:"rgba(21,21,26,0.4)", fontFamily: M,
              fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
            }}>← Back</button>
            <button onClick={advance} style={{
              flex: 2, padding: "0.65rem", borderRadius: 5, border: "none",
              background: G, color: "#000", fontFamily: M,
              fontSize: "0.78rem", fontWeight: 900, cursor: "pointer",
            }}>CONTINUE →</button>
          </div>
        </div>
      )}

      {/* ── DOCS ── */}
      {step === "docs" && (
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "clamp(0.95rem,2vw,1.15rem)",
                         fontWeight: 700, color: W, marginBottom: "0.375rem" }}>
            Upload supporting documents.
          </div>
          <p style={{ fontFamily: S, fontSize: "0.72rem",
                       color:"rgba(21,21,26,0.4)", lineHeight: 1.65,
                       margin: "0 0 0.875rem" }}>
            Our verification team will review these against public records.
            Documents are encrypted in transit and stored securely.
            Accepted formats: PDF, JPG, PNG, DOC, DOCX, max 10MB each.
          </p>
          {/* Checklist of what to upload based on asset type */}
          <div style={{ padding: "0.75rem 0.875rem", borderRadius: 6, marginBottom: "0.875rem",
                         background: `${A}07`, border: `1px solid ${A}25` }}>
            <div style={{ fontFamily: M, fontSize: "0.58rem", color: A,
                           letterSpacing: "0.1em", textTransform: "uppercase",
                           marginBottom: "0.375rem" }}>
              RECOMMENDED FOR {T?.replace(/_/g," ").toUpperCase()}
            </div>
            <div style={{ fontFamily: S, fontSize: "0.7rem",
                           color:"rgba(21,21,26,0.45)", lineHeight: 1.75 }}>
              {T === "real_estate" && "Deed of trust · Recent appraisal · Title report · Survey · Income statements (if rental)"}
              {T === "mineral_rights" && "Mineral deed · Production records · Lease agreements · County recorder filing"}
              {T === "wyoming_llc" && "Articles of organization · Operating agreement · EIN confirmation · Bank statements"}
              {T === "music_royalties" && "Publishing agreements · PRO registration · MLC registration · ISRC/ISWC codes · Royalty statements"}
              {T === "equipment" && "Purchase receipts · Insurance certificate · Maintenance records · Appraisal"}
              {T === "precious_metals" && "Assay certificate · Vault storage agreement · Insurance policy · Chain of custody"}
                  {T === "books_publishing" && "Publishing agreements · Royalty statements · ISBN list · Distributor statements · Copyright registrations · PRO registration (ASCAP/BMI)"}
                  {T === "intellectual_prop" && "Patent certificates or filing records · Trademark registrations · License agreements · Revenue statements · Ownership chain"}
              {T === "affordable_housing" && "Ground lease · Subsidy agreements · Inspection reports · Income verification"}
              {T === "other" && "Any documents proving ownership, value, and clear title or rights"}
            </div>
          </div>
          <DocumentUpload
            label="Upload your documents"
            onUploaded={f => setUploadedFiles(prev => [...prev, f])}
            maxFiles={12}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button onClick={back} style={{
              flex: 1, padding: "0.65rem", borderRadius: 5,
              border: `1px solid ${BDR}`, background: "transparent",
              color:"rgba(21,21,26,0.4)", fontFamily: M,
              fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
            }}>← Back</button>
            <button onClick={submitForReview} style={{
              flex: 2, padding: "0.65rem", borderRadius: 5, border: "none",
              background: G, color: "#000", fontFamily: M,
              fontSize: "0.78rem", fontWeight: 900, cursor: "pointer",
            }}>SUBMIT FOR REVIEW →</button>
          </div>
        </div>
      )}

      {/* ── SUMMARY ── */}
      {step === "summary" && savedAsset && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: "clamp(1.1rem,3vw,1.5rem)",
                           fontWeight: 700, color: G, marginBottom: "0.375rem" }}>
              Submitted for review.
            </div>
            <div style={{ fontFamily: M, fontSize: "0.62rem",
                           color:"rgba(21,21,26,0.3)" }}>
              Asset ID: {savedAsset.id}
            </div>
          </div>
          <div style={{ padding: "0.875rem", background: CARD,
                         border: `1px solid ${BDR}`, borderRadius: 7,
                         marginBottom: "0.875rem" }}>
            <div style={{ fontFamily: M, fontSize: "0.55rem",
                           color:"rgba(21,21,26,0.25)", textTransform: "uppercase",
                           letterSpacing: "0.12em", marginBottom: "0.5rem" }}>
              WHAT HAPPENS NEXT
            </div>
            <ol style={{ fontFamily: S, fontSize: "0.72rem",
                          color:"rgba(21,21,26,0.5)", lineHeight: 1.8,
                          margin: 0, paddingLeft: "1.125rem" }}>
              <li>Our team reviews your submission (24–48 hours)</li>
              <li>You receive a verification assignment email</li>
              <li>Asset moves through 10-stage V5 pipeline</li>
              <li>Once verified: token minted, lending eligible</li>
              <li>Track progress on the Dashboard tab</li>
            </ol>
          </div>
          {uploadedFiles.length > 0 && (
            <div style={{ fontFamily: M, fontSize: "0.6rem",
                           color: G, marginBottom: "0.875rem" }}>
              ✓ {uploadedFiles.length} document{uploadedFiles.length > 1 ? "s" : ""} attached
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a href="/dashboard" style={{
              flex: 1, display: "block", padding: "0.65rem",
              borderRadius: 5, border: `1px solid ${BDR}`,
              background: "transparent", color:"rgba(21,21,26,0.4)",
              fontFamily: M, fontSize: "0.7rem", fontWeight: 700,
              cursor: "pointer", textDecoration: "none", textAlign: "center",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>VIEW DASHBOARD</a>
            <button onClick={onEnterTerminal} style={{
              flex: 1, padding: "0.65rem", borderRadius: 5, border: "none",
              background: G, color: "#000", fontFamily: M,
              fontSize: "0.7rem", fontWeight: 900, cursor: "pointer",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>OPEN TERMINAL</button>
          </div>
        </div>
      )}
    </div>
  );
}
