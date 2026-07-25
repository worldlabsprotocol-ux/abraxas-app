"use client";
// FILE: components/home/HomeRegistrySlideshow.tsx
// Compact registry carousel — same assets as Verify, one slide at a time.

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

const SLIDES = registryAssetsForShowcase();

function SlideVisual({ abxId, image, name }: { abxId: string; image: string; name: string }) {
  if (abxId === "ABX-COL-PSA-007") {
    return <CmnRegistryHero alt={name} height={148} />;
  }
  if (abxId === "ABX-CNB-GT-008") {
    return <GoodTroubleRegistryVisual height={148} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        <div>
          <div style={{
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.3rem",
          }}>
            Live proof on-registry
          </div>
          <h2 style={{
            fontFamily: FONT, fontSize: "clamp(1.05rem, 2.5vw, 1.35rem)",
            fontWeight: 800, letterSpacing: "-0.02em",
            color: "var(--text-primary)", margin: 0,
          }}>
            Reference assets in rotation
          </h2>
        </div>
        <Link href="/verify" style={{
          fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700,
          color: ACCENT, textDecoration: "none",
        }}>
          Browse all →
        </Link>
      </div>

      <article style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 34%) minmax(0, 1fr)",
        gap: 0,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        minHeight: 148,
      }}>
        <div style={{ position: "relative", minHeight: 148, background: "#0a0f14" }}>
          <SlideVisual abxId={slide.abxId} image={slide.image} name={slide.name} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to right, transparent 60%, rgba(6,9,11,0.35) 100%)",
          }} />
        </div>

        <div style={{
          padding: "0.85rem 1rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "0.35rem",
          minWidth: 0,
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
            <span style={{
              fontFamily: FONT, fontSize: "0.55rem", fontWeight: 700,
              padding: "0.2rem 0.45rem", borderRadius: 999,
              background: "rgba(16,185,129,0.1)", color: meta.color,
              border: `1px solid ${meta.color}44`,
            }}>
              {meta.label}
            </span>
            {slide.statusBadge && <CapabilityStatusBadge status={slide.statusBadge} size="xs" />}
            <span style={{ fontFamily: MONO, fontSize: "0.52rem", color: ACCENT, fontWeight: 700 }}>
              {slide.abxId}
            </span>
          </div>

          <h3 style={{
            fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
            color: "var(--text-primary)", margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {slide.name}
          </h3>

          <p style={{
            fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)",
            margin: 0, lineHeight: 1.5,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {slide.location}
            {slide.primaryLabel && slide.primaryValue
              ? ` · ${slide.primaryLabel}: ${slide.primaryValue}`
              : ""}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.25rem" }}>
            <Link
              href={`/verify/${encodeURIComponent(slide.abxId)}`}
              style={{
                padding: "0.4rem 0.75rem", borderRadius: 999,
                background: ACCENT, color: "#04130C",
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Verify this asset →
            </Link>
            {slide.href && (
              <Link href={slide.href} style={{
                fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                color: ACCENT, textDecoration: "none", alignSelf: "center",
              }}>
                Details
              </Link>
            )}
          </div>
        </div>
      </article>

      {SLIDES.length > 1 && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: "0.5rem", marginTop: "0.65rem", flexWrap: "wrap",
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
                width: i === index ? 20 : 7,
                height: 7,
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
        </div>
      )}
    </section>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--surface-inset)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: FONT,
  fontSize: "0.75rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
