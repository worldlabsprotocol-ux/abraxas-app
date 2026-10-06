"use client";
// FILE: components/gtm/GtmDiscoveryForm.tsx
// Four-question problem-first discovery — no PII, keyboard accessible.

import { useEffect, useState } from "react";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  GTM_APP_COUNT_OPTIONS,
  GTM_INDUSTRY_OPTIONS,
  GTM_KYC_VENDOR_OPTIONS,
  GTM_PRIMARY_PAIN_OPTIONS,
  type GtmDiscoveryAnswers,
} from "@/lib/gtm/contract";
import { saveDiscoveryToSessionStorage } from "@/lib/gtm/discovery";
import { discoveryToEventAttributes } from "@/lib/gtm/acquisitionEvents";
import { recordGtmClientEvent } from "@/lib/gtm/clientTelemetry";

const FONT = ABRAXAS_FONT_SANS;

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "0.85rem 1rem",
  margin: 0,
  textAlign: "left",
};

const legendStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  fontWeight: 800,
  color: "var(--text-primary)",
  padding: "0 0.35rem",
};

const optionGrid: React.CSSProperties = {
  display: "grid",
  gap: "0.45rem",
  marginTop: "0.55rem",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.55rem",
  fontFamily: FONT,
  fontSize: "0.82rem",
  lineHeight: 1.5,
  color: "var(--text-secondary)",
  cursor: "pointer",
};

export interface GtmDiscoveryFormProps {
  onComplete: (answers: GtmDiscoveryAnswers) => void;
  initialAnswers?: GtmDiscoveryAnswers | null;
  submitLabel?: string;
}

export function GtmDiscoveryForm({
  onComplete,
  initialAnswers,
  submitLabel = "See relevant proof",
}: GtmDiscoveryFormProps) {
  const [industry, setIndustry] = useState(initialAnswers?.industry ?? "fintech_digital_assets");
  const [appCount, setAppCount] = useState(initialAnswers?.app_count_band ?? "2_3");
  const [hasKyc, setHasKyc] = useState(initialAnswers?.has_kyc_vendor ?? "yes");
  const [pain, setPain] = useState(initialAnswers?.primary_pain ?? "repeat_verification");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    void recordGtmClientEvent("discovery_started");
  }, [started]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const answers: GtmDiscoveryAnswers = {
      industry,
      app_count_band: appCount,
      has_kyc_vendor: hasKyc,
      primary_pain: pain,
      completed_at: new Date().toISOString(),
    };
    saveDiscoveryToSessionStorage(answers);
    void recordGtmClientEvent("discovery_completed", discoveryToEventAttributes(answers));
    onComplete(answers);
  }

  return (
    <form onSubmit={submit} aria-labelledby="gtm-discovery-heading" style={{ display: "grid", gap: "0.85rem" }}>
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>1. What industry are you in?</legend>
        <div style={optionGrid} role="radiogroup" aria-label="Industry">
          {GTM_INDUSTRY_OPTIONS.map((option) => (
            <label key={option.id} style={labelStyle}>
              <input
                type="radio"
                name="industry"
                value={option.id}
                checked={industry === option.id}
                onChange={() => setIndustry(option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>
          2. How many separate applications or workflows verify users before allowing an action?
        </legend>
        <div style={optionGrid} role="radiogroup" aria-label="Application count">
          {GTM_APP_COUNT_OPTIONS.map((option) => (
            <label key={option.id} style={labelStyle}>
              <input
                type="radio"
                name="app_count_band"
                value={option.id}
                checked={appCount === option.id}
                onChange={() => setAppCount(option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>3. Do you already use a KYC / identity verification provider?</legend>
        <div style={optionGrid} role="radiogroup" aria-label="KYC provider">
          {GTM_KYC_VENDOR_OPTIONS.map((option) => (
            <label key={option.id} style={labelStyle}>
              <input
                type="radio"
                name="has_kyc_vendor"
                value={option.id}
                checked={hasKyc === option.id}
                onChange={() => setHasKyc(option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>4. What&apos;s the biggest problem today?</legend>
        <div style={optionGrid} role="radiogroup" aria-label="Primary pain">
          {GTM_PRIMARY_PAIN_OPTIONS.map((option) => (
            <label key={option.id} style={labelStyle}>
              <input
                type="radio"
                name="primary_pain"
                value={option.id}
                checked={pain === option.id}
                onChange={() => setPain(option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          padding: "0.95rem 1.75rem",
          borderRadius: 999,
          border: "none",
          background: "var(--accent)",
          color: "var(--text-on-accent, #0a0c14)",
          fontFamily: FONT,
          fontSize: "0.95rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}
