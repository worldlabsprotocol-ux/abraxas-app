"use client";
// FILE: components/home/HomeMarketTicker.tsx
// Compact live market strip — RWA/stablecoin headlines without homepage bloat.

import { useEffect, useState } from "react";
import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

interface FeedItem {
  title: string;
  url: string;
  topic: string;
}

export function HomeMarketTicker() {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    fetch("/api/market/intel")
      .then(r => r.json())
      .then(d => setItems((d.items ?? []).slice(0, 4)))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  return (
    <section
      aria-label="Market intelligence"
      style={{
        padding: "0.65rem 0 0.85rem",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.45rem" }}>
        <span className="abx-eyebrow-violet" style={{ margin: 0 }}>Market pulse</span>
        <Link href="/rwa" style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
          RWA desk →
        </Link>
      </div>
      <div style={{ display: "grid", gap: "0.35rem" }}>
        {items.map((item, i) => (
          <a
            key={`${item.url}-${i}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              color: "var(--text-secondary)",
              textDecoration: "none",
              lineHeight: 1.45,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase" }}>
              {item.topic}
            </span>
            <span>{item.title}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
