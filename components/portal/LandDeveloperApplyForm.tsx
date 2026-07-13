"use client";
// FILE: components/portal/LandDeveloperApplyForm.tsx
// Land / tribal / mineral owner intake — verify once, track progress, control sharing.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveLocalPortalApplication } from "@/lib/portal/localApplications";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const ASSET_CLASSES = [
  { value: "REAL_ESTATE_LAND", label: "Land parcel / development site" },
  { value: "REAL_ESTATE", label: "Real estate (other)" },
  { value: "MINERAL_RIGHTS", label: "Mineral / subsurface rights" },
  { value: "TRIBAL_LAND", label: "Tribal land & stewardship" },
];

export function LandDeveloperApplyForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    asset_name: "",
    asset_class: "REAL_ESTATE_LAND",
    jurisdiction: "",
    estimated_value: "",
    evidence_scope: "",
    contact_name: "",
    contact_email: "",
    contact_wallet: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/external-assets/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, originator: "external" }),
      });
      const json = await res.json() as {
        error?: string;
        application_id?: string;
        status?: string;
      };
      if (!res.ok || !json.application_id) throw new Error(json.error ?? "Submit failed");

      const createdAt = new Date().toISOString();
      if (json.application_id.startsWith("local-")) {
        saveLocalPortalApplication({
          application_id: json.application_id,
          contact_email: form.contact_email.trim(),
          asset_name: form.asset_name.trim(),
          asset_class: form.asset_class,
          jurisdiction: form.jurisdiction.trim() || undefined,
          evidence_scope: form.evidence_scope.trim() || undefined,
          description: form.description.trim() || undefined,
          status: json.status ?? "pending_review",
          created_at: createdAt,
        });
      }

      const params = new URLSearchParams({
        application_id: json.application_id,
        email: form.contact_email.trim(),
      });
      router.push(`/portal/journey?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={e => void submit(e)} style={{ display: "grid", gap: "0.65rem" }}>
      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 0.35rem",
      }}>
        Submit once. Track every stage here. Partners ask Abraxas for eligibility — you are not re-forwarding
        the same verified package through a chain of command.
      </p>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={labelStyle}>Asset or parcel name *</span>
        <input required value={form.asset_name}
          onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))}
          placeholder="e.g. 240-acre mixed-use parcel, Section 12 Township 4N"
          style={inputStyle} />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span style={labelStyle}>Asset class *</span>
        <select value={form.asset_class}
          onChange={e => setForm(f => ({ ...f, asset_class: e.target.value }))}
          style={inputStyle}>
          {ASSET_CLASSES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </label>

      {[
        { key: "jurisdiction", label: "Jurisdiction", placeholder: "US · Georgia, tribal nation, county APN ref…", required: false },
        { key: "estimated_value", label: "Estimated value (optional)", placeholder: "Range or order of magnitude", required: false },
        { key: "evidence_scope", label: "What you can provide for review *", placeholder: "Title, survey, mineral lease, environmental — define scope, not a blind upload", required: true },
        { key: "contact_name", label: "Your name or authorized representative *", placeholder: "Owner or developer lead", required: true },
        { key: "contact_email", label: "Contact email *", placeholder: "you@company.com", required: true },
        { key: "contact_wallet", label: "Sui wallet (optional)", placeholder: "0x… for future attestations", required: false },
      ].map(field => (
        <label key={field.key} style={{ display: "grid", gap: 4 }}>
          <span style={labelStyle}>{field.label}</span>
          <input
            required={field.required}
            type={field.key === "contact_email" ? "email" : "text"}
            value={form[field.key as keyof typeof form]}
            onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
            style={inputStyle}
          />
        </label>
      ))}

      <label style={{ display: "grid", gap: 4 }}>
        <span style={labelStyle}>Context for Abraxas review</span>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={4}
          placeholder="Development stage, counterparties who should receive scoped proof later, timeline…"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>

      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
        Status stays <strong>Pending review</strong> until a named reviewer signs. Public VERIFIED is never automatic.
        Sample flow: <code style={{ fontFamily: MONO, fontSize: "0.62rem" }}>ABX-DEMO-LAND-001</code> on{" "}
        <Link href="/verify/ABX-DEMO-LAND-001" style={{ color: ACCENT }}>/verify</Link>.
      </p>

      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: 0 }}>{error}</p>
      )}

      <button type="submit" disabled={busy} style={{
        padding: "0.65rem 1rem", borderRadius: 999, border: "none",
        background: busy ? `${ACCENT}55` : ACCENT, color: "#000",
        fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
        cursor: busy ? "wait" : "pointer",
      }}>
        {busy ? "Submitting…" : "Submit & track my application →"}
      </button>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)",
};

const inputStyle: React.CSSProperties = {
  padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--surface-inset)", color: "var(--text-primary)",
  fontFamily: FONT, fontSize: "0.78rem", width: "100%", boxSizing: "border-box",
};
