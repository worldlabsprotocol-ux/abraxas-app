"use client";
// FILE: components/admin/operator/EvidenceSection.tsx

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

export interface EvidenceRow {
  label: string;
  value: string;
  tone?: "default" | "watch" | "blocked";
}

export function EvidenceSection({
  title,
  rows,
  technicalDetails,
}: {
  title: string;
  rows: EvidenceRow[];
  technicalDetails?: React.ReactNode;
}) {
  const toneColor = (tone: EvidenceRow["tone"]) => {
    if (tone === "blocked") return "#F87171";
    if (tone === "watch") return "#F59E0B";
    return "rgba(255,255,255,0.78)";
  };

  return (
    <section aria-label={title} style={{ marginTop: "0.75rem" }}>
      <h4 style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", margin: "0 0 0.45rem" }}>
        {title}
      </h4>
      <dl style={{ margin: 0, display: "grid", gap: "0.35rem" }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 38%) 1fr", gap: "0.5rem", alignItems: "start" }}>
            <dt style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.52)", margin: 0 }}>{row.label}</dt>
            <dd style={{ fontFamily: FONT, fontSize: "0.74rem", color: toneColor(row.tone), margin: 0, lineHeight: 1.45 }}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {technicalDetails && (
        <details style={{ marginTop: "0.55rem" }}>
          <summary style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.48)", cursor: "pointer" }}>
            Technical identifiers
          </summary>
          <div style={{ marginTop: "0.35rem", fontFamily: MONO, fontSize: "0.68rem", color: "rgba(255,255,255,0.55)", wordBreak: "break-all" }}>
            {technicalDetails}
          </div>
        </details>
      )}
    </section>
  );
}
