"use client";
// FILE: components/seo/HubGrid.tsx

import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function HubGrid({ items }: {
  items: { href: string; title: string; description: string }[];
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
      gap: "0.65rem",
      marginBottom: "2rem",
    }}>
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            display: "block",
            padding: "1rem 1.1rem",
            borderRadius: 14,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-raised)",
            textDecoration: "none",
            color: "inherit",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, lineHeight: 1.3 }}>
            {item.title} →
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
            {item.description}
          </p>
        </Link>
      ))}
    </div>
  );
}
