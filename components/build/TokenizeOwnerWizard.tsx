"use client";
// FILE: components/build/TokenizeOwnerWizard.tsx
// Everyday-owner tokenize intake — three steps, no dev jargon.

import { useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import { userAssetStore } from "@/lib/vos/userAssetStore";
import {
  OWNER_ASSET_OPTIONS,
  tokenizeStepLabel,
  type OwnerAssetTypeId,
  type TokenizeStep,
} from "@/lib/build/ownerTokenizeFlow";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

const FLOW_STEPS: TokenizeStep[] = ["pick", "describe", "submit"];

export function TokenizeOwnerWizard() {
  const auth = useSuiAuthOptional();
  const suiAddress = auth?.suiAddress ?? null;
  const email = auth?.session?.email ?? "";

  const [step, setStep] = useState<TokenizeStep>("pick");
  const [assetType, setAssetType] = useState<OwnerAssetTypeId | "">("");
  const [assetName, setAssetName] = useState("");
  const [location, setLocation] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const stepIndex = FLOW_STEPS.indexOf(step as (typeof FLOW_STEPS)[number]);

  function goNext() {
    if (step === "pick" && assetType) setStep("describe");
    else if (step === "describe") setStep("submit");
  }

  function goBack() {
    if (step === "describe") setStep("pick");
    else if (step === "submit") setStep("describe");
  }

  async function submitIntake() {
    if (!assetType) return;
    setSubmitting(true);
    setError(null);
    try {
      const asset = userAssetStore.create({
        assetType,
        estimatedValue: estimatedValue.trim() || "Not specified",
        jurisdiction: location.trim() || "Not specified",
        hasLiens: "unknown",
        hasAppraisal: "no",
        hasCustody: "yes",
      });

      const description = [
        assetName.trim() && `Name: ${assetName.trim()}`,
        location.trim() && `Location: ${location.trim()}`,
        note.trim() && `Note: ${note.trim()}`,
      ].filter(Boolean).join("\n");

      const res = await fetch("/api/assets/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: asset.sessionId,
          local_asset_id: asset.id,
          asset_type: assetType,
          estimated_value: estimatedValue.trim() || undefined,
          jurisdiction: location.trim() || undefined,
          description: description || undefined,
          contact_email: email.includes("@") ? email : undefined,
          contact_wallet: suiAddress ?? undefined,
          has_custody: "yes",
        }),
      });

      const data = await res.json() as { ok?: boolean; error?: string; asset_id?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not submit — try again in a moment.");
      }

      setSubmittedId(data.asset_id ?? asset.id);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <div style={panelStyle}>
        <div style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800, color: ACCENT, marginBottom: 8 }}>
          We received your asset.
        </div>
        <p style={bodyStyle}>
          Our team will review what you sent and email you within 1–2 business days with next steps.
          No API keys, no wallet setup required beyond sign-in.
        </p>
        {submittedId && (
          <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
            Reference: {submittedId.slice(0, 12)}…
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/passport" size="sm">Verify your identity →</Btn>
          <Btn href="/verify" variant="secondary" size="sm">See verified examples</Btn>
          <Btn href="/" variant="ghost" size="sm">Back home</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
        {FLOW_STEPS.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: i <= stepIndex ? ACCENT : "var(--border)",
            }}
            title={tokenizeStepLabel(s)}
          />
        ))}
      </div>
      <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", margin: "0 0 1rem" }}>
        Step {stepIndex + 1} of 3 · {tokenizeStepLabel(step)}
      </p>

      {step === "pick" && (
        <>
          <h2 style={headingStyle}>What do you want to put on Abraxas?</h2>
          <p style={bodyStyle}>Pick the closest match. You can add details on the next screen.</p>
          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {OWNER_ASSET_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAssetType(opt.id)}
                style={{
                  textAlign: "left",
                  padding: "0.85rem 1rem",
                  borderRadius: 12,
                  cursor: "pointer",
                  border: `1px solid ${assetType === opt.id ? `${ACCENT}66` : "var(--border-strong)"}`,
                  background: assetType === opt.id ? "rgba(16,185,129,0.08)" : "var(--surface-inset)",
                }}
              >
                <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {opt.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                  {opt.sub}
                </div>
              </button>
            ))}
          </div>
          <Btn fullWidth size="lg" disabled={!assetType} onClick={goNext}>
            Continue →
          </Btn>
        </>
      )}

      {step === "describe" && (
        <>
          <h2 style={headingStyle}>Tell us a little about it</h2>
          <p style={bodyStyle}>Plain language is fine. We only ask for what we need to start.</p>
          <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <label style={labelStyle}>
              What should we call it?
              <input
                type="text"
                value={assetName}
                onChange={e => setAssetName(e.target.value)}
                placeholder="e.g. Family rental on Oak Street"
                style={inputStyle}
                autoComplete="off"
              />
            </label>
            <label style={labelStyle}>
              Where is it?
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City, state or country"
                style={inputStyle}
                autoComplete="address-level1"
              />
            </label>
            <label style={labelStyle}>
              Rough value <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>(optional)</span>
              <input
                type="text"
                inputMode="decimal"
                value={estimatedValue}
                onChange={e => setEstimatedValue(e.target.value)}
                placeholder="e.g. $500,000"
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Anything else we should know? <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>(optional)</span>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Short note — tenants, income, timeline, etc."
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Btn variant="ghost" onClick={goBack}>Back</Btn>
            <Btn fullWidth size="lg" disabled={!assetName.trim() || !location.trim()} onClick={goNext}>
              Continue →
            </Btn>
          </div>
        </>
      )}

      {step === "submit" && (
        <>
          <h2 style={headingStyle}>Send it to our team</h2>
          <p style={bodyStyle}>
            We verify the asset, issue a public record when ready, and walk you through tokenization.
            You are not committing to anything today.
          </p>

          <div style={{
            padding: "0.85rem 1rem",
            borderRadius: 12,
            marginBottom: "1rem",
            background: "var(--surface-inset)",
            border: "1px solid var(--border-strong)",
          }}>
            <div style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 8 }}>
              YOUR SUBMISSION
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 700 }}>
              {assetName}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 4 }}>
              {OWNER_ASSET_OPTIONS.find(o => o.id === assetType)?.label} · {location}
              {estimatedValue.trim() ? ` · ${estimatedValue.trim()}` : ""}
            </div>
          </div>

          {suiAddress && email.includes("@") ? (
            <div style={{
              padding: "0.75rem 0.9rem",
              borderRadius: 10,
              marginBottom: "1rem",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.28)",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: ACCENT, marginBottom: 4 }}>
                Signed in
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                {email} · {truncateSuiAddress(suiAddress, 6, 4)}
              </div>
            </div>
          ) : (
            <div style={{
              padding: "0.85rem 1rem",
              borderRadius: 12,
              marginBottom: "1rem",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-inset)",
            }}>
              <p style={{ ...bodyStyle, margin: "0 0 0.65rem" }}>
                Sign in with Google so we can reach you and link your asset to your Passport.
              </p>
              <Btn href="/passport?return=%2Fbuild" size="sm">Sign in →</Btn>
            </div>
          )}

          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 1rem" }}>
            Optional but faster:{" "}
            <Link href="/passport?return=%2Fbuild" style={{ color: ACCENT, fontWeight: 600 }}>
              verify your identity on Passport
            </Link>
            {" "}before we schedule tokenization.
          </p>

          {error && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: "0 0 0.75rem" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Btn variant="ghost" onClick={goBack} disabled={submitting}>Back</Btn>
            <Btn
              fullWidth
              size="lg"
              loading={submitting}
              onClick={() => void submitIntake()}
              disabled={!assetName.trim() || !location.trim()}
            >
              Submit for review →
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  padding: "1.25rem 1.35rem",
  borderRadius: 18,
  background: "var(--surface-raised)",
  border: "1px solid var(--border-strong)",
  boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
};

const headingStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "1.05rem",
  fontWeight: 800,
  color: "var(--text-primary)",
  margin: "0 0 0.5rem",
};

const bodyStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: "0 0 1rem",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontFamily: FONT,
  fontSize: "0.76rem",
  fontWeight: 600,
  color: "var(--text-primary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: FONT,
  fontSize: "0.85rem",
  boxSizing: "border-box",
};
