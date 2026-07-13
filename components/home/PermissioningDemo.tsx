"use client";
// FILE: components/home/PermissioningDemo.tsx
// Visual selective disclosure — show what travels, not jargon.

import { PERMISSIONING_DEMO } from "@/lib/reusableTrust";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function PermissioningDemo({ embedded }: { embedded?: boolean }) {
  return (
    <section id={embedded ? undefined : "permissioning"} aria-labelledby="permissioning-heading" style={{
      padding: embedded ? 0 : "clamp(1.25rem, 3vw, 2rem) 0",
      borderTop: embedded ? "none" : "1px solid var(--border-strong)",
    }}>
      <p style={{
        fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, margin: "0 0 0.45rem",
      }}>
        Your unfair advantage
      </p>
      <h2 id="permissioning-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 0.35rem", maxWidth: 560, lineHeight: 1.15,
      }}>
        Share only what they need
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 480, margin: "0 0 1rem",
      }}>
        When a partner sends a Trust Request, you see exactly what goes out — and what stays private.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
        gap: "0.65rem",
        maxWidth: 560,
      }}>
        <PermissionCard
          title="Shared"
          items={PERMISSIONING_DEMO.shared}
          tone="shared"
        />
        <PermissionCard
          title="Never shared"
          items={PERMISSIONING_DEMO.hidden}
          tone="hidden"
        />
      </div>
    </section>
  );
}

function PermissionCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly { label: string; shared: boolean }[];
  tone: "shared" | "hidden";
}) {
  const shared = tone === "shared";
  return (
    <div style={{
      padding: "1rem", borderRadius: 14,
      border: `1px solid ${shared ? `${ACCENT}44` : "var(--border-strong)"}`,
      background: shared ? `${ACCENT}08` : "var(--surface-raised)",
    }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.72rem", fontWeight: 800,
        color: shared ? ACCENT : "var(--text-muted)",
        marginBottom: "0.65rem", letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        {title}
      </div>
      {items.map(item => (
        <div key={item.label} style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.45rem 0", borderBottom: "1px solid var(--border)",
          fontFamily: FONT, fontSize: "0.78rem",
          color: shared ? "var(--text-primary)" : "var(--text-muted)",
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.72rem", fontWeight: 800,
            background: shared ? `${ACCENT}22` : "var(--surface)",
            color: shared ? ACCENT : "var(--text-muted)",
            border: `1px solid ${shared ? `${ACCENT}44` : "var(--border)"}`,
          }}>
            {shared ? "✓" : "✗"}
          </span>
          {item.label}
        </div>
      ))}
    </div>
  );
}
