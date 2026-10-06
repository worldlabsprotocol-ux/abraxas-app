"use client";
// FILE: components/product/EvidenceTimeline.tsx

import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

export interface TimelineEvent {
  id: string;
  label: string;
  timestamp: string | null;
  status?: "complete" | "pending";
}

export function EvidenceTimeline({ events }: { events: TimelineEvent[] }) {
  const visible = events.filter((e) => e.timestamp || e.status === "pending");
  if (visible.length === 0) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", margin: 0 }}>
        Timeline events appear here as measured integration activity occurs.
      </p>
    );
  }

  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.65rem" }}>
      {visible.map((event, index) => (
        <li key={event.id} style={{ display: "grid", gridTemplateColumns: "12px 1fr", gap: "0.75rem" }}>
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                marginTop: 5,
                background: event.timestamp ? "#10B981" : "var(--border-strong)",
              }}
            />
            {index < visible.length - 1 && (
              <span
                style={{
                  position: "absolute",
                  top: 14,
                  width: 1,
                  height: "calc(100% + 0.45rem)",
                  background: "var(--border)",
                }}
              />
            )}
          </div>
          <div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              {event.label}
            </p>
            <p style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
              {event.timestamp ? formatDate(event.timestamp) : "Pending"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}
