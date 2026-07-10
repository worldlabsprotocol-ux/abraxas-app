"use client";
// FILE: components/home/HomeValueProp.tsx
// Central product message — share proof, not your whole profile.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const POINTS = [
  "Share proof, not your whole profile.",
  "Approve one request at a time.",
  "Revoke access when it no longer applies.",
];

export function HomeValueProp() {
  return (
    <section style={{
      padding: "clamp(1.25rem, 3vw, 1.75rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }} aria-labelledby="value-prop-heading">
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: ACCENT, margin: "0 0 0.5rem",
      }}>
        Verify once. Reuse proof where Abraxas is accepted.
      </p>
      <h2 id="value-prop-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 0.75rem", maxWidth: 520, lineHeight: 1.15,
      }}>
        Prove what they need — not everything else.
      </h2>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.45rem", maxWidth: 480 }}>
        {POINTS.map(point => (
          <li key={point} style={{
            fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
            lineHeight: 1.55, paddingLeft: "1rem", position: "relative",
          }}>
            <span style={{ position: "absolute", left: 0, color: ACCENT }}>·</span>
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}
