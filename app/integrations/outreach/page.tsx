"use client";
// FILE: app/integrations/outreach/page.tsx
// Design partner outreach — copy-paste email templates.

import { useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  OUTREACH_EMAIL_TEMPLATE,
  OUTREACH_FOLLOWUP_TEMPLATE,
  OUTREACH_SUBJECT_LINES,
  OUTREACH_TARGETS,
  OUTREACH_CHECKLIST,
} from "@/lib/designPartnerOutreach";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function OutreachPage() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <RedesignPage maxWidth={860}>
      <PageHeader
        eyebrow="Design partner outreach"
        title="Recruit your first relying party"
        subtitle="Copy-paste templates for RWA marketplaces, lenders, and IP platforms. Personalize bracketed fields — link visual proof (/verify + Cielo photos) before API docs."
      />

      <ContentCard title="Before you send">
        <BulletList items={[...OUTREACH_CHECKLIST]} />
      </ContentCard>

      <ContentCard title="Subject line options">
        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
          {OUTREACH_SUBJECT_LINES.map(s => <li key={s}>{s}</li>)}
        </ul>
      </ContentCard>

      <ContentCard title="Primary outreach email">
        <CopyBlock
          text={OUTREACH_EMAIL_TEMPLATE}
          copied={copied === "primary"}
          onCopy={() => copy(OUTREACH_EMAIL_TEMPLATE, "primary")}
        />
      </ContentCard>

      <ContentCard title="Follow-up (verifier demo)">
        <CopyBlock
          text={OUTREACH_FOLLOWUP_TEMPLATE}
          copied={copied === "followup"}
          onCopy={() => copy(OUTREACH_FOLLOWUP_TEMPLATE, "followup")}
        />
      </ContentCard>

      <ContentCard title="Target categories">
        {OUTREACH_TARGETS.map(t => (
          <div key={t.category} style={{ padding: "0.65rem 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.category}</div>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: "0.25rem 0" }}>{t.examples}</p>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT }}>Hook: {t.hook}</div>
          </div>
        ))}
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/integrations/relying-parties" size="lg">Relying party docs →</Btn>
        <Btn href="/integrations" variant="secondary" size="lg">Submit application</Btn>
        <Btn href="/verify/ABX-RE-HOSP-001" variant="ghost" size="lg">Demo verifier</Btn>
      </div>
    </RedesignPage>
  );
}

function CopyBlock({ text, copied, onCopy }: { text: string; copied: boolean; onCopy: () => void }) {
  return (
    <div>
      <pre style={{
        fontFamily: MONO, fontSize: "0.65rem", lineHeight: 1.55,
        padding: "1rem", borderRadius: 10, overflow: "auto", maxHeight: 420,
        background: "var(--surface)", border: "1px solid var(--border)",
        color: "var(--text-secondary)", margin: "0 0 0.75rem", whiteSpace: "pre-wrap",
      }}>
        {text}
      </pre>
      <button type="button" onClick={onCopy} style={{
        padding: "0.55rem 1rem", borderRadius: 999, border: "none",
        background: copied ? "var(--surface)" : ACCENT,
        color: copied ? "var(--text-muted)" : "#000",
        fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
      }}>
        {copied ? "Copied ✓" : "Copy to clipboard"}
      </button>
    </div>
  );
}
