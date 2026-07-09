"use client";
// FILE: components/redesign/WhyVerificationStorySection.tsx
// Plain-language story for why verification matters — not a spec sheet.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const STORIES = [
  {
    title: "The missed royalty check",
    body:
      "An artist's catalog sat for years generating royalties nobody was tracking. No platform had verified who owned what, so nobody could prove a claim worth chasing. Verify once — that proof travels with the asset.",
  },
  {
    title: "The property that couldn't get a loan",
    body:
      "A paid-off property with real income still has to prove its value from scratch to every bank. Verify it once, and lenders can trust the proof instead of restarting appraisals every time.",
  },
];

export function WhyVerificationStorySection() {
  return (
    <section>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "var(--text-primary)", margin: "0 0 0.5rem",
        }}>
          Why verification actually matters
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
          lineHeight: 1.7, margin: 0, maxWidth: 560,
        }}>
          Optional for browsing. Essential when real money moves — and worth doing once.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "1rem",
      }}>
        {STORIES.map(s => (
          <div
            key={s.title}
            style={{
              padding: "1.125rem",
              borderRadius: 16,
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{
              fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700,
              color: ACCENT, marginBottom: "0.5rem",
            }}>
              {s.title}
            </div>
            <p style={{
              fontFamily: FONT, fontSize: "0.78rem",
              color: "var(--text-secondary)", lineHeight: 1.7, margin: 0,
            }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
