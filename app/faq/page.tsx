"use client";
// FILE: app/faq/page.tsx

import { useState } from "react";
import { ProtocolPage } from "@/components/ProtocolPage";
import { PageHeader } from "@/components/content/ProtocolSection";
import { FAQ_ITEMS } from "@/lib/protocolContent";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const G = "#10B981";

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ProtocolPage maxWidth={760}>
      <PageHeader
        eyebrow="FAQ"
        title="Why this, why now"
        subtitle="Questions a skeptical investor, asset owner, or integrator actually asks before trusting Abraxas with verification or capital."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={item.q} style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface-glass)",
            overflow: "hidden",
          }}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%",
                padding: "1rem 1.1rem",
                background: "none",
                border: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                textAlign: "left",
              }}>
              <span style={{
                fontFamily: S,
                fontSize: "0.92rem",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}>
                {item.q}
              </span>
              <span style={{
                color: G,
                transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}>
                ▾
              </span>
            </button>
            {open === i && (
              <div style={{
                padding: "0 1.1rem 1.1rem",
                fontFamily: S,
                fontSize: "0.84rem",
                color: "var(--text-secondary)",
                lineHeight: 1.75,
              }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </ProtocolPage>
  );
}
