"use client";
// FILE: components/integrations/DesignPartnerApplicationForm.tsx

import Link from "next/link";
import { useState } from "react";
import { DESIGN_PARTNER_APPLY_HONEYPOT_FIELD } from "@/lib/integrations/designPartnerApplicationIntake";
import {
  PARTNER_POST_APPLY_STEPS,
  PARTNER_RECEIPT_DOCS_ANCHOR,
  PARTNER_RECEIPT_MIRROR_NOTE,
  PARTNER_RECEIPT_VERIFIER_PATH,
} from "@/lib/integrate/partnerJourney";
import { Btn } from "@/components/redesign/ui";
import { DESIGN_PARTNER_CRITERIA } from "@/lib/protocolIntegrations";
import { BulletList } from "@/components/redesign/RedesignContent";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const GENERIC_ERRORS: Record<number, string> = {
  400: "Invalid request",
  429: "Too many requests",
  500: "Could not save application",
  503: "Service temporarily unavailable",
};

export interface DesignPartnerApplicationFormProps {
  applyPath?: string;
}

export function DesignPartnerApplicationForm({
  applyPath = "/api/integrations/apply",
}: DesignPartnerApplicationFormProps) {
  const [form, setForm] = useState({
    company: "",
    contact_name: "",
    email: "",
    website: "",
    use_case: "",
    monthly_volume: "",
    integration_type: "passport_gate",
    public_name_ok: false,
    [DESIGN_PARTNER_APPLY_HONEYPOT_FIELD]: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || sent) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(applyPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(GENERIC_ERRORS[res.status] ?? data.error ?? "Submit failed");
      }
      setSent(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ marginTop: "1rem", padding: "1rem", borderRadius: 12, background: `${ACCENT}12`, border: `1px solid ${ACCENT}33` }}
      >
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: ACCENT }}>Application received</div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.35rem 0 0.75rem", lineHeight: 1.6 }}>
          We review design partner applications manually. If approved, Abraxas operators will assist with
          sandbox provisioning — partner_id, policy_id, allowlisted return_url, and a server-side API key —
          not instant production access or self-serve key issuance.
        </p>
        <ol style={{
          margin: "0 0 0.75rem",
          paddingLeft: "1.15rem",
          fontFamily: FONT,
          fontSize: "0.76rem",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}>
          {PARTNER_POST_APPLY_STEPS.map((step) => (
            <li key={step} style={{ marginBottom: 4 }}>{step}</li>
          ))}
        </ol>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.5rem", lineHeight: 1.55 }}>
          If approved, your Abraxas operator will share the external pilot playbook during secure sandbox handoff.
          For pilot support after handoff, use the operator contact provided with your credentials — not public tickets.
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.75rem", lineHeight: 1.55 }}>
          {PARTNER_RECEIPT_MIRROR_NOTE}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/docs/partner-flow#external-design-partner-sandbox" size="sm">Sandbox pilot guide</Btn>
          <Btn href="/design-partner" variant="secondary" size="sm">Design partner program</Btn>
          <Btn href={PARTNER_RECEIPT_DOCS_ANCHOR} variant="ghost" size="sm">Receipt verification docs</Btn>
          <Btn href={PARTNER_RECEIPT_VERIFIER_PATH} variant="ghost" size="sm">Receipt tester (mirror)</Btn>
        </div>
      </div>
    );
  }

  return (
    <>
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.5rem" }}>
        For age-gated digital commerce teams integrating Partner Flow. We prioritize partners with a clear conversion metric and a defined eligibility gate.
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
        <strong style={{ color: "var(--text-secondary)" }}>What happens next:</strong> manual review (typically within a few business days).
        No self-serve production access or automatic API-key issuance. Sandbox credentials are operator-provisioned after approval.
      </p>
      <BulletList items={[...DESIGN_PARTNER_CRITERIA]} />

      <form
        onSubmit={submit}
        style={{ marginTop: "1rem", display: "grid", gap: "0.65rem" }}
        noValidate={false}
        aria-busy={busy}
      >
        <Field
          label="Company / protocol"
          value={form.company}
          onChange={(v) => setForm((f) => ({ ...f, company: v }))}
          required
          disabled={busy}
          helper="Legal entity or product name we should recognize in review."
        />
        <Field
          label="Contact name"
          value={form.contact_name}
          onChange={(v) => setForm((f) => ({ ...f, contact_name: v }))}
          disabled={busy}
          helper="Primary technical or business contact."
        />
        <Field
          label="Work email"
          type="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          required
          disabled={busy}
          helper="We reply here — use a domain you control."
        />
        <Field
          label="Website"
          value={form.website}
          onChange={(v) => setForm((f) => ({ ...f, website: v }))}
          disabled={busy}
          helper="Product or company URL (optional)."
        />
        <label style={labelStyle}>
          Integration type
          <select
            value={form.integration_type}
            disabled={busy}
            onChange={(e) => setForm((f) => ({ ...f, integration_type: e.target.value }))}
            style={inputStyle}
          >
            <option value="passport_gate">Passport gate at checkout</option>
            <option value="identity_only">Identity verification only</option>
            <option value="asset_attestation">Asset attestation / RWA listing</option>
            <option value="lending_collateral">Lending / collateral verification</option>
          </select>
          <span style={helperStyle}>Closest match — Partner Flow is the default path for age-gated checkout gates.</span>
        </label>
        <label style={labelStyle}>
          Use case
          <textarea
            value={form.use_case}
            disabled={busy}
            onChange={(e) => setForm((f) => ({ ...f, use_case: e.target.value }))}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Describe the eligibility gate (e.g. age-gated retail checkout), expected holder flow, and your callback URL pattern."
          />
          <span style={helperStyle}>Helps us assess fit and sandbox provisioning needs.</span>
        </label>
        <Field
          label="Expected monthly verification volume"
          value={form.monthly_volume}
          onChange={(v) => setForm((f) => ({ ...f, monthly_volume: v }))}
          disabled={busy}
          helper="Rough order of magnitude is fine (e.g. 500 / month)."
        />
        <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={form.public_name_ok}
            disabled={busy}
            onChange={(e) => setForm((f) => ({ ...f, public_name_ok: e.target.checked }))}
          />
          <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            OK to name us publicly after a successful pilot
          </span>
        </label>
        <input
          type="text"
          name={DESIGN_PARTNER_APPLY_HONEYPOT_FIELD}
          value={form[DESIGN_PARTNER_APPLY_HONEYPOT_FIELD]}
          onChange={(e) => setForm((f) => ({ ...f, [DESIGN_PARTNER_APPLY_HONEYPOT_FIELD]: e.target.value }))}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
        {err && (
          <div role="alert" style={{ padding: "0.65rem 0.75rem", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: 0 }}>{err}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: 999,
            border: "none",
            background: busy ? `${ACCENT}66` : ACCENT,
            color: "#000",
            fontFamily: FONT,
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Submitting application…" : "Submit for manual review →"}
        </button>
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          Already approved? Read{" "}
          <Link href={PARTNER_RECEIPT_DOCS_ANCHOR} style={{ color: ACCENT, textDecoration: "none", fontWeight: 600 }}>
            server-side receipt verification
          </Link>
          {" "}docs and use the{" "}
          <Link href={PARTNER_RECEIPT_VERIFIER_PATH} style={{ color: ACCENT, textDecoration: "none", fontWeight: 600 }}>
            receipt tester
          </Link>
          {" "}as a public mirror only.
        </p>
      </form>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  helper,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  helper?: string;
  disabled?: boolean;
}) {
  return (
    <label style={labelStyle}>
      {label}{required ? " *" : ""}
      <input
        type={type}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
      {helper && <span style={helperStyle}>{helper}</span>}
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

const helperStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.68rem",
  fontWeight: 500,
  color: "var(--text-muted)",
  lineHeight: 1.45,
};
