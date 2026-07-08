"use client";
// FILE: components/home/HomeNetworkBrief.tsx

import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const LAYERS = [
  { title: "Passport", body: "Reusable credentials, wallet binding, consent, and re-verification." },
  { title: "Trust Registry", body: "Public records — what was checked, who issued it, whether it remains current." },
  { title: "Policy Engine", body: "Rules that determine whether a person, wallet, or asset can take a specific action." },
];

export function HomeNetworkBrief() {
  return (
    <section style={{
      padding: "clamp(2rem, 5vw, 3rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }} aria-labelledby="network-heading">
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.5rem",
      }}>
        The network
      </div>
      <h2 id="network-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 1rem",
      }}>
        Three connected layers
      </h2>
      <div style={{ display: "grid", gap: "0.65rem", marginBottom: "1rem" }}>
        {LAYERS.map(l => (
          <div key={l.title} style={{
            padding: "0.85rem 1rem", borderRadius: 12,
            background: "var(--surface-inset)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              {l.title}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              {l.body}
            </div>
          </div>
        ))}
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 560, margin: 0,
      }}>
        Passport proves who can act. Registry proves what is real. Policy decides whether the action is allowed.{" "}
        <Link href="/integrations" style={{ color: ACCENT, fontWeight: 600, textDecoration: "none" }}>
          Explore architecture →
        </Link>
      </p>
    </section>
  );
}
