"use client";
// FILE: app/integrations/external-assets/page.tsx
// External asset owner application. Step 5 intake (pending review until signed).

import { useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function ExternalAssetsPage() {
  const [form, setForm] = useState({
    asset_name: "",
    asset_class: "REAL_ESTATE",
    jurisdiction: "",
    estimated_value: "",
    evidence_scope: "",
    contact_name: "",
    contact_email: "",
    contact_wallet: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/external-assets/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, originator: "external" }),
      });
      const json = await res.json() as { error?: string; message?: string; application_id?: string };
      if (!res.ok) throw new Error(json.error ?? "Submit failed");
      setResult(json.message ?? `Application ${json.application_id} received. status Pending review.`);
      setForm({
        asset_name: "",
        asset_class: "REAL_ESTATE",
        jurisdiction: "",
        estimated_value: "",
        evidence_scope: "",
        contact_name: "",
        contact_email: "",
        contact_wallet: "",
        description: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RedesignPage maxWidth={720}>
      <PageHeader
        eyebrow="External asset owners"
        title="Apply for Abraxas registry review"
        subtitle="Submit an asset for verification review. Public VERIFIED status requires a named reviewer, evidence scope, expiry, and verify URL. not automatic on submit."
      />

      <ContentCard title="Before you apply">
        <p style={body}>
          Abraxas-originated assets (Cielo, Smyrna) follow an internal pipeline. This form is for{" "}
          <strong>external asset owners</strong> seeking a public Abraxas record with defined evidence scope.
          Status remains <strong>Pending review</strong> until a named reviewer signs the claim.
        </p>
        <p style={{ ...body, marginTop: "0.65rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Sample record <code style={{ fontFamily: MONO, fontSize: "0.65rem" }}>ABX-DEMO-LAND-001</code> illustrates
          the intake flow. clearly labeled DEMO, not a real external owner.
        </p>
      </ContentCard>

      <ContentCard title="Application">
        <form onSubmit={e => void submit(e)} style={{ display: "grid", gap: "0.65rem" }}>
          {[
            { key: "asset_name", label: "Asset name", placeholder: "e.g. 12-acre parcel, catalog, invoice pool" },
            { key: "asset_class", label: "Asset class", placeholder: "REAL_ESTATE, FINE_ART, INVOICE, …" },
            { key: "jurisdiction", label: "Jurisdiction", placeholder: "US · Georgia, MX · Tulum, …" },
            { key: "estimated_value", label: "Estimated value", placeholder: "Optional" },
            { key: "evidence_scope", label: "Evidence scope", placeholder: "What documents/reviews you can provide" },
            { key: "contact_name", label: "Contact name", placeholder: "Owner or authorized representative" },
            { key: "contact_email", label: "Contact email *", placeholder: "you@company.com" },
            { key: "contact_wallet", label: "Sui wallet (optional)", placeholder: "0x…" },
          ].map(field => (
            <label key={field.key} style={{ display: "grid", gap: 4 }}>
              <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                {field.label}
              </span>
              <input
                required={field.key === "contact_email"}
                value={form[field.key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            </label>
          ))}
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Description
            </span>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>
          <button type="submit" disabled={busy} style={{
            padding: "0.55rem 1rem", borderRadius: 8, border: "none",
            background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.78rem",
            fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1,
          }}>
            {busy ? "Submitting…" : "Submit application →"}
          </button>
        </form>
        {result && (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, marginTop: "0.75rem", lineHeight: 1.6 }}>
            {result}
          </p>
        )}
        {error && (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", marginTop: "0.75rem" }}>{error}</p>
        )}
      </ContentCard>

      <div style={{ marginBottom: "2rem" }}>
        <Btn href="/integrations/relying-parties" variant="secondary" size="sm">← Relying party program</Btn>
      </div>
    </RedesignPage>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: 0,
};

const inputStyle: React.CSSProperties = {
  padding: "0.55rem 0.75rem",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: FONT,
  fontSize: "0.78rem",
  width: "100%",
  boxSizing: "border-box",
};
