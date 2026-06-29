"use client";
// FILE: app/faq/page.tsx

import { useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { FAQ_ITEMS } from "@/lib/protocolContent";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <RedesignPage maxWidth={760}>
      <PageHeader
        eyebrow="FAQ"
        title="Why this, why now"
        subtitle="Questions a skeptical investor, asset owner, or integrator actually asks before trusting Abraxas."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "2rem" }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={item.q} style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            overflow: "hidden",
          }}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%", padding: "1rem 1.1rem", background: "none", border: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer", textAlign: "left",
              }}>
              <span style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 600,
                              color: "var(--text-primary)" }}>{item.q}</span>
              <span style={{ color: ACCENT, transform: open === i ? "rotate(180deg)" : "none",
                              transition: "transform 0.2s" }}>▾</span>
            </button>
            {open === i && (
              <div style={{ padding: "0 1.1rem 1.1rem", fontFamily: FONT, fontSize: "0.84rem",
                             color: "var(--text-secondary)", lineHeight: 1.75 }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </RedesignPage>
  );
}
