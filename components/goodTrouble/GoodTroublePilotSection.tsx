"use client";
// FILE: components/goodTrouble/GoodTroublePilotSection.tsx
// Good Trouble Cannabis pilot — batch provenance fixtures + retail verify integration.

import { useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  GOOD_TROUBLE_BRAND,
  GOOD_TROUBLE_PILOT_DISCLAIMER,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import { GOOD_TROUBLE_SAMPLE_BATCHES } from "@/lib/goodTrouble/batchProvenance";
import {
  GOOD_TROUBLE_VERIFY_EXAMPLE,
  GOOD_TROUBLE_BATCH_VERIFY_EXAMPLE,
} from "@/lib/goodTrouble/retailEligibility";
import { goodTroubleVerifyUrl } from "@/lib/goodTrouble/partnerIntegration";
import { CANNABIS_BATCH_SCHEMA_ID, CANNABIS_BATCH_VC_TYPES } from "@/lib/credentials/cannabisBatchCredential";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const AMBER = "#F59E0B";

const COA_COLOR: Record<string, string> = {
  pending: AMBER,
  on_file: "#3B82F6",
  lab_verified: ACCENT,
};

export function GoodTroublePilotSection({ hideHeader = false }: { hideHeader?: boolean }) {
  const [activeBatch, setActiveBatch] = useState(GOOD_TROUBLE_SAMPLE_BATCHES[0]?.record_id ?? "");

  const batch = GOOD_TROUBLE_SAMPLE_BATCHES.find(b => b.record_id === activeBatch)
    ?? GOOD_TROUBLE_SAMPLE_BATCHES[0];

  return (
    <section aria-labelledby="good-trouble-pilot-heading">
      {!hideHeader && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
            Pilot · Regulated retail
          </div>
          <h2 id="good-trouble-pilot-heading" style={{
            fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
            letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 0.5rem",
          }}>
            {GOOD_TROUBLE_BRAND.name} × Abraxas
          </h2>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, maxWidth: 640, margin: 0 }}>
            {GOOD_TROUBLE_BRAND.mission} Batch provenance fixtures and Passport retail eligibility — sandbox pilot, not live POS.
          </p>
        </div>
      )}

      <div style={{
        padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "1rem",
        background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
      }}>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          {GOOD_TROUBLE_PILOT_DISCLAIMER} {GOOD_TROUBLE_BRAND.adultUseNotice}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <InfoCard label="Partner ID" value={GOOD_TROUBLE_PARTNER_ID} mono />
        <InfoCard label="Retail policy" value={GOOD_TROUBLE_RETAIL_POLICY_ID} mono />
        <InfoCard label="Location" value={`${GOOD_TROUBLE_BRAND.location} · Est. ${GOOD_TROUBLE_BRAND.established}`} />
        <InfoCard label="VC schema (planned)" value={CANNABIS_BATCH_SCHEMA_ID} mono />
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
          Sample batches (pilot fixtures)
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {GOOD_TROUBLE_SAMPLE_BATCHES.map(b => (
            <button
              key={b.record_id}
              type="button"
              onClick={() => setActiveBatch(b.record_id)}
              style={{
                padding: "0.45rem 0.75rem", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${activeBatch === b.record_id ? ACCENT : "var(--border)"}`,
                background: activeBatch === b.record_id ? `${ACCENT}15` : "var(--surface)",
                color: activeBatch === b.record_id ? ACCENT : "var(--text-secondary)",
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
              }}
            >
              {b.cultivar}
            </button>
          ))}
        </div>

        {batch && (
          <div style={{
            padding: "1rem", borderRadius: 14,
            border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.65rem" }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>{batch.cultivar}</div>
                <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: ACCENT, marginTop: 4 }}>{batch.record_id}</div>
              </div>
              <span style={{
                fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, padding: "0.25rem 0.5rem",
                borderRadius: 999, color: COA_COLOR[batch.coa_status] ?? "var(--text-muted)",
                background: `${COA_COLOR[batch.coa_status] ?? "#64748B"}18`,
              }}>
                COA · {batch.coa_status.replace("_", " ")}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.5rem", marginBottom: "0.65rem" }}>
              <MiniStat label="Batch code" value={batch.batch_code} />
              <MiniStat label="Harvest" value={batch.harvest_date} />
              {batch.lab?.thc_percent != null && <MiniStat label="THC" value={`${batch.lab.thc_percent}%`} />}
              <MiniStat label="Organic" value={batch.organic_claim ? "Claimed" : "—"} />
            </div>
            {batch.profile_notes && (
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
                {batch.profile_notes}
              </p>
            )}
            <Btn
              href={`/api/good-trouble/batch?record_id=${encodeURIComponent(batch.record_id)}`}
              variant="secondary"
              size="sm"
            >
              View batch JSON →
            </Btn>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
        <CodeBlock title="Retail eligibility verify" code={GOOD_TROUBLE_VERIFY_EXAMPLE} />
        <CodeBlock title="Batch provenance lookup" code={GOOD_TROUBLE_BATCH_VERIFY_EXAMPLE} />
      </div>

      <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.6 }}>
        Planned VC types: {CANNABIS_BATCH_VC_TYPES.join(" · ")}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href={goodTroubleVerifyUrl()} size="sm">Continue with Abraxas →</Btn>
        <Btn href="/verify?mode=credential" variant="secondary" size="sm">Test credential verify →</Btn>
        <Btn href="/integrations/relying-parties" variant="secondary" size="sm">Relying party program →</Btn>
        <Link href={GOOD_TROUBLE_BRAND.website} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          {GOOD_TROUBLE_BRAND.website.replace("https://", "")} ↗
        </Link>
      </div>
    </section>
  );
}

function InfoCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: "0.75rem", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}>
      <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: mono ? MONO : FONT, fontSize: mono ? "0.62rem" : "0.82rem", fontWeight: 700, color: "var(--text-primary)", wordBreak: "break-all" }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: FONT, fontSize: "0.55rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>{title}</div>
      <pre style={{
        fontFamily: MONO, fontSize: "0.62rem", lineHeight: 1.55, margin: 0,
        padding: "0.85rem", borderRadius: 10, overflow: "auto",
        background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)",
      }}>
        {code}
      </pre>
    </div>
  );
}
