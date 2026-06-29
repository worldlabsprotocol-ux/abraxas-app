"use client";
// FILE: components/content/ProtocolSection.tsx
// Reusable section blocks for docs, security, tokenomics pages.

const S = "'Inter',system-ui,-apple-system,sans-serif";
const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header style={{ marginBottom: "2rem" }}>
      {eyebrow && (
        <div style={{
          fontFamily: M,
          fontSize: "0.62rem",
          fontWeight: 700,
          color: G,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: "0.5rem",
        }}>
          {eyebrow}
        </div>
      )}
      <h1 style={{
        fontFamily: S,
        fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
        fontWeight: 800,
        letterSpacing: "-0.03em",
        margin: "0 0 0.75rem",
        color: "var(--text-primary)",
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          fontFamily: S,
          fontSize: "0.95rem",
          color: "var(--text-secondary)",
          lineHeight: 1.75,
          maxWidth: 640,
          margin: 0,
        }}>
          {subtitle}
        </p>
      )}
    </header>
  );
}

export function ContentCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{
      marginBottom: "1.25rem",
      padding: "1.25rem",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      background: "var(--surface-glass)",
      backdropFilter: "blur(var(--glass-blur))",
      WebkitBackdropFilter: "blur(var(--glass-blur))",
      boxShadow: "var(--shadow-card)",
    }}>
      {title && (
        <h2 style={{
          fontFamily: S,
          fontSize: "1rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 0 0.75rem",
        }}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--text-secondary)" }}>
      {items.map(item => (
        <li key={item} style={{
          fontFamily: S,
          fontSize: "0.84rem",
          lineHeight: 1.7,
          marginBottom: "0.35rem",
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
    <div style={{
      borderRadius: 14,
      border: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      {rows.map((row, i) => (
        <div key={row.k} style={{
          display: "grid",
          gridTemplateColumns: "minmax(120px, 160px) 1fr",
          gap: "0.75rem",
          padding: "0.85rem 1rem",
          borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
          background: "var(--surface-raised)",
        }}>
          <span style={{
            fontFamily: M,
            fontSize: "0.58rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>
            {row.k}
          </span>
          <span style={{
            fontFamily: row.mono ? M : S,
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
