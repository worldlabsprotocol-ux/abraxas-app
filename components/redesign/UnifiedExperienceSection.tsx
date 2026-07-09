"use client";
// FILE: components/redesign/UnifiedExperienceSection.tsx

import { UNIFIED_EXPERIENCE_PRINCIPLES, HYBRID_ARCHITECTURE_SUMMARY } from "@/lib/kycThesis";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function UnifiedExperienceSection() {
  return (
    <section aria-labelledby="unified-experience-heading" style={{
      padding: "1.5rem 1.25rem", borderRadius: 18,
      background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.06) 100%)",
      border: "1px solid rgba(16,185,129,0.22)",
    }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.5rem",
      }}>
        Unified experience
      </div>
      <h2 id="unified-experience-heading" style={{
        fontFamily: FONT, fontSize: "clamp(1.15rem, 2.8vw, 1.45rem)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 1rem",
      }}>
        Verify once. Browse, book, and transact without thinking about chains.
      </h2>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem", display: "grid", gap: "0.55rem" }}>
        {UNIFIED_EXPERIENCE_PRINCIPLES.map(p => (
          <li key={p} style={{
            display: "flex", gap: "0.6rem", alignItems: "flex-start",
            fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.55,
          }}>
            <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>
            {p}
          </li>
        ))}
      </ul>

      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 580,
      }}>
        {HYBRID_ARCHITECTURE_SUMMARY}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/passport" size="sm">Create passport →</Btn>
        <Btn href="/account" variant="secondary" size="sm">My account</Btn>
        <Btn href="/flagship" variant="ghost" size="sm">Book verified stay</Btn>
      </div>
    </section>
  );
}
