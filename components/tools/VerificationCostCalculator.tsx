"use client";
// FILE: components/tools/VerificationCostCalculator.tsx

import { useMemo, useState } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function VerificationCostCalculator() {
  const [apps, setApps] = useState(5);
  const [usersPerMonth, setUsers] = useState(500);
  const [idvCost, setIdvCost] = useState(3.5);
  const [engWeeksPerApp, setEngWeeks] = useState(8);

  const result = useMemo(() => {
    const repeatedMonthly = apps * usersPerMonth * idvCost;
    const repeatedAnnual = repeatedMonthly * 12;
    const engCostRepeated = apps * engWeeksPerApp * 12000;
    const reusableMonthly = usersPerMonth * idvCost + apps * 0.15 * usersPerMonth;
    const reusableAnnual = reusableMonthly * 12;
    const engCostReusable = engWeeksPerApp * 12000 + apps * 1.5 * 12000;
    const annualSavings = Math.max(0, repeatedAnnual + engCostRepeated - reusableAnnual - engCostReusable);
    return { repeatedAnnual, reusableAnnual, annualSavings, engCostRepeated, engCostReusable };
  }, [apps, usersPerMonth, idvCost, engWeeksPerApp]);

  return (
    <div style={{
      padding: "1.25rem",
      borderRadius: 16,
      border: "1px solid var(--border-strong)",
      background: "var(--surface-raised)",
    }}>
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
        Rough model: repeated KYC per app vs verify-once + verify API per relying party. Not financial advice — for planning conversations.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
        <Field label="Applications / counterparties" value={apps} min={1} max={50} onChange={setApps} />
        <Field label="Verifications / month" value={usersPerMonth} min={10} max={50000} step={10} onChange={setUsers} />
        <Field label="IDV cost per check ($)" value={idvCost} min={1} max={25} step={0.5} onChange={setIdvCost} />
        <Field label="Eng weeks to build KYC / app" value={engWeeksPerApp} min={2} max={24} onChange={setEngWeeks} />
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "0.5rem",
      }}>
        <Stat label="Repeated KYC (annual est.)" value={`$${Math.round(result.repeatedAnnual).toLocaleString()}`} />
        <Stat label="Reusable model (annual est.)" value={`$${Math.round(result.reusableAnnual).toLocaleString()}`} highlight />
        <Stat label="Est. annual savings" value={`$${Math.round(result.annualSavings).toLocaleString()}`} highlight />
      </div>
      <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginTop: "0.85rem", lineHeight: 1.6 }}>
        Assumes one-time verification per user + lightweight verify API calls per app. Engineering: full KYC stack per app vs one integration + policy.
      </p>
    </div>
  );
}

function Field({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: 6 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
      <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: ACCENT }}>{value}</span>
    </label>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: "0.75rem",
      borderRadius: 12,
      border: highlight ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--border)",
      background: highlight ? "rgba(16,185,129,0.08)" : "var(--surface)",
    }}>
      <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 800, color: highlight ? ACCENT : "var(--text-primary)" }}>{value}</div>
    </div>
  );
}
