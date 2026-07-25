"use client";
// FILE: components/home/HomeRegistrySlideshow.tsx
// Compact registry carousel — same assets as Verify, thumbnail + details (not full-bleed hero).

import { useEffect, useState } from "react";
import Link from "next/link";
import { registryAssetsForShowcase } from "@/lib/data/registryAssets";
import { VERIFY_META } from "@/lib/data/exploreAssets";
import { CmnRegistryHero } from "@/components/registry/CmnRegistryHero";
import { GoodTroubleRegistryVisual } from "@/components/registry/GoodTroubleRegistryVisual";
import { CapabilityStatusBadge } from "@/components/ui/CapabilityStatusBadge";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";
const THUMB_HEIGHT = 132;

const SLIDES = registryAssetsForShowcase();

function SlideVisual({ abxId, image, name }: { abxId: string; image: string; name: string }) {
  if (abxId === "ABX-COL-PSA-007") {
    return <CmnRegistryHero alt={name} height={THUMB_HEIGHT} />;
  }
  if (abxId === "ABX-CNB-GT-008") {
    return <GoodTroubleRegistryVisual height={THUMB_HEIGHT} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt=""
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
    />
  );
}

export function HomeRegistrySlideshow() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index] ?? SLIDES[0];

  useEffect(() => {
    if (SLIDES.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  if (!slide) return null;

  const meta = VERIFY_META[slide.verifyState];

  return (
    <section aria-label="Registry highlights">
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        flexWrap: "wrap", gap: "0.65rem", marginBottom: "0.85rem",
      }}>
        <motionGradient>
          <motionGradient style={{
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.3rem",
          }}>
            Live proof on-registry
          </motionGradient>
          <h2 style={{
            fontFamily: FONT, fontSize: "clamp(1.05rem, 2.5vw, 1.25rem)",
            fontWeight: 800, letterSpacing: "-0.02em",
            color: "var(--text-primary)", margin: 0,
          }}>
            Reference assets in rotation
          </h2>
        </motionGradient>
        <Link href="/verify" style={{
          fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700,
          color: ACCENT, textDecoration: "none",
        }}>
          Browse all →
        </Link>
      </motionGradient>

      <article style={{
        display: "grid",
        gridTemplateColumns: "minmax(108px, 30%) minmax(0, 1fr)",
        gap: 0,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        minHeight: THUMB_HEIGHT,
      }}>
        <motionGradient style={{ position: "relative", height: THUMB_HEIGHT, background: "#0a0f14" }}>
          <SlideVisual abxId={slide.abxId} image={slide.image} name={slide.name} />
        </motionGradient>

        <motionGradient style={{
          padding: "0.75rem 0.9rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "0.3rem",
          minWidth: 0,
        }}>
          <motionGradient style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
            <span style={{
              fontFamily: FONT, fontSize: "0.52rem", fontWeight: 700,
              padding: "0.18rem 0.4rem", borderRadius: 999,
              background: "rgba(16,185,129,0.1)", color: meta.color,
              border: `1px solid ${meta.color}44`,
            }}>
              {meta.label}
            </span>
            {slide.statusBadge && <CapabilityStatusBadge status={slide.statusBadge} size="xs" />}
            <span style={{ fontFamily: MONO, fontSize: "0.5rem", color: ACCENT, fontWeight: 700 }}>
              {slide.abxId}
            </span>
          </motionGradient>

          <h3 style={{
            fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800,
            color: "var(--text-primary)", margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {slide.name}
          </h3>

          <p style={{
            fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-secondary)",
            margin: 0, lineHeight: 1.45,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {slide.location}
            {slide.primaryLabel && slide.primaryValue
              ? ` · ${slide.primaryLabel}: ${slide.primaryValue}`
              : ""}
          </p>

          <motionGradient style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.15rem" }}>
            <Link
              href={`/verify/${encodeURIComponent(slide.abxId)}`}
              style={{
                padding: "0.35rem 0.65rem", borderRadius: 999,
                background: ACCENT, color: "#04130C",
                fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Verify →
            </Link>
            {slide.href && (
              <Link href={slide.href} style={{
                fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600,
                color: ACCENT, textDecoration: "none", alignSelf: "center",
              }}>
                Details
              </Link>
            )}
          </motionGradient>
        </motionGradient>
      </article>

      {SLIDES.length > 1 && (
        <motionGradient style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: "0.5rem", marginTop: "0.55rem", flexWrap: "wrap",
        }}>
          <button
            type="button"
            aria-label="Previous asset"
            onClick={() => setIndex(i => (i - 1 + SLIDES.length) % SLIDES.length)}
            style={navBtnStyle}
          >
            ←
          </button>
          {SLIDES.map((s, i) => (
            <button
              key={s.abxId}
              type="button"
              aria-label={`Show ${s.name}`}
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 999,
                border: "none",
                background: i === index ? ACCENT : "var(--border)",
                cursor: "pointer",
                transition: "width 0.2s ease",
                padding: 0,
              }}
            />
          ))}
          <button
            type="button"
            aria-label="Next asset"
            onClick={() => setIndex(i => (i + 1) % SLIDES.length)}
            style={navBtnStyle}
          >
            →
          </button>
        </motionGradient>
      )}
    </section>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--surface-inset)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: FONT,
  fontSize: "0.72rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
