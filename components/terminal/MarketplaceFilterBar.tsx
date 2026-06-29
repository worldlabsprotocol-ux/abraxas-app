"use client";
// FILE: components/terminal/MarketplaceFilterBar.tsx
// Glass filter bar integrated under the hero, ZentraTech-style.

import { M, S, G, MUTED } from "./tokens";

const FILTERS: Array<{ label: string; value: string; icon?: string }> = [
  { label: "Asset type", value: "Real Estate" },
  { label: "Jurisdiction", value: "USA", icon: "\u{1F1FA}\u{1F1F8}" },
  { label: "Minimum entry", value: "$500" },
  { label: "Issuer", value: "Verified only" },
  { label: "APR", value: "8%+" },
  { label: "Secondary market", value: "Available" },
];

export function MarketplaceFilterBar({ embedded = false }: { embedded?: boolean }) {
  return (
    <div style={{
      borderRadius: embedded ? 18 : "var(--radius-lg)",
      border: "1px solid var(--border)",
      background: "var(--surface-raised)",
      boxShadow: embedded ? "none" : "var(--shadow-soft)",
      padding: "1rem clamp(0.75rem, 2vw, 1.25rem)",
      marginBottom: embedded ? 0 : "1.5rem",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
        gap: "0.625rem",
      }}>
        {FILTERS.map(f => (
          <div key={f.label} style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            padding: "0.6rem 0.8rem",
            minHeight: 58,
            cursor: "default",
          }}>
            <div style={{
              fontFamily: M,
              fontSize: "0.48rem",
              fontWeight: 700,
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 5,
            }}>
              {f.label}
            </div>
            <div style={{
              fontFamily: S,
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}>
              {f.icon && <span>{f.icon}</span>}
              <span style={{ flex: 1 }}>{f.value}</span>
              <span style={{ color: MUTED, fontSize: "0.7rem" }}>▾</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
