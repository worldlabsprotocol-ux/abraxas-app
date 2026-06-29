"use client";
// FILE: components/terminal/MilestonesSection.tsx
// Protocol progress timeline. Uses shared ROADMAP copy and links to /roadmap.

import Link from "next/link";
import { ROADMAP } from "@/lib/protocolContent";
import { ScrollFade } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function MilestonesSection() {
  return (
    <ScrollFade>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                       alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem",
                       marginBottom: "1rem" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 700,
                         color: "var(--text-primary)" }}>
            Where the protocol stands today
          </div>
          <Link href="/roadmap" style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
            color: "#10B981", textDecoration: "none",
          }}>
            Full roadmap →
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {ROADMAP.map(ms => (
            <div key={ms.phase} style={{ display: "flex", gap: 0 }}>
              <div style={{ width: 2, background: `${ms.color}25`,
                             flexShrink: 0, position: "relative" }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%",
                               background: ms.color,
                               position: "absolute", top: 12, left: -3.5 }} />
              </div>
              <div style={{ paddingLeft: "1.25rem", paddingBottom: "1.25rem", flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                               color: ms.color,
                               marginBottom: "0.5rem", marginTop: "0.125rem" }}>
                  {ms.phase}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {ms.items.map(item => (
                    <div key={item}
                      style={{ padding: "0.3rem 0.7rem", borderRadius: 20,
                                background: `${ms.color}08`,
                                border: `1px solid ${ms.color}20`,
                                fontFamily: FONT, fontSize: "0.72rem",
                                color: "var(--text-secondary)",
                                lineHeight: 1.4 }}>
                      {ms.phase === "Live now" ? "\u2713 " : ""}{item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollFade>
  );
}
