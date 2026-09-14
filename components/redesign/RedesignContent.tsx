"use client";
// FILE: components/redesign/RedesignContent.tsx
// Page building blocks for docs, roadmap, tokenomics, etc.

import { AbxCard, AbxPageHeader } from "@/components/design/AbxPrimitives";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import type { AbxTabAccent } from "@/lib/design/abraxasDesignSystem";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  accent = "neutral",
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accent?: AbxTabAccent;
  align?: "left" | "center";
}) {
  return (
    <AbxPageHeader
      accent={accent}
      eyebrow={eyebrow}
      title={title}
      lead={subtitle}
      align={align}
    />
  );
}

export function ContentCard({
  title,
  id,
  accent,
  children,
}: {
  title?: string;
  id?: string;
  accent?: AbxTabAccent;
  children: React.ReactNode;
}) {
  return (
    <AbxCard id={id} accent={accent} style={{ marginBottom: "1.25rem" }} padding="1.25rem">
      {title && (
        <h2 style={{
          fontFamily: FONT,
          fontSize: "var(--fs-h2)",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 0 0.75rem",
        }}>
          {title}
        </h2>
      )}
      {children}
    </AbxCard>
  );
}

export function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
      {items.map(item => (
        <li key={item} style={{
          fontFamily: FONT,
          fontSize: "0.84rem",
          lineHeight: 1.7,
          marginBottom: "0.35rem",
          color: "var(--text-secondary)",
        }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function KeyValueTable({
  rows,
}: {
  rows: Array<{ k: string; v: string; mono?: boolean }>;
}) {
  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
      {rows.map((row, i) => (
        <div key={row.k} style={{
          display: "grid",
          gridTemplateColumns: "minmax(120px, 160px) 1fr",
          gap: "0.75rem",
          padding: "0.85rem 1rem",
          borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
          background: "var(--surface)",
        }}>
          <span style={{
            fontFamily: MONO,
            fontSize: "0.58rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>
            {row.k}
          </span>
          <span style={{
            fontFamily: row.mono ? MONO : FONT,
            fontSize: "0.82rem",
            color: "var(--text-primary)",
            wordBreak: "break-word",
            lineHeight: 1.55,
          }}>
            {row.v}
          </span>
        </div>
      ))}
    </div>
  );
}
