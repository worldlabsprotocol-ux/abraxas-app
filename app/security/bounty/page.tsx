"use client";
// FILE: app/security/bounty/page.tsx
// Bug bounty pre-registration + full scope.

import Link from "next/link";
import { useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { AUDIT_TRACKER, AUDIT_STATUS_COLOR, BUG_BOUNTY } from "@/lib/securityProgram";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "var(--accent)";

function BountyReportForm() {
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [reproduction, setReproduction] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMsg("");
    try {
      const res = await fetch("/api/security/bounty/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, severity, description, reproduction, contact_email: email }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string };
      if (data.ok) {
        setStatus("sent");
        setMsg(data.message ?? "Report received.");
      } else {
        setStatus("error");
        setMsg(data.error ?? "Could not submit.");
      }
    } catch {
      setStatus("error");
      setMsg("Network error. try email fallback below.");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.6rem 0.75rem", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--text-primary)", fontFamily: FONT, fontSize: "16px",
    boxSizing: "border-box", marginBottom: "0.5rem",
  };

  if (status === "sent") {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, margin: 0, lineHeight: 1.65 }}>
        {msg}
      </p>
    );
  }

  return (
    <form onSubmit={e => void submit(e)}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" required style={inputStyle} />
      <select value={severity} onChange={e => setSeverity(e.target.value)} style={inputStyle}>
        {["critical", "high", "medium", "low", "informational"].map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description *" required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
      <textarea value={reproduction} onChange={e => setReproduction(e.target.value)} placeholder="Reproduction steps" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Contact email *" required style={inputStyle} />
      {msg && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#F87171", margin: "0 0 0.5rem" }}>{msg}</p>}
      <button type="submit" disabled={status === "sending"} style={{
        padding: "0.65rem 1.25rem", borderRadius: 999, border: "none",
        background: ACCENT, color: "#1a1400", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800,
        cursor: status === "sending" ? "wait" : "pointer", opacity: status === "sending" ? 0.7 : 1,
      }}>
        {status === "sending" ? "Submitting…" : "Submit report on-protocol →"}
      </button>
    </form>
  );
}

export default function BugBountyPage() {
  const mailto = `mailto:${BUG_BOUNTY.reportEmail}?subject=${encodeURIComponent(BUG_BOUNTY.reportSubject)}`;

  return (
    <RedesignPage maxWidth={860}>
      <PageHeader
        eyebrow="Security program"
        title="Bug bounty & audit tracker"
        subtitle="Scope is published today. Full rewards program launches after Passport and credential API audits complete."
      />

      <div style={{
        padding: "0.85rem 1.15rem", borderRadius: 14, marginBottom: "1.25rem",
        background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.35)",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#F59E0B", marginBottom: 4 }}>
          {BUG_BOUNTY.phaseLabel}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          {BUG_BOUNTY.maxRewardNote}
        </p>
      </div>

      <ContentCard title="Audit tracker">
        {AUDIT_TRACKER.map(audit => (
          <div key={audit.id} style={{
            padding: "0.85rem 0", borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {audit.name}
              </span>
              <span style={{
                fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                padding: "0.15rem 0.45rem", borderRadius: 6,
                color: AUDIT_STATUS_COLOR[audit.status],
                background: `${AUDIT_STATUS_COLOR[audit.status]}18`,
              }}>
                {audit.statusLabel}
              </span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
              Scope: {audit.scope}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              {audit.notes}
            </p>
            {audit.reportHref && (
              <Link href={audit.reportHref} style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, marginTop: "0.35rem", display: "inline-block" }}>
                Read report →
              </Link>
            )}
          </div>
        ))}
      </ContentCard>

      <ContentCard title="In scope">
        <BulletList items={[...BUG_BOUNTY.inScope]} />
      </ContentCard>

      <ContentCard title="Out of scope">
        <BulletList items={[...BUG_BOUNTY.outOfScope]} />
      </ContentCard>

      <ContentCard title="Reward pool">
        <p style={body}>{BUG_BOUNTY.rewardPoolNote}</p>
      </ContentCard>

      <ContentCard title="Severity tiers">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {BUG_BOUNTY.severityTiers.map(tier => (
            <div key={tier.level} style={{
              padding: "0.75rem", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {tier.level}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0.25rem 0", lineHeight: 1.6 }}>
                {tier.examples}
              </p>
              <div style={{ fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700, color: ACCENT, marginTop: "0.35rem" }}>
                {tier.rewardUsd}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
                {tier.rewardNote}
              </p>
              <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                SLA: {tier.sla}
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Safe harbor">
        <p style={body}>{BUG_BOUNTY.safeHarbor}</p>
      </ContentCard>

      <ContentCard title="Full launch criteria">
        <BulletList items={[...BUG_BOUNTY.launchCriteria]} />
      </ContentCard>

      <ContentCard title="Submit via API (pre-registration)">
        <p style={{ ...body, marginBottom: "0.85rem" }}>
          Reports persist in Abraxas ops queue and notify the security inbox. Email fallback remains below.
        </p>
        <BountyReportForm />
      </ContentCard>

      <div style={{
        padding: "1.25rem", borderRadius: 14, marginBottom: "1.5rem",
        background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
        textAlign: "center",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Report a vulnerability (email)
        </div>
        <p style={{ ...body, marginBottom: "1rem" }}>
          Email findings with reproduction steps. Do not publicly disclose before we acknowledge.
        </p>
        <a href={mailto} style={{
          display: "inline-block", padding: "0.75rem 1.5rem", borderRadius: 999,
          background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800,
          textDecoration: "none",
        }}>
          {BUG_BOUNTY.reportEmail}
        </a>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/security" size="lg">Security overview →</Btn>
        <Btn href="/investors/strategy" variant="secondary" size="lg">Strategic roadmap</Btn>
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
