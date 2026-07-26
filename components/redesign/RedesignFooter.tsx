"use client";
// FILE: components/redesign/RedesignFooter.tsx
// Minimal footer — plain language, few links.

import Link from "next/link";

const FONT = "'Inter',system-ui,sans-serif";

const LINKS = [
  { label: "Passport", href: "/passport" },
  { label: "Verify assets", href: "/verify" },
  { label: "Tokenize", href: "/build" },
  { label: "Blog", href: "/blog" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
];

export function RedesignFooter() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)",
      position: "relative",
      zIndex: 1,
      marginTop: "var(--section-gap, 3rem)",
    }}>
      <div style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "2rem clamp(1rem, 3vw, 2rem) 2.5rem",
      }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 900, color: "var(--accent)", marginBottom: "0.35rem" }}>
            ABRAXAS
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.55, margin: 0, maxWidth: 420 }}>
            Prove it once. Use it everywhere. Verify assets, hold your proof, tokenize what you own.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem 1.25rem", marginBottom: "1.25rem" }}>
          {LINKS.map(item => (
            <Link key={item.href} href={item.href} style={{
              fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", textDecoration: "none",
            }}>
              {item.label}
            </Link>
          ))}
          <Link href="/design-partner" style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", textDecoration: "none",
          }}>
            Design partners
          </Link>
        </div>
        <div style={{
          paddingTop: "1rem",
          borderTop: "1px solid var(--border)",
          fontFamily: FONT,
          fontSize: "0.68rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}>
          © {new Date().getFullYear()} Abraxas · Not investment advice.
        </div>
      </div>
    </footer>
  );
}
