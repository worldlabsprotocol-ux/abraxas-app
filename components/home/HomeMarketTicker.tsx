"use client";
// FILE: components/home/HomeMarketTicker.tsx
// Market pulse — full-width intelligence desk (not a tiny footer ticker).

import { useEffect, useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import {
  ABRAXAS_FONT_DISPLAY,
  ABRAXAS_FONT_MONO,
  ABRAXAS_FONT_SANS,
} from "@/lib/abraxasTypography";

interface FeedItem {
  title: string;
  url: string;
  topic: string;
}

const TOPIC_COLOR: Record<string, string> = {
  rwa: COSMIC_PALETTE.gold,
  stablecoin: COSMIC_PALETTE.cyan,
  defi: COSMIC_PALETTE.violet,
  macro: COSMIC_PALETTE.emerald,
};

function topicColor(topic: string): string {
  const key = topic.toLowerCase();
  return TOPIC_COLOR[key] ?? COSMIC_PALETTE.cyan;
}

export function HomeMarketTicker() {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    fetch("/api/market/intel")
      .then((r) => r.json())
      .then((d) => setItems((d.items ?? []).slice(0, 4)))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  return (
    <section
      id="market-pulse"
      aria-labelledby="market-pulse-heading"
      className="abx-home-section"
      style={{
        paddingTop: "clamp(2.5rem, 6vw, 4rem)",
        paddingBottom: "clamp(2.5rem, 6vw, 4rem)",
        borderTop: "1px solid var(--border-strong)",
      }}
    >
      <div
        className="abx-cosmic-card"
        style={{
          padding: "clamp(1.5rem, 3.5vw, 2.25rem)",
          borderRadius: 24,
          border: `1px solid ${COSMIC_PALETTE.gold}33`,
          background: `linear-gradient(145deg, ${COSMIC_PALETTE.gold}08 0%, rgba(0,0,0,0.35) 55%, ${COSMIC_PALETTE.violet}06 100%)`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "clamp(1.25rem, 3vw, 1.75rem)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: ABRAXAS_FONT_MONO,
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COSMIC_PALETTE.gold,
                marginBottom: "0.5rem",
              }}
            >
              Live intelligence
            </div>
            <h2
              id="market-pulse-heading"
              style={{
                fontFamily: ABRAXAS_FONT_DISPLAY,
                fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Market pulse
            </h2>
            <p
              style={{
                fontFamily: ABRAXAS_FONT_SANS,
                fontSize: "clamp(0.9rem, 2vw, 1.05rem)",
                color: "var(--text-secondary)",
                lineHeight: 1.55,
                margin: "0.65rem 0 0",
                maxWidth: 520,
              }}
            >
              RWA, stablecoin, and macro headlines — context for why verify infrastructure matters now.
            </p>
          </div>
          <Btn href="/rwa" variant="secondary" size="sm">
            RWA desk →
          </Btn>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            gap: "clamp(0.85rem, 2vw, 1.1rem)",
          }}
        >
          {items.map((item, i) => {
            const accent = topicColor(item.topic);
            return (
              <a
                key={`${item.url}-${i}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.65rem",
                  padding: "clamp(1rem, 2.5vw, 1.25rem)",
                  borderRadius: 16,
                  border: `1px solid ${accent}33`,
                  background: "rgba(0,0,0,0.28)",
                  textDecoration: "none",
                  color: "inherit",
                  minHeight: 120,
                  transition: "border-color 0.25s, box-shadow 0.25s",
                }}
              >
                <span
                  style={{
                    fontFamily: ABRAXAS_FONT_MONO,
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: accent,
                    alignSelf: "flex-start",
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: `1px solid ${accent}44`,
                    background: `${accent}12`,
                  }}
                >
                  {item.topic}
                </span>
                <span
                  style={{
                    fontFamily: ABRAXAS_FONT_SANS,
                    fontSize: "clamp(0.88rem, 2vw, 1rem)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    lineHeight: 1.45,
                    flex: 1,
                  }}
                >
                  {item.title}
                </span>
                <span
                  style={{
                    fontFamily: ABRAXAS_FONT_MONO,
                    fontSize: "0.55rem",
                    color: COSMIC_PALETTE.textMuted,
                    letterSpacing: "0.06em",
                  }}
                >
                  External source →
                </span>
              </a>
            );
          })}
        </div>

        <p
          style={{
            fontFamily: ABRAXAS_FONT_SANS,
            fontSize: DEMO_TYPOGRAPHY.caption,
            color: COSMIC_PALETTE.textMuted,
            margin: "1.25rem 0 0",
            textAlign: "center",
          }}
        >
          Headlines refresh from market intel — not investment advice.
        </p>
      </div>
    </section>
  );
}
