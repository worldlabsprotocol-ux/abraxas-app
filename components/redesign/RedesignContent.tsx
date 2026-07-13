"use client";
// FILE: components/redesign/RedesignContent.tsx
// Page building blocks for docs, roadmap, tokenomics, etc.

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  titleAccent,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Optional gradient-highlighted suffix (e.g. last phrase of headline) */
  titleAccent?: string;
}) {
  const baseTitle = titleAccent ? title.replace(titleAccent, "").trim() : title;

  return (
    <header style={{ marginBottom: "2rem" }}>
      {eyebrow && (
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          {eyebrow}
        </div>
      )}
      <h1 style={{
        fontFamily: FONT,
        fontSize: "var(--fs-h1)",
        fontWeight: 800,
        letterSpacing: "-0.03em",
        margin: "0 0 0.75rem",
        color: "var(--text-primary)",
      }}>
        {titleAccent ? (
          <>
            {baseTitle}{" "}
            <span className="abx-gradient-text">{titleAccent}</span>
          </>
        ) : title}
      </h1>
      {subtitle && (
        <p style={{
          fontFamily: FONT,
          fontSize: "var(--fs-body)",
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
    <section className="abx-glass-panel" style={{
      marginBottom: "1.25rem",
      padding: "1.25rem",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-soft)",
    }}>
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
    </section>
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
            color: row.mono ? "var(--accent)" : "var(--text-primary)",
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
