// FILE: components/LiveFeed.tsx
"use client";

import Link from "next/link";
import { useActivity, timeAgo, Activity } from "@/lib/activityStore";
import { fmtUSD } from "@/lib/appData";

const TYPE_STYLES: Record<Activity["type"], { dot: string; label: string }> = {
  deposit:  { dot: "var(--green)", label: "DEPOSIT"  },
  mint:     { dot: "var(--gold)",  label: "MINT"     },
  withdraw: { dot: "#a78bfa",      label: "WITHDRAW" },
  agent:    { dot: "var(--muted)", label: "AGENT"    },
  defense:  { dot: "#f0d98a",      label: "DEFENSE"  },
};

interface Props { limit?: number; showHeader?: boolean }

export function LiveFeed({ limit = 12, showHeader = true }: Props) {
  const items = useActivity().slice(0, limit);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
      {showHeader && (
        <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Live Activity</span>
          </div>
          <span style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>{items.length} recent</span>
        </div>
      )}
      <div>
        {items.map((a) => {
          const s = TYPE_STYLES[a.type];
          return (
            <div key={a.id} style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: "0.75rem", alignItems: "center",
              padding: "0.7rem 1.25rem",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.dot }} />
                <span style={{ fontSize: "0.55rem", color: "var(--subtle)", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.message}
                </div>
                <div style={{ fontSize: "0.62rem", color: "var(--subtle)", marginTop: "1px" }}>
                  <Link href={`/vault/${a.vaultId}`} style={{ color: "var(--gold)", textDecoration: "none" }}>{a.vaultName}</Link>
                  {" · "}{a.asset}
                  {a.amount ? ` · ${fmtUSD(a.amount)}` : ""}
                </div>
              </div>
              <span style={{ fontSize: "0.62rem", color: "var(--subtle)", whiteSpace: "nowrap" }}>{timeAgo(a.ts)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}