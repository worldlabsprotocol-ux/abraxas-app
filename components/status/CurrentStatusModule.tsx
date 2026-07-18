"use client";
// FILE: components/status/CurrentStatusModule.tsx

import Link from "next/link";
import {
  CURRENT_STATUS_LIVE,
  CURRENT_STATUS_REMAINING,
  PRODUCTION_STATUS_LEAD,
  PRODUCTION_STATUS_GATES,
  type CurrentStatusItem,
} from "@/lib/currentStatus";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function CurrentStatusModule() {
  return (
    <section style={{
      padding: "1.2rem 1.3rem",
      borderRadius: 16,
      border: "1px solid var(--border-strong)",
      background: "var(--surface-raised)",
      boxShadow: "var(--shadow-card)",
      marginBottom: "1.25rem",
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.1em", color: "#10B981", marginBottom: "0.45rem" }}>
        CURRENT STATUS
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.55, margin: "0 0 0.35rem" }}>
        {PRODUCTION_STATUS_LEAD}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
        {PRODUCTION_STATUS_GATES}
      </p>

      <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.4rem" }}>What's live</div>
      <StatusList items={CURRENT_STATUS_LIVE} />
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, margin: "0.85rem 0 0.4rem" }}>Final gates</div>
      <StatusList items={CURRENT_STATUS_REMAINING} />
    </section>
  );
}

function StatusList({ items }: { items: CurrentStatusItem[] }) {
  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      {items.map(item => {
        const inner = (
          <div style={{
            display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.55rem", alignItems: "start",
            padding: "0.6rem 0.7rem", borderRadius: 10,
            border: item.state === "live" ? "1px solid rgba(16,185,129,0.28)" : "1px solid var(--border)",
            background: item.state === "live" ? "rgba(16,185,129,0.05)" : "var(--surface)",
          }}>
            <span style={{ fontFamily: MONO, fontSize: "0.46rem", fontWeight: 700, color: item.state === "live" ? "#10B981" : "#F59E0B", marginTop: 3 }}>
              {item.state === "live" ? "LIVE" : "NEXT"}
            </span>
            <div>
              <div style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-primary)" }}>{item.label}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{item.detail}</div>
            </div>
          </div>
        );
        return item.href ? <Link key={item.id} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link> : <div key={item.id}>{inner}</div>;
      })}
    </div>
  );
}
