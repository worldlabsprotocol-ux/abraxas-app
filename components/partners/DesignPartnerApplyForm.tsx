"use client";
// FILE: components/partners/DesignPartnerApplyForm.tsx
// Shared application form — posts to /api/integrations/apply

import { useState } from "react";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

export function DesignPartnerApplyForm({ defaultIntegrationType = "passport_gate" }: {
  defaultIntegrationType?: string;
}) {
  const [form, setForm] = useState({
    company: "",
    contact_name: "",
    email: "",
    website: "",
    use_case: "",
    monthly_volume: "",
    integration_type: defaultIntegrationType,
    public_name_ok: false,
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/integrations/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setSent(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div style={{ padding: "1.15rem", borderRadius: 14, background: `${ACCENT}12`, border: `1px solid ${ACCENT}33` }}>
        <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: ACCENT, marginBottom: "0.35rem" }}>
          Application received
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.65 }}>
          We review design partner applications manually and reply at the email you provided.
          Expect questions about your workflow and what you'd measure in a pilot.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "0.65rem" }}>
      <Field label="Organization" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} required />
      <Field label="Contact name" value={form.contact_name} onChange={v => setForm(f => ({ ...f, contact_name: v }))} />
      <Field label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
      <Field label="Website" value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} />
      <label style={labelStyle}>
        Workflow type
        <select
          value={form.integration_type}
          onChange={e => setForm(f => ({ ...f, integration_type: e.target.value }))}
          style={inputStyle}
        >
          <option value="passport_gate">Guest / customer verification at booking</option>
          <option value="identity_only">Repeat identity checks (staff, members, investors)</option>
          <option value="asset_attestation">Asset or property verification</option>
          <option value="lending_collateral">Lending / compliance gate</option>
        </select>
      </label>
      <label style={labelStyle}>
        What workflow should Abraxas replace or accelerate?
        <textarea
          value={form.use_case}
          onChange={e => setForm(f => ({ ...f, use_case: e.target.value }))}
          rows={4}
          required
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Example: Guests upload IDs to our inbox before every stay. We want sign-up to verified booking in under two minutes without storing documents."
        />
      </label>
      <Field
        label="Approx. verifications per month (optional)"
        value={form.monthly_volume}
        onChange={v => setForm(f => ({ ...f, monthly_volume: v }))}
      />
      <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
        <input
          type="checkbox"
          checked={form.public_name_ok}
          onChange={e => setForm(f => ({ ...f, public_name_ok: e.target.checked }))}
        />
        <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          OK to name us publicly after a successful pilot
        </span>
      </label>
      {err && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: 0 }}>{err}</p>}
      <button type="submit" disabled={busy} style={{
        padding: "0.75rem 1.25rem", borderRadius: 999, border: "none",
        background: busy ? `${ACCENT}66` : ACCENT, color: "#04130C",
        fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800,
        cursor: busy ? "wait" : "pointer",
      }}>
        {busy ? "Submitting…" : "Apply as design partner →"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input type={type} value={value} required={required} onChange={e => onChange(e.target.value)} style={inputStyle} />
    </label>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  fontFamily: FONT,
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "var(--text-muted)",
};

const inputStyle: React.CSSProperties = {
  padding: "0.55rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text-primary)",
  fontFamily: FONT,
  fontSize: "0.85rem",
};
