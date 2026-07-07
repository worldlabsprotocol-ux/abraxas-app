"use client";
// FILE: components/redesign/WhatIsAbraxasSection.tsx
// Plain-language explainer — tightened copy.

import Link from "next/link";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const STEPS = [
  { n: "1", title: "Create account", body: "Sign in with Google — wallet ready in one click.", href: "/passport" },
  { n: "2", title: "Verify when needed", body: "ID check only for bookings or high-trust deals.", href: "/passport#passport-step-2" },
  { n: "3", title: "Get passport", body: "Portable proof you control — add to Apple Wallet.", href: "/passport#passport-step-3" },
  { n: "4", title: "Reuse anywhere", body: "Partners verify via API — they never see your documents.", href: "/verify" },
] as const;

export function WhatIsAbraxasSection() {
  return (
    <section style={{
      padding: "1.35rem 1.25rem",
      borderRadius: 18,
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
    }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.65rem",
      }}>
        What is Abraxas?
      </div>

      <p style={{
        fontFamily: FONT, fontSize: "clamp(1rem, 2.5vw, 1.1rem)", fontWeight: 700,
        color: "var(--text-primary)", lineHeight: 1.45, margin: "0 0 1rem", maxWidth: 580,
      }}>
        Prove what&apos;s real — your identity and your assets — without repeating checks everywhere.
      </p>

      <div style={{ display: "grid", gap: "0.65rem", marginBottom: "1rem" }}>
        {STEPS.map(item => (
          <Link key={item.n} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.65rem",
              padding: "0.65rem 0.75rem", borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
              minHeight: 44,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", background: `${ACCENT}18`,
                border: `1px solid ${ACCENT}44`, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800, color: ACCENT,
              }}>
                {item.n}
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                  {item.title}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {item.body}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/passport" size="sm">Create my passport →</Btn>
        <Btn href="/docs/sui" variant="ghost" size="sm">How it works (technical)</Btn>
      </div>
    </section>
  );
}
