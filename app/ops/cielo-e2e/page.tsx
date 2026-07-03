"use client";
// FILE: app/ops/cielo-e2e/page.tsx
// Visual Cielo revenue loop health dashboard.

import { useEffect, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

interface Check {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  group: string;
}

interface Payload {
  checks: Check[];
  passCount: number;
  warnCount: number;
  failCount: number;
  readyForDemo: boolean;
  flow: string[];
  updatedAt: string;
}

const STATUS_COLOR = { pass: "#10B981", warn: "#F59E0B", fail: "#EF4444" };

export default function CieloE2ePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/ops/cielo-e2e")
      .then(r => r.json())
      .then(d => setData(d as Payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <RedesignPage maxWidth={860}>
      <PageHeader
        eyebrow="Operations"
        title="Cielo E2E health check"
        subtitle="Run before a VC demo or investor walkthrough. All critical checks must pass for a live revenue loop demo."
      />

      {data && (
        <ContentCard title={`Demo ready: ${data.readyForDemo ? "YES ✓" : "NOT YET"}`}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {[
              { l: "Pass", v: data.passCount, c: STATUS_COLOR.pass },
              { l: "Warn", v: data.warnCount, c: STATUS_COLOR.warn },
              { l: "Fail", v: data.failCount, c: STATUS_COLOR.fail },
            ].map(s => (
              <div key={s.l} style={{ fontFamily: FONT, fontSize: "0.88rem" }}>
                <span style={{ fontWeight: 800, color: s.c }}>{s.v}</span>
                <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>{s.l}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={load} disabled={loading} style={{
            padding: "0.45rem 0.85rem", borderRadius: 999, border: "1px solid var(--border)",
            background: "var(--surface)", fontFamily: FONT, fontSize: "0.78rem", cursor: "pointer",
          }}>
            {loading ? "Running…" : "Re-run checks"}
          </button>
        </ContentCard>
      )}

      <ContentCard title="Checks">
        {loading && !data && <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)" }}>Running…</p>}
        {data?.checks.map(c => (
          <div key={c.id} style={{
            display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem",
            padding: "0.65rem 0", borderBottom: "1px solid var(--border)",
          }}>
            <span style={{
              fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700,
              color: STATUS_COLOR[c.status], minWidth: 48,
            }}>
              {c.status.toUpperCase()}
            </span>
            <div>
              <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {c.label}
                <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginLeft: 8 }}>{c.group}</span>
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-secondary)" }}>{c.detail}</div>
            </div>
          </div>
        ))}
      </ContentCard>

      {data?.flow && (
        <ContentCard title="Manual E2E walkthrough">
          <ol style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.85, margin: 0, paddingLeft: "1.25rem" }}>
            {data.flow.map(step => <li key={step}>{step}</li>)}
          </ol>
        </ContentCard>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/terminal#featured-asset" size="lg">Start booking test →</Btn>
        <Btn href="/admin/cielo" variant="secondary" size="lg">Admin calendar</Btn>
        <Btn href="/metrics" variant="ghost" size="lg">Metrics</Btn>
        <Link href="/api/ops/cielo-e2e" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#10B981", alignSelf: "center" }}>
          JSON →
        </Link>
      </div>
    </RedesignPage>
  );
}
