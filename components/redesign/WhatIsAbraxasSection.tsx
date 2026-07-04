"use client";
// FILE: components/redesign/WhatIsAbraxasSection.tsx
// Plain-language explainer — no finance jargon.

import Link from "next/link";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

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
        What is Abraxas? (plain English)
      </div>

      <p style={{
        fontFamily: FONT, fontSize: "clamp(1rem, 2.5vw, 1.15rem)", fontWeight: 700,
        color: "var(--text-primary)", lineHeight: 1.45, margin: "0 0 1rem", maxWidth: 640,
      }}>
        Abraxas helps you prove what&apos;s real — your identity and your assets — so you don&apos;t repeat the same checks everywhere.
      </p>

      <div style={{ display: "grid", gap: "0.85rem", marginBottom: "1.15rem" }}>
        {[
          {
            n: "1",
            title: "Sign in once (like Google)",
            body: "No seed phrase. We built wallet sign-in the hard way — Google → your own secure account — so normal people can actually use it.",
            href: "/passport",
          },
          {
            n: "2",
            title: "Verify when a deal needs it",
            body: "Browse properties and assets first. ID check only when you pay, invest, or a partner requires it. Your proof travels with you — they never see your documents.",
            href: "/passport#idv",
          },
          {
            n: "3",
            title: "Anyone can check the proof",
            body: "Lenders, buyers, and partners paste an ID into our public checker — same way you'd verify a link — and see if it's still valid.",
            href: "/verify",
          },
        ].map(item => (
          <Link key={item.n} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem",
              padding: "0.75rem", borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: `${ACCENT}18`,
                border: `1px solid ${ACCENT}44`, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, color: ACCENT,
              }}>
                {item.n}
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {item.body}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/passport" size="sm">Create my passport →</Btn>
        <Btn href="/docs/sui" variant="ghost" size="sm">Technical depth (zkLogin)</Btn>
      </div>
    </section>
  );
}
