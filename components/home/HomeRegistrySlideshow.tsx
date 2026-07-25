"use client";
// FILE: components/home/HomeRegistrySlideshow.tsx
// Homepage registry carousel — flagship assets in rotation.

import { useEffect, useState } from "react";
import Link from "next/link";
import { EXPLORE_ASSETS, type ExploreAsset } from "@/lib/data/exploreAssets";
import { GoodTroubleRegistryVisual } from "@/components/registry/GoodTroubleRegistryVisual";
import { CmnPokemonTeaserVisual } from "@/components/registry/CmnPokemonTeaserVisual";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

const SLIDES: ExploreAsset[] = EXPLORE_ASSETS.filter(a =>
  ["genesis-asset", "chickasaw-project", "good-trouble-cannabis", "cmn-pokemon-collection"].includes(a.id),
);

function SlideVisual({ asset }: { asset: ExploreAsset }) {
  if (asset.id === "good-trouble-cannabis") {
    return <GoodTroubleRegistryVisual height={280} />;
  }
  if (asset.id === "cmn-pokemon-collection") {
    return <CmnPokemonTeaserVisual height={280} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.image}
      alt=""
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

export function HomeRegistrySlideshow() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index] ?? SLIDES[0];

  useEffect(() => {
    if (SLIDES.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  if (!slide) return null;

  return (
    <section aria-label="Registry highlights" style={{ marginBottom: "1.25rem" }}>
      <div style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid var(--border-strong)",
        background: "#0a0f14",
        minHeight: 280,
      }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <SlideVisual asset={slide} />
        </div>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(6,9,11,0.92) 0%, rgba(6,9,11,0.2) 50%, transparent 100%)",
        }} />
        <div style={{
          position: "relative", zIndex: 1,
          padding: "1.25rem 1.35rem",
          minHeight: 280,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: ACCENT, marginBottom: 6,
          }}>
            On-registry · {slide.state}
          </div>
          <h3 style={{
            fontFamily: FONT, fontSize: "clamp(1.1rem, 3vw, 1.45rem)",
            fontWeight: 800, color: "#fff", margin: "0 0 0.35rem",
          }}>
            {slide.name}
          </h3>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.72)",
            margin: "0 0 0.85rem", maxWidth: 480, lineHeight: 1.55,
          }}>
            {slide.primaryLabel}: {slide.primaryValue} · {slide.location}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <Link href={slide.href ?? "/verify"} style={{
              padding: "0.5rem 1rem", borderRadius: 999, background: ACCENT, color: "#04130C",
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, textDecoration: "none",
            }}>
              View proof →
            </Link>
            <Link href="/verify" style={{
              fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600,
              color: "rgba(255,255,255,0.75)", textDecoration: "none",
            }}>
              Full registry
            </Link>
          </div>
        </div>
      </div>
      {SLIDES.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: "0.65rem" }}>
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show ${s.name}`}
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 22 : 8,
                height: 8,
                borderRadius: 999,
                border: "none",
                background: i === index ? ACCENT : "var(--border)",
                cursor: "pointer",
                transition: "width 0.2s ease",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
