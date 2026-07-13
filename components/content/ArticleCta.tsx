"use client";
// FILE: components/content/ArticleCta.tsx

import { Btn } from "@/components/redesign/ui";
import { PRIMARY_CTAS } from "@/lib/messaging/bible";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function ArticleCta() {
  return (
    <div style={{
      marginTop: "2rem", padding: "1.25rem", borderRadius: 14,
      border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.06)",
    }}>
      <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
        See it live
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.85rem" }}>
        Browse the public registry, walk the Cielo reference loop, or talk to the team about integrating reusable verification.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href={PRIMARY_CTAS.registry.href} size="sm">{PRIMARY_CTAS.registry.label} →</Btn>
        <Btn href={PRIMARY_CTAS.cielo.href} variant="secondary" size="sm">{PRIMARY_CTAS.cielo.label} →</Btn>
        <Btn href={PRIMARY_CTAS.designPartner.href} variant="ghost" size="sm">{PRIMARY_CTAS.designPartner.label} →</Btn>
      </div>
    </div>
  );
}
