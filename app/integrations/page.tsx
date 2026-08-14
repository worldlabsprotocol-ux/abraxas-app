"use client";
// FILE: app/integrations/page.tsx
// External protocol integration hub + design partner applications.

import { useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  PROTOCOL_INTEGRATIONS,
  INTEGRATION_SDK_SNIPPET,
  DESIGN_PARTNER_CRITERIA,
  STATUS_LABEL,
  STATUS_COLOR,
  type IntegrationStatus,
} from "@/lib/protocolIntegrations";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function IntegrationsPage() {
  const [form, setForm] = useState({
    company: "", contact_name: "", email: "", website: "",
    use_case: "", monthly_volume: "", integration_type: "passport_gate",
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

  const liveCount = PROTOCOL_INTEGRATIONS.filter(p => p.status === "live").length;

  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Integrations"
        title="The reusable verification primitive"
        subtitle={`${liveCount} live integration surfaces today. External protocols integrate Abraxas Passport in ~4 lines. no re-KYC for users.`}
      />

      <ContentCard title="Relying party program">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.75rem" }}>
          The network-effect milestone: an unaffiliated lender, marketplace, or protocol checks Abraxas credentials in production.
          Partners configure eligibility rules. Abraxas returns <strong>approved / denied / manual review</strong> with consent receipts and audit references.
        </p>
        <Btn href="/integrations/relying-parties" size="sm">Relying party onboarding →</Btn>
        <Btn href="/integrations/outreach" variant="secondary" size="sm">Outreach templates</Btn>
      </ContentCard>

      <div id="policy-engine">
      <ContentCard title="Policy Engine">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.65rem" }}>
          Partners define required claims (identity, screening, wallet binding, accreditation) with assurance levels and max age.
          The engine evaluates live claim status. not a static profile. and logs every decision.
        </p>
        <BulletList items={[
          "Seeded policies: abraxas-core-v1, abraxas-booking-v1, abraxas-rwa-us-v1",
          "POST /api/v1/policies/evaluate. direct evaluation",
          "GET /api/v1/decisions/{id}/status. re-check before settlement",
        ]} />
      </ContentCard>
      </div>

      <div id="trust-registry">
      <ContentCard title="Trust Registry">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.65rem" }}>
          A credential is only valuable if the verifier trusts the issuer. Abraxas maintains which issuers may sign which claim types,
          with assurance tiers, jurisdictions, and audit status.
        </p>
        <BulletList items={[
          "GET /api/trust/registry. issuers + W3C schema identifiers",
          "Veriff · Abraxas Network · Manual Review · Screening (partner-gated)",
          "Issuer suspension and schema versioning",
        ]} />
        <Btn href="/api/trust/registry" size="sm" variant="secondary">View registry JSON →</Btn>
      </ContentCard>
      </div>

      <ContentCard title="Quick integration">
        <pre style={{
          fontFamily: MONO, fontSize: "0.68rem", lineHeight: 1.6,
          padding: "1rem", borderRadius: 10, overflow: "auto",
          background: "var(--surface)", border: "1px solid var(--border)",
          color: "var(--text-secondary)", margin: "0 0 0.75rem",
        }}>
          {INTEGRATION_SDK_SNIPPET}
        </pre>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/docs/partner-flow" size="sm">Partner Flow docs →</Btn>
          <Btn href="/verify?mode=receipt" size="sm" variant="secondary">Receipt tester →</Btn>
          <Btn href="/docs/architecture" variant="tertiary" size="sm">Architecture</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Integration registry">
        {PROTOCOL_INTEGRATIONS.map(p => (
          <div key={p.id} style={{
            display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem",
            padding: "0.85rem 0", borderBottom: "1px solid var(--border)",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</span>
                <span style={{
                  fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                  padding: "0.15rem 0.45rem", borderRadius: 6,
                  color: STATUS_COLOR[p.status as IntegrationStatus],
                  background: `${STATUS_COLOR[p.status as IntegrationStatus]}18`,
                }}>
                  {STATUS_LABEL[p.status as IntegrationStatus]}
                </span>
                <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)" }}>{p.category}</span>
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0.35rem 0 0" }}>
                {p.description}
              </p>
              {p.api && (
                <code style={{ fontFamily: MONO, fontSize: "0.62rem", color: ACCENT, display: "block", marginTop: "0.35rem" }}>{p.api}</code>
              )}
              {(p.href || p.website) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "0.45rem" }}>
                  {p.href && (
                    <Link href={p.href} style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT, textDecoration: "none" }}>
                      Pilot page →
                    </Link>
                  )}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", textDecoration: "none" }}>
                      Website ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </ContentCard>

      <div id="apply" style={{ scrollMarginTop: 96 }}>
      <ContentCard title="Become a design partner">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.5rem" }}>
          For age-gated digital commerce teams integrating Partner Flow. We prioritize partners with a clear conversion metric and a defined eligibility gate.
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
          <strong style={{ color: "var(--text-secondary)" }}>What happens next:</strong> manual review (typically within a few business days).
          No self-serve production access or automatic API-key issuance. Sandbox credentials are operator-provisioned after approval.
        </p>
        <BulletList items={[...DESIGN_PARTNER_CRITERIA]} />

        {sent ? (
          <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: 12, background: `${ACCENT}12`, border: `1px solid ${ACCENT}33` }}>
            <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: ACCENT }}>Application received</div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.35rem 0 0.75rem", lineHeight: 1.6 }}>
              We review design partner applications manually. If approved, operators will provision sandbox policies and callback allowlists — not instant production access.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Btn href="/docs/partner-flow" size="sm">Read Partner Flow docs</Btn>
              <Btn href="/verify?mode=receipt" variant="secondary" size="sm">Explore receipt tester</Btn>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: "1rem", display: "grid", gap: "0.65rem" }} noValidate={false}>
            <Field
              label="Company / protocol"
              value={form.company}
              onChange={v => setForm(f => ({ ...f, company: v }))}
              required
              helper="Legal entity or product name we should recognize in review."
            />
            <Field label="Contact name" value={form.contact_name} onChange={v => setForm(f => ({ ...f, contact_name: v }))} helper="Primary technical or business contact." />
            <Field label="Work email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required helper="We reply here — use a domain you control." />
            <Field label="Website" value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} helper="Product or company URL (optional)." />
            <label style={labelStyle}>
              Integration type
              <select value={form.integration_type} onChange={e => setForm(f => ({ ...f, integration_type: e.target.value }))}
                style={inputStyle}>
                <option value="passport_gate">Passport gate at checkout</option>
                <option value="identity_only">Identity verification only</option>
                <option value="asset_attestation">Asset attestation / RWA listing</option>
                <option value="lending_collateral">Lending / collateral verification</option>
              </select>
              <span style={helperStyle}>Closest match — Partner Flow is the default path for age-gated checkout gates.</span>
            </label>
            <label style={labelStyle}>
              Use case
              <textarea value={form.use_case} onChange={e => setForm(f => ({ ...f, use_case: e.target.value }))}
                rows={3} style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Describe the eligibility gate (e.g. age-gated retail checkout), expected holder flow, and your callback URL pattern." />
              <span style={helperStyle}>Helps us assess fit and sandbox provisioning needs.</span>
            </label>
            <Field
              label="Expected monthly verification volume"
              value={form.monthly_volume}
              onChange={v => setForm(f => ({ ...f, monthly_volume: v }))}
              helper="Rough order of magnitude is fine (e.g. 500 / month)."
            />
            <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={form.public_name_ok} onChange={e => setForm(f => ({ ...f, public_name_ok: e.target.checked }))} />
              <span style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                OK to name us publicly after a successful pilot
              </span>
            </label>
            {err && (
              <div role="alert" style={{ padding: "0.65rem 0.75rem", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: 0 }}>{err}</p>
              </div>
            )}
            <button type="submit" disabled={busy} aria-busy={busy} style={{
              padding: "0.75rem 1.25rem", borderRadius: 999, border: "none",
              background: busy ? `${ACCENT}66` : ACCENT, color: "#000",
              fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, cursor: busy ? "wait" : "pointer",
            }}>
              {busy ? "Submitting application…" : "Submit for manual review →"}
            </button>
            <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
              Already approved? Read <Link href="/docs/partner-flow" style={{ color: ACCENT, textDecoration: "none", fontWeight: 600 }}>Partner Flow docs</Link> and test receipts at{" "}
              <Link href="/verify?mode=receipt" style={{ color: ACCENT, textDecoration: "none", fontWeight: 600 }}>/verify</Link>.
            </p>
          </form>
        )}
      </ContentCard>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/investors/pitch" size="lg">Pitch deck →</Btn>
        <Btn href="/ops/cielo-e2e" variant="secondary" size="lg">Cielo E2E check</Btn>
        <Link href="/investors" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center" }}>Data room →</Link>
      </div>
    </RedesignPage>
  );
}

function Field({ label, value, onChange, type = "text", required, helper }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; helper?: string;
}) {
  return (
    <label style={labelStyle}>
      {label}{required ? " *" : ""}
      <input type={type} value={value} required={required} onChange={e => onChange(e.target.value)} style={inputStyle} />
      {helper && <span style={helperStyle}>{helper}</span>}
    </label>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "0.25rem",
  fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)",
};

const inputStyle: React.CSSProperties = {
  padding: "0.55rem 0.65rem", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text-primary)", fontFamily: FONT, fontSize: "0.85rem",
};

const helperStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.68rem",
  fontWeight: 500,
  color: "var(--text-muted)",
  lineHeight: 1.45,
};
