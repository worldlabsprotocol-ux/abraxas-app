"use client";
// FILE: components/terminal/MarketplaceFilterBar.tsx
// Discovery filters, visual only for now. Matches RWA marketplace UX patterns.

import { M, S, G, BDR, CARD, MUTED } from "./tokens";

const FILTERS: Array<{
  label: string;
  value: string;
  icon?: string;
}> = [
  { label: "Asset type", value: "Real Estate" },
  { label: "Jurisdiction", value: "USA", icon: "\u{1F1FA}\u{1F1F8}" },
  { label: "Minimum entry", value: "$500" },
  { label: "Issuer", value: "Verified only" },
  { label: "APR", value: "8%+" },
  { label: "Secondary market", value: "Available" },
];

export function MarketplaceFilterBar() {
  return (
    <div style={{
      borderRadius: 16,
      border: `1px solid ${BDR}`,
      background: CARD,
      boxShadow: "var(--shadow-soft)",
      padding: "1rem clamp(0.75rem,2vw,1.25rem)",
      marginBottom: "1.25rem",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.5rem",
        marginBottom: "0.875rem",
      }}>
        <span style={{
          fontFamily: S,
          fontSize: "0.82rem",
          fontWeight: 700,
          color: "var(--text-primary)",
        }}>
          Marketplace filters
        </span>
        <span style={{
          fontFamily: M,
          fontSize: "0.58rem",
          fontWeight: 700,
          color: G,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          Verified assets only
        </span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "0.625rem",
      }}>
        {FILTERS.map(f => (
          <div key={f.label} style={{
            borderRadius: 12,
            border: `1px solid ${BDR}`,
            background: "var(--surface-raised)",
            padding: "0.55rem 0.75rem",
            minHeight: 56,
          }}>
            <div style={{
              fontFamily: M,
              fontSize: "0.5rem",
              fontWeight: 700,
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 4,
            }}>
              {f.label}
            </div>
            <div style={{
              fontFamily: S,
              fontSize: "0.76rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}>
              {f.icon && <span>{f.icon}</span>}
              {f.value}
              <span style={{ marginLeft: "auto", color: MUTED, fontSize: "0.65rem" }}>
                ▾
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
